"""Test harness: an isolated in-memory SQLite database and no real integrations.

Environment variables are set *before* any `app` import because `app.db` builds its engine and
`get_settings()` caches at import time. Env vars win over backend/.env, so a developer's real
credentials can never leak into a test run.
"""
import os

os.environ.update(
    {
        "DATABASE_URL": "sqlite://",
        "SAP_MODE": "mock",
        "SAP_BASE_URL": "",
        "SAP_COMPANY_DB": "",
        "SAP_USERNAME": "",
        "SAP_PASSWORD": "",
        "WASENDER_API_KEY": "",
        "ANTHROPIC_API_KEY": "",
        "QUIP_API_TOKEN": "",
    }
)

import pytest  # noqa: E402

from app.db import Base, SessionLocal, engine, init_db  # noqa: E402


@pytest.fixture()
def db():
    """A fresh schema per test, rolled back and dropped afterwards."""
    init_db()
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db):
    """FastAPI test client. Built without a `with` block so the lifespan (scheduler) is not started."""
    from fastapi.testclient import TestClient

    from app.main import app

    return TestClient(app)


@pytest.fixture()
def auth(db):
    """`auth("administrator")` -> Authorization headers for a freshly created user with that role."""
    from app.auth.security import create_access_token
    from app.models.user import User

    def make(role: str) -> dict[str, str]:
        user = db.query(User).filter(User.email == f"{role}@test.local").first()
        if user is None:
            user = User(name=role.title(), email=f"{role}@test.local", hashed_password="x", role=role)
            db.add(user)
            db.commit()
        return {"Authorization": f"Bearer {create_access_token(subject=user.id, role=role)}"}

    return make


@pytest.fixture()
def mock_sap():
    """A fresh deterministic mock SAP server (v1) as of today, so date filters line up with the run."""
    from datetime import date

    from app.integrations import sap_mock

    return sap_mock.reset_mock_server(as_of=date.today())
