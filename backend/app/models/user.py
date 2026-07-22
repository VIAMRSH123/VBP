from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import TimestampMixin, new_uuid


class User(Base, TimestampMixin):
    """Application user. Roles per Blueprint Part 9 RBAC."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    phone: Mapped[str] = mapped_column(String(40), default="")
    hashed_password: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(40), default="sales_representative")
    # roles: administrator, sales_manager, sales_representative, executive, read_only_auditor
    representative_id: Mapped[str] = mapped_column(String(36), default="")
