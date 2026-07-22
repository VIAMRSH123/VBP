"""Lead Extraction Service — Blueprint Part 7.

Extracts structured lead fields from a raw WhatsApp message. Uses Claude when
ANTHROPIC_API_KEY is configured; otherwise falls back to a deterministic
key:value / free-text parser tuned to the sample message formats in the
blueprint Appendix C.
"""
import re

from sqlalchemy.orm import Session

from app.config import get_settings
from app.integrations import claude_client
from app.prompts.library import LEAD_EXTRACTION_PROMPT
from app.services.ai.governance import log_decision

settings = get_settings()

_FIELD_PATTERNS = {
    "company": r"company\s*:\s*(.+?)(?=\n|contact|phone|email|product|quantity|$)",
    "contact_name": r"contact\s*:\s*(.+?)(?=\n|phone|email|product|quantity|$)",
    "phone": r"phone\s*:\s*([+\d][\d\s\-]{5,})",
    "email": r"email\s*:\s*([^\s]+@[^\s]+)",
    "product": r"product\s*:\s*(.+?)(?=\n|quantity|status|remarks|$)",
    "quantity": r"quantity\s*:\s*(\d+)",
    "status": r"status\s*:\s*(.+?)(?=\n|remarks|$)",
    "remarks": r"remarks\s*:\s*(.+?)$",
    "lead_id_reference": r"lead\s*id\s*:\s*(L-\d+)",
}

REQUIRED_FOR_NEW_LEAD = ["company", "contact_name", "phone", "product"]


def _heuristic_extract(message: str) -> dict:
    text = message.strip()
    lowered = text.lower()
    fields: dict = {}
    for key, pattern in _FIELD_PATTERNS.items():
        match = re.search(pattern, lowered, re.IGNORECASE | re.MULTILINE)
        if match:
            raw_value = text[match.start(1) : match.end(1)].strip(" .")
            fields[key] = raw_value

    if "quantity" in fields:
        try:
            fields["quantity"] = int(re.sub(r"\D", "", fields["quantity"]) or 0)
        except ValueError:
            fields["quantity"] = None

    is_status_update = "status update" in lowered or "lead id" in lowered or fields.get("lead_id_reference")
    message_type = "status_update" if is_status_update else ("new_lead" if fields.get("company") else "unknown")

    missing = []
    if message_type == "new_lead":
        missing = [f for f in REQUIRED_FOR_NEW_LEAD if not fields.get(f)]

    confidence = 0.9 if message_type != "unknown" and not missing else (0.6 if fields else 0.2)

    return {
        "message_type": message_type,
        "lead_id_reference": fields.get("lead_id_reference"),
        "company": fields.get("company"),
        "contact_name": fields.get("contact_name"),
        "phone": fields.get("phone"),
        "email": fields.get("email"),
        "product": fields.get("product"),
        "quantity": fields.get("quantity"),
        "status": fields.get("status"),
        "remarks": fields.get("remarks"),
        "missing_fields": missing,
        "confidence": confidence,
    }


def extract_lead(db: Session, raw_message: str, sender_phone: str = "") -> dict:
    used_llm = claude_client.is_available()
    if used_llm:
        try:
            result = claude_client.complete_json(
                LEAD_EXTRACTION_PROMPT,
                f"WhatsApp message from {sender_phone}:\n\n{raw_message}",
            )
        except Exception:
            used_llm = False
            result = _heuristic_extract(raw_message)
    else:
        result = _heuristic_extract(raw_message)

    log_decision(
        db,
        skill="extraction",
        model_version=settings.anthropic_model if used_llm else "heuristic-fallback",
        input_summary=raw_message,
        output=result,
        confidence=result.get("confidence", 0.0),
        used_llm=used_llm,
    )
    return result
