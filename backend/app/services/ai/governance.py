import json

from sqlalchemy.orm import Session

from app.models.ai_decision import AIDecisionLog

PROMPT_VERSION = "v1"


def log_decision(
    db: Session,
    *,
    lead_id: str = "",
    skill: str,
    model_version: str,
    input_summary: str,
    output: dict,
    confidence: float,
    used_llm: bool,
) -> AIDecisionLog:
    entry = AIDecisionLog(
        lead_id=lead_id,
        skill=skill,
        prompt_version=PROMPT_VERSION,
        model_version=model_version,
        input_summary=input_summary[:2000],
        output_json=json.dumps(output)[:4000],
        confidence=confidence,
        used_llm=used_llm,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
