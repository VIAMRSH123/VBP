from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import TimestampMixin, new_uuid


class LeadActivity(Base, TimestampMixin):
    __tablename__ = "lead_activity"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    lead_id: Mapped[str] = mapped_column(String(36), index=True)
    activity_type: Mapped[str] = mapped_column(String(80))
    # e.g. LeadCreated, LeadAssigned, StatusChanged, NoteAdded, ReminderSent
    description: Mapped[str] = mapped_column(Text, default="")
    actor: Mapped[str] = mapped_column(String(120), default="system")


class LeadStatusHistory(Base, TimestampMixin):
    __tablename__ = "lead_status_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    lead_id: Mapped[str] = mapped_column(String(36), index=True)
    from_status: Mapped[str] = mapped_column(String(40), default="")
    to_status: Mapped[str] = mapped_column(String(40))
    changed_by: Mapped[str] = mapped_column(String(120), default="system")
    remarks: Mapped[str] = mapped_column(Text, default="")
