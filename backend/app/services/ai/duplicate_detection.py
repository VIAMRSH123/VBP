"""Duplicate Detection Assistant — Blueprint Part 7."""
from difflib import SequenceMatcher

from sqlalchemy.orm import Session

from app.config import get_settings
from app.integrations import claude_client
from app.models.lead import Lead
from app.prompts.library import DUPLICATE_DETECTION_PROMPT
from app.services.ai.governance import log_decision

settings = get_settings()

PHONE_MATCH_CONFIDENCE = 0.97
COMPANY_FUZZY_THRESHOLD = 0.82


def _normalize_phone(phone: str) -> str:
    return "".join(ch for ch in (phone or "") if ch.isdigit())


def _company_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, (a or "").lower().strip(), (b or "").lower().strip()).ratio()


def _heuristic_detect(db: Session, fields: dict) -> dict:
    candidates = (
        db.query(Lead)
        .filter(Lead.active_flag == True)  # noqa: E712
        .filter(Lead.status.notin_(["Won", "Lost", "Archived"]))
        .limit(500)
        .all()
    )

    incoming_phone = _normalize_phone(fields.get("phone", ""))
    incoming_company = fields.get("company", "") or ""

    best_match = None
    best_confidence = 0.0
    best_reason = ""

    for candidate in candidates:
        if incoming_phone and incoming_phone == _normalize_phone(candidate.phone):
            if PHONE_MATCH_CONFIDENCE > best_confidence:
                best_match, best_confidence = candidate, PHONE_MATCH_CONFIDENCE
                best_reason = "Exact phone number match"
            continue

        similarity = _company_similarity(incoming_company, candidate.company)
        if similarity >= COMPANY_FUZZY_THRESHOLD and similarity > best_confidence:
            best_match, best_confidence = candidate, similarity
            best_reason = f"Fuzzy company name match ({similarity:.0%} similar)"

    if best_match is None:
        return {
            "is_duplicate": False,
            "matched_lead_id": None,
            "confidence": 0.0,
            "merge_recommendation": "keep_separate",
            "reasoning": "No matching active lead found by phone or company similarity.",
        }

    recommendation = "merge" if best_confidence >= 0.9 else "needs_human_review"
    return {
        "is_duplicate": True,
        "matched_lead_id": best_match.lead_number,
        "confidence": round(best_confidence, 2),
        "merge_recommendation": recommendation,
        "reasoning": best_reason,
    }


def detect_duplicate(db: Session, fields: dict) -> dict:
    used_llm = False  # duplicate detection needs DB access; heuristic query is authoritative even with Claude on
    result = _heuristic_detect(db, fields)

    if claude_client.is_available() and result["is_duplicate"] and result["confidence"] < 0.9:
        # Ask Claude to arbitrate ambiguous fuzzy matches only.
        try:
            candidate_summary = f"Incoming: {fields}. Closest match: {result}"
            llm_result = claude_client.complete_json(DUPLICATE_DETECTION_PROMPT, candidate_summary)
            result = {**result, **llm_result}
            used_llm = True
        except Exception:
            pass

    log_decision(
        db,
        skill="duplicate_detection",
        model_version=settings.anthropic_model if used_llm else "heuristic-fallback",
        input_summary=str(fields),
        output=result,
        confidence=result.get("confidence", 0.0),
        used_llm=used_llm,
    )
    return result
