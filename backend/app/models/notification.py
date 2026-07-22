from sqlalchemy import String, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import TimestampMixin, new_uuid


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    lead_id: Mapped[str] = mapped_column(String(36), default="", index=True)
    recipient: Mapped[str] = mapped_column(String(200))
    recipient_role: Mapped[str] = mapped_column(String(60), default="")
    channel: Mapped[str] = mapped_column(String(40), default="whatsapp")
    template: Mapped[str] = mapped_column(String(80))
    # LeadAssigned, LeadUpdated, FollowUpDue, NeedsAttention, SLABreach, Won, Lost, DailySummary, WeeklySummary
    message: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(30), default="sent")  # sent, failed, queued
    delivered: Mapped[bool] = mapped_column(default=True)


class ReminderQueue(Base, TimestampMixin):
    __tablename__ = "reminder_queue"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    lead_id: Mapped[str] = mapped_column(String(36), index=True)
    stage: Mapped[int] = mapped_column(Integer, default=1)  # 1=24h, 2=48h, 3=72h escalation
    due_at: Mapped[str] = mapped_column(String(40))
    processed: Mapped[bool] = mapped_column(default=False)
    processed_at: Mapped[str] = mapped_column(String(40), default="")
