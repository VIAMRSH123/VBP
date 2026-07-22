from sqlalchemy import String, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import TimestampMixin, new_uuid


class PipelineExecution(Base, TimestampMixin):
    """One row per orchestrator run, per Blueprint Part 6 Pipeline Monitoring Dashboard."""

    __tablename__ = "pipeline_executions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    workflow_name: Mapped[str] = mapped_column(String(120))
    lead_id: Mapped[str] = mapped_column(String(36), default="", index=True)
    trigger_source: Mapped[str] = mapped_column(String(80), default="")
    current_stage: Mapped[str] = mapped_column(String(80), default="")
    status: Mapped[str] = mapped_column(String(30), default="running")  # running, success, failed, dead_letter
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    error_details: Mapped[str] = mapped_column(Text, default="")
    started_at: Mapped[str] = mapped_column(String(40), default="")
    ended_at: Mapped[str] = mapped_column(String(40), default="")


class PipelineEvent(Base, TimestampMixin):
    """Append-only event bus log: LeadCreated, LeadAssigned, ReminderTriggered, etc."""

    __tablename__ = "pipeline_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    execution_id: Mapped[str] = mapped_column(String(36), index=True)
    event_type: Mapped[str] = mapped_column(String(80))
    stage: Mapped[str] = mapped_column(String(80), default="")
    payload: Mapped[str] = mapped_column(Text, default="")
    success: Mapped[bool] = mapped_column(default=True)


class DeadLetterEntry(Base, TimestampMixin):
    __tablename__ = "dead_letter_queue"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    execution_id: Mapped[str] = mapped_column(String(36), index=True)
    workflow_name: Mapped[str] = mapped_column(String(120))
    stage: Mapped[str] = mapped_column(String(80), default="")
    payload: Mapped[str] = mapped_column(Text, default="")
    error_details: Mapped[str] = mapped_column(Text, default="")
    resolved: Mapped[bool] = mapped_column(default=False)
