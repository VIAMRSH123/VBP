"""Validation Assistant — Blueprint Part 7 / Part 2 validation rules."""
import re

from sqlalchemy.orm import Session

from app.config import get_settings
from app.integrations import claude_client
from app.prompts.library import VALIDATION_PROMPT
from app.services.ai.governance import log_decision

settings = get_settings()

PHONE_RE = re.compile(r"^\+?[\d\s\-()]{7,20}$")
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

MANDATORY_FIELDS = ["company", "contact_name", "product"]


def _heuristic_validate(fields: dict) -> dict:
    issues: list[str] = []
    corrections: dict[str, str] = {}

    for field in MANDATORY_FIELDS:
        if not fields.get(field):
            issues.append(f"Missing mandatory field: {field}")

    phone = fields.get("phone") or ""
    email = fields.get("email") or ""
    if not phone and not email:
        issues.append("Missing mandatory field: phone or email")
    if phone and not PHONE_RE.match(phone):
        issues.append(f"Invalid phone format: {phone}")
        corrections["phone"] = "Use international format, e.g. +974XXXXXXXX"
    if email and not EMAIL_RE.match(email):
        issues.append(f"Invalid email format: {email}")
        corrections["email"] = "Use a valid email address, e.g. name@company.com"

    quantity = fields.get("quantity")
    if quantity is not None and (not isinstance(quantity, (int, float)) or quantity <= 0):
        issues.append("Quantity must be greater than 0")

    missing_fields = fields.get("missing_fields") or []
    if missing_fields:
        issues.append(f"Extraction flagged missing fields: {', '.join(missing_fields)}")

    if not issues:
        record_state = "Valid"
    elif any(f"Missing mandatory field: {f}" in issues for f in MANDATORY_FIELDS + ["phone or email"]):
        record_state = "Draft"
    else:
        record_state = "Requires Review"

    return {"record_state": record_state, "issues": issues, "suggested_corrections": corrections}


def validate_lead(db: Session, fields: dict, lead_id: str = "") -> dict:
    used_llm = claude_client.is_available()
    if used_llm:
        try:
            result = claude_client.complete_json(VALIDATION_PROMPT, str(fields))
        except Exception:
            used_llm = False
            result = _heuristic_validate(fields)
    else:
        result = _heuristic_validate(fields)

    log_decision(
        db,
        lead_id=lead_id,
        skill="validation",
        model_version=settings.anthropic_model if used_llm else "heuristic-fallback",
        input_summary=str(fields),
        output=result,
        confidence=1.0 if result["record_state"] == "Valid" else 0.5,
        used_llm=used_llm,
    )
    return result
