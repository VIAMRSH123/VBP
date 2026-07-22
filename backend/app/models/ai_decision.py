from sqlalchemy import String, Text, Float, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import TimestampMixin, new_uuid


class AIDecisionLog(Base, TimestampMixin):
    """AI Governance log per Blueprint Part 7: every AI decision, prompt/model version,
    confidence score and any human override."""

    __tablename__ = "ai_decision_log"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    lead_id: Mapped[str] = mapped_column(String(36), default="", index=True)
    skill: Mapped[str] = mapped_column(String(80))
    # extraction, validation, duplicate_detection, enrichment, representative_matching,
    # next_best_action, executive_insights
    prompt_version: Mapped[str] = mapped_column(String(20), default="v1")
    model_version: Mapped[str] = mapped_column(String(80), default="heuristic-fallback")
    input_summary: Mapped[str] = mapped_column(Text, default="")
    output_json: Mapped[str] = mapped_column(Text, default="")
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    used_llm: Mapped[bool] = mapped_column(Boolean, default=False)
    human_override: Mapped[bool] = mapped_column(Boolean, default=False)
    override_details: Mapped[str] = mapped_column(Text, default="")
