"""Next Best Action Service — Blueprint Part 7."""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.config import get_settings
from app.integrations import claude_client
from app.prompts.library import NEXT_BEST_ACTION_PROMPT
from app.services.ai.governance import log_decision

settings = get_settings()

STATUS_ACTIONS = {
    "New": ("Request missing information", "Medium"),
    "Assigned": ("Schedule follow-up", "Medium"),
    "Contacted": ("Schedule follow-up", "Medium"),
    "Qualified": ("Send quotation", "High"),
    "Quote Requested": ("Send quotation", "High"),
    "Quote Sent": ("Schedule follow-up", "Medium"),
    "Negotiation": ("Schedule follow-up", "High"),
    "Awaiting Customer": ("Schedule follow-up", "Low"),
    "Won": ("No action needed", "Low"),
    "Lost": ("No action needed", "Low"),
    "Archived": ("No action needed", "Low"),
}


def _heuristic_next_action(status: str, hours_since_activity: float, risk_score: float) -> dict:
    action, urgency = STATUS_ACTIONS.get(status, ("Schedule follow-up", "Medium"))

    if hours_since_activity >= 72 and status not in ("Won", "Lost", "Archived"):
        return {
            "action": "Escalate",
            "reasoning": f"No activity for {hours_since_activity:.0f}h (>=72h SLA breach) while status={status}.",
            "urgency": "High",
        }
    if hours_since_activity >= 24 and risk_score >= 60:
        return {
            "action": "Escalate",
            "reasoning": f"High risk score ({risk_score}) with {hours_since_activity:.0f}h of inactivity.",
            "urgency": "High",
        }

    return {
        "action": action,
        "reasoning": f"Default playbook action for status '{status}'.",
        "urgency": urgency,
    }


def recommend_next_action(
    db: Session, status: str, last_activity_at: datetime | None, risk_score: float = 0.0, lead_id: str = ""
) -> dict:
    hours_since_activity = 0.0
    if last_activity_at is not None:
        now = datetime.now(timezone.utc)
        if last_activity_at.tzinfo is None:
            last_activity_at = last_activity_at.replace(tzinfo=timezone.utc)
        hours_since_activity = (now - last_activity_at).total_seconds() / 3600

    used_llm = claude_client.is_available()
    if used_llm:
        try:
            result = claude_client.complete_json(
                NEXT_BEST_ACTION_PROMPT,
                f"status={status}, hours_since_activity={hours_since_activity:.1f}, risk_score={risk_score}",
            )
        except Exception:
            used_llm = False
            result = _heuristic_next_action(status, hours_since_activity, risk_score)
    else:
        result = _heuristic_next_action(status, hours_since_activity, risk_score)

    log_decision(
        db,
        lead_id=lead_id,
        skill="next_best_action",
        model_version=settings.anthropic_model if used_llm else "heuristic-fallback",
        input_summary=f"status={status}, hours_since_activity={hours_since_activity:.1f}",
        output=result,
        confidence=0.8,
        used_llm=used_llm,
    )
    return result
