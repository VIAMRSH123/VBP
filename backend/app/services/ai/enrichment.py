"""Lead Enrichment Service — Blueprint Part 7 / Part 2 Phase 2."""
from sqlalchemy.orm import Session

from app.config import get_settings
from app.integrations import claude_client
from app.prompts.library import LEAD_ENRICHMENT_PROMPT
from app.services.ai.governance import log_decision

settings = get_settings()

# Simple keyword -> (industry, product_category, unit_value) lookup used by the heuristic fallback.
PRODUCT_KNOWLEDGE_BASE = [
    (["tissue", "paper", "napkin"], "FMCG / Hygiene", "Paper Products", 12),
    (["cement", "steel", "rebar", "construction"], "Construction", "Building Materials", 350),
    (["software", "license", "saas", "subscription"], "Technology", "Software", 1200),
    (["furniture", "office chair", "desk"], "Furniture", "Office Furniture", 220),
    (["food", "grocery", "beverage", "rice", "fmcg", "oil", "wheat", "grain", "flour", "sugar"], "Food & Beverage", "Consumables", 25),
    (["chemical", "detergent", "cleaning"], "Industrial", "Chemicals", 80),
]

DEFAULT_INDUSTRY = "General Trading"
DEFAULT_CATEGORY = "Other"
DEFAULT_UNIT_VALUE = 100


def _classify_product(product: str) -> tuple[str, str, float]:
    lowered = (product or "").lower()
    for keywords, industry, category, unit_value in PRODUCT_KNOWLEDGE_BASE:
        if any(k in lowered for k in keywords):
            return industry, category, unit_value
    return DEFAULT_INDUSTRY, DEFAULT_CATEGORY, DEFAULT_UNIT_VALUE


def _heuristic_enrich(fields: dict, is_existing_customer: bool) -> dict:
    industry, category, unit_value = _classify_product(fields.get("product", ""))
    quantity = fields.get("quantity") or 1
    deal_size = round(unit_value * quantity, 2)

    completeness = 1.0 - (len(fields.get("missing_fields") or []) * 0.15)
    completeness = max(0.2, min(1.0, completeness))

    buying_probability = round(min(95, 40 + completeness * 40 + (15 if is_existing_customer else 0)), 1)
    lead_score = round(min(100, buying_probability * 0.6 + min(deal_size / 100, 30) + (10 if is_existing_customer else 0)), 1)
    risk_score = round(max(5, 100 - lead_score), 1)

    if lead_score >= 75:
        priority = "Critical" if deal_size > 5000 else "High"
    elif lead_score >= 50:
        priority = "Medium"
    else:
        priority = "Low"

    return {
        "industry": industry,
        "customer_type": "Existing" if is_existing_customer else "New",
        "product_category": category,
        "deal_size_estimate": deal_size,
        "buying_probability": buying_probability,
        "lead_score": lead_score,
        "risk_score": risk_score,
        "priority": priority,
        "confidence": round(completeness, 2),
        "reasoning": (
            f"Classified '{fields.get('product', '')}' into {category} ({industry}) via keyword match; "
            f"deal size = unit_value(${unit_value}) x quantity({quantity}); "
            f"probability boosted for {'existing' if is_existing_customer else 'new'} customer and field completeness."
        ),
    }


def enrich_lead(db: Session, fields: dict, is_existing_customer: bool = False, lead_id: str = "") -> dict:
    used_llm = claude_client.is_available()
    if used_llm:
        try:
            result = claude_client.complete_json(
                LEAD_ENRICHMENT_PROMPT,
                f"Lead fields: {fields}. Existing customer: {is_existing_customer}.",
            )
        except Exception:
            used_llm = False
            result = _heuristic_enrich(fields, is_existing_customer)
    else:
        result = _heuristic_enrich(fields, is_existing_customer)

    log_decision(
        db,
        lead_id=lead_id,
        skill="enrichment",
        model_version=settings.anthropic_model if used_llm else "heuristic-fallback",
        input_summary=str(fields),
        output=result,
        confidence=result.get("confidence", 0.0),
        used_llm=used_llm,
    )
    return result
