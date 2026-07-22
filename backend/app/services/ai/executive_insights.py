"""Executive Insights Generator — Blueprint Part 7."""
from sqlalchemy.orm import Session

from app.config import get_settings
from app.integrations import claude_client
from app.prompts.library import EXECUTIVE_INSIGHTS_PROMPT
from app.services.ai.governance import log_decision

settings = get_settings()


def _heuristic_summary(stats: dict) -> dict:
    total = stats.get("total_leads", 0)
    won = stats.get("won", 0)
    lost = stats.get("lost", 0)
    sla_breaches = stats.get("sla_breaches", 0)
    pipeline_value = stats.get("pipeline_value", 0)
    top_rep = stats.get("top_representative", "N/A")
    conversion = round((won / total) * 100, 1) if total else 0.0

    highlights = [
        f"{total} total leads in the system, {won} won, {lost} lost ({conversion}% conversion).",
        f"Pipeline value stands at ${pipeline_value:,.0f}.",
        f"Top performer: {top_rep}.",
    ]
    risks = []
    if sla_breaches:
        risks.append(f"{sla_breaches} lead(s) are past SLA and require escalation.")
    if not risks:
        risks.append("No SLA breaches detected in the current period.")

    recommendations = ["Review high-risk leads flagged by the reminder engine."]
    if sla_breaches:
        recommendations.append("Prioritize follow-up on escalated leads today.")

    return {
        "summary": (
            f"Pipeline health is {'stable' if sla_breaches == 0 else 'at risk'} with {total} active leads "
            f"and {conversion}% conversion rate this period."
        ),
        "highlights": highlights,
        "risks": risks,
        "recommendations": recommendations,
    }


def generate_executive_insights(db: Session, stats: dict) -> dict:
    used_llm = claude_client.is_available()
    if used_llm:
        try:
            result = claude_client.complete_json(EXECUTIVE_INSIGHTS_PROMPT, str(stats))
        except Exception:
            used_llm = False
            result = _heuristic_summary(stats)
    else:
        result = _heuristic_summary(stats)

    log_decision(
        db,
        skill="executive_insights",
        model_version=settings.anthropic_model if used_llm else "heuristic-fallback",
        input_summary=str(stats),
        output=result,
        confidence=0.75,
        used_llm=used_llm,
    )
    return result
