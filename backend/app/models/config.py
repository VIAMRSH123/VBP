from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import TimestampMixin, new_uuid


class Configuration(Base, TimestampMixin):
    """Key/value configuration table: reminder intervals, assignment rules, AI prompt overrides, etc."""

    __tablename__ = "configuration"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    key: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    value: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(80), default="general")
    description: Mapped[str] = mapped_column(Text, default="")
