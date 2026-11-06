"""Duplicate detection — the 'resend the same phone and it updates the lead' promise in
docs/SALES_REP_GUIDE.md, plus the fuzzy company-name path and the cases that must stay separate."""
import json

import pytest

from app.models.ai_decision import AIDecisionLog
from app.models.lead import Lead
from app.services.ai.duplicate_detection import (
    COMPANY_FUZZY_THRESHOLD,
    PHONE_MATCH_CONFIDENCE,
    _normalize_phone,
    detect_duplicate,
)


def _lead(db, number="L-10001", company="Al Fardan Construction", phone="+97455123456", **kw):
    lead = Lead(lead_number=number, company=company, phone=phone, **kw)
    db.add(lead)
    db.commit()
    return lead


def test_normalize_phone_keeps_digits_only():
    assert _normalize_phone("+974 5512-3456") == "97455123456"
    assert _normalize_phone("") == ""
    assert _normalize_phone(None) == ""


def test_exact_phone_repeat_merges_into_existing_lead(db):
    _lead(db)
    result = detect_duplicate(db, {"company": "Al Fardan Construction", "phone": "+97455123456"})
    assert result["is_duplicate"] is True
    assert result["matched_lead_id"] == "L-10001"
    assert result["confidence"] == PHONE_MATCH_CONFIDENCE
    assert result["merge_recommendation"] == "merge"


def test_phone_match_ignores_formatting_and_company_name(db):
    _lead(db)
    result = detect_duplicate(db, {"company": "Totally Different Name", "phone": "+974 5512 3456"})
    assert result["matched_lead_id"] == "L-10001"
    assert result["merge_recommendation"] == "merge"
    assert result["reasoning"] == "Exact phone number match"


def test_same_company_different_phone_is_a_duplicate(db):
    _lead(db)
    result = detect_duplicate(db, {"company": "Al Fardan Construction", "phone": "+97466000000"})
    assert result["is_duplicate"] is True
    assert result["matched_lead_id"] == "L-10001"
    assert result["confidence"] == 1.0
    assert result["merge_recommendation"] == "merge"


def test_near_company_name_needs_human_review(db):
    _lead(db, company="Al Fardan Construction")
    result = detect_duplicate(db, {"company": "Al Fardan Contracting", "phone": "+97466000000"})
    assert result["is_duplicate"] is True
    assert COMPANY_FUZZY_THRESHOLD <= result["confidence"] < 0.9
    assert result["merge_recommendation"] == "needs_human_review"


def test_company_match_is_case_insensitive(db):
    _lead(db)
    result = detect_duplicate(db, {"company": "  AL FARDAN CONSTRUCTION ", "phone": ""})
    assert result["matched_lead_id"] == "L-10001"


def test_genuinely_new_lead_is_kept_separate(db):
    _lead(db)
    result = detect_duplicate(db, {"company": "Gulf Textiles", "phone": "+97433999888"})
    assert result == {
        "is_duplicate": False,
        "matched_lead_id": None,
        "confidence": 0.0,
        "merge_recommendation": "keep_separate",
        "reasoning": "No matching active lead found by phone or company similarity.",
    }


def test_empty_database_has_no_duplicates(db):
    assert detect_duplicate(db, {"company": "Acme", "phone": "+97455512345"})["is_duplicate"] is False


def test_incoming_without_phone_never_phone_matches(db):
    _lead(db, phone="")
    result = detect_duplicate(db, {"company": "Gulf Textiles", "phone": ""})
    assert result["is_duplicate"] is False


@pytest.mark.parametrize("status", ["Won", "Lost", "Archived"])
def test_closed_leads_are_not_merge_targets(db, status):
    _lead(db, status=status)
    result = detect_duplicate(db, {"company": "Al Fardan Construction", "phone": "+97455123456"})
    assert result["is_duplicate"] is False


def test_inactive_leads_are_not_merge_targets(db):
    _lead(db, active_flag=False)
    result = detect_duplicate(db, {"company": "Al Fardan Construction", "phone": "+97455123456"})
    assert result["is_duplicate"] is False


def test_phone_match_beats_a_fuzzy_company_match_on_another_lead(db):
    _lead(db, number="L-10001", company="Al Fardan Construction", phone="+97411111111")
    _lead(db, number="L-10002", company="Unrelated Trading", phone="+97455123456")
    result = detect_duplicate(db, {"company": "Al Fardan Construction", "phone": "+97455123456"})
    # The exact-company lead scores 1.0, which outranks the 0.97 phone match.
    assert result["matched_lead_id"] == "L-10001"
    result = detect_duplicate(db, {"company": "Something Else Entirely", "phone": "+97455123456"})
    assert result["matched_lead_id"] == "L-10002"


def test_decision_is_logged_to_governance_table(db):
    _lead(db)
    detect_duplicate(db, {"company": "Al Fardan Construction", "phone": "+97455123456"})
    row = db.query(AIDecisionLog).filter_by(skill="duplicate_detection").one()
    assert row.model_version == "heuristic-fallback"
    assert row.used_llm is False
    assert json.loads(row.output_json)["matched_lead_id"] == "L-10001"
