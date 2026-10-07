import logging

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import StaticPool

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger("db")

is_sqlite = settings.database_url.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}
engine_kwargs: dict = {}
if settings.database_url in ("sqlite://", "sqlite:///:memory:"):
    # One shared connection so an in-memory database (used by the tests) survives across sessions.
    engine_kwargs["poolclass"] = StaticPool
engine = create_engine(settings.database_url, connect_args=connect_args, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _render_default(clause) -> str:
    arg = clause.arg
    if isinstance(arg, str):
        return "'" + arg.replace("'", "''") + "'"
    return getattr(arg, "text", str(arg))


def _evolve_schema(bind) -> None:
    """Adds columns/indexes declared on the models but missing from an existing database.

    `create_all` only creates whole missing tables, and the project has no Alembic, so models that
    gained columns would otherwise fail against a database created earlier. Only additive changes
    are made, and every new column on an existing table must carry a server default.
    """
    inspector = inspect(bind)
    existing_tables = set(inspector.get_table_names())

    with bind.begin() as conn:
        for table in Base.metadata.sorted_tables:
            if table.name not in existing_tables:
                continue
            present = {c["name"] for c in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in present:
                    continue
                if not column.nullable and column.server_default is None:
                    raise RuntimeError(
                        f"Cannot add {table.name}.{column.name}: a new NOT NULL column needs a server_default"
                    )
                ddl = f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" {column.type.compile(dialect=bind.dialect)}'
                if column.server_default is not None:
                    ddl += f" DEFAULT {_render_default(column.server_default)}"
                if not column.nullable:
                    ddl += " NOT NULL"
                conn.exec_driver_sql(ddl)
                logger.info("Schema evolution: added %s.%s", table.name, column.name)

    for table in Base.metadata.sorted_tables:
        for index in table.indexes:
            index.create(bind=bind, checkfirst=True)


def init_db() -> None:
    from app.models import (  # noqa: F401
        user,
        lead,
        representative,
        activity,
        notification,
        audit,
        config,
        dashboard,
        pipeline,
        bronze,
        ai_decision,
        sap,
        inventory,
    )

    Base.metadata.create_all(bind=engine)
    _evolve_schema(engine)
