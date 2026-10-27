"""Heuristic lead validation — the mandatory-field rules documented in docs/SALES_REP_GUIDE.md."""
import json

import pytest

from app.models.ai_decision import AIDecisionLog
from app.services.ai.validation import _heuristic_validate, validate_lead, validate_sap_record

VALID = {
    "company": "Al Fardan Construction",
    "contact_name": "Omar Al Fardan",
    "phone": "+97455123456",
    "product": "Cement",
    "quantity": 200,
}


def _with(**changes):
    return {**VALID, **changes}


def test_complete_record_is_valid():
    result = _heuristic_validate(VALID)
    assert result == {"record_state": "Valid", "issues": [], "suggested_corrections": {}}


@pytest.mark.parametrize("field", ["company", "contact_name", "product"])
@pytest.mark.parametrize("empty", [None, ""])
def test_missing_mandatory_field_makes_a_draft(field, empty):
    result = _heuristic_validate(_with(**{field: empty}))
    assert result["record_state"] == "Draft"
    assert f"Missing mandatory field: {field}" in result["issues"]


def test_phone_or_email_is_required():
    result = _heuristic_validate(_with(phone=None))
    assert result["record_state"] == "Draft"
    assert "Missing mandatory field: phone or email" in result["issues"]


def test_email_alone_satisfies_the_contact_rule():
    result = _heuristic_validate(_with(phone=None, email="omar@alfardan.qa"))
    assert result["record_state"] == "Valid"


def test_quantity_is_optional():
    assert _heuristic_validate(_with(quantity=None))["record_state"] == "Valid"


@pytest.mark.parametrize("phone", ["+974 5512 3456", "(974) 55-123-456", "05512345"])
def test_accepted_phone_formats(phone):
    assert _heuristic_validate(_with(phone=phone))["record_state"] == "Valid"


@pytest.mark.parametrize("phone", ["12345", "call me", "+974555123456789012345"])
def test_bad_phone_requires_review_with_a_correction(phone):
    result = _heuristic_validate(_with(phone=phone))
    assert result["record_state"] == "Requires Review"
    assert f"Invalid phone format: {phone}" in result["issues"]
    assert "international format" in result["suggested_corrections"]["phone"]


@pytest.mark.parametrize("email", ["not-an-email", "a@b", "two words@x.com"])
def test_bad_email_requires_review_with_a_correction(email):
    result = _heuristic_validate(_with(email=email))
    assert result["record_state"] == "Requires Review"
    assert f"Invalid email format: {email}" in result["issues"]
    assert "email" in result["suggested_corrections"]


@pytest.mark.parametrize("quantity", [0, -5, "ten"])
def test_quantity_must_be_a_positive_number(quantity):
    result = _heuristic_validate(_with(quantity=quantity))
    assert result["record_state"] == "Requires Review"
    assert "Quantity must be greater than 0" in result["issues"]


def test_fractional_quantity_is_accepted():
    assert _heuristic_validate(_with(quantity=2.5))["record_state"] == "Valid"


def test_extraction_flagged_fields_alone_require_review():
    result = _heuristic_validate(_with(missing_fields=["quantity"]))
    assert result["record_state"] == "Requires Review"
    assert "Extraction flagged missing fields: quantity" in result["issues"]


def test_missing_mandatory_field_outranks_other_issues():
    # An incomplete record is a Draft even when it also carries a format problem.
    result = _heuristic_validate(_with(product=None, phone="12345"))
    assert result["record_state"] == "Draft"
    assert len(result["issues"]) == 2


def test_nothing_extracted_reports_every_mandatory_gap():
    result = _heuristic_validate({})
    assert result["record_state"] == "Draft"
    assert result["issues"] == [
        "Missing mandatory field: company",
        "Missing mandatory field: contact_name",
        "Missing mandatory field: product",
        "Missing mandatory field: phone or email",
    ]


def test_validate_lead_uses_heuristics_and_logs_the_decision(db):
    result = validate_lead(db, _with(product=None), lead_id="L-10001")
    assert result["record_state"] == "Draft"

    entry = db.query(AIDecisionLog).one()
    assert (entry.skill, entry.lead_id, entry.used_llm) == ("validation", "L-10001", False)
    assert entry.model_version == "heuristic-fallback"
    assert entry.confidence == 0.5
    assert json.loads(entry.output_json)["record_state"] == "Draft"


def test_validate_lead_logs_full_confidence_for_a_valid_record(db):
    validate_lead(db, VALID)
    assert db.query(AIDecisionLog).one().confidence == 1.0


class TestSapValidation:
    def test_complete_record_is_valid(self):
        assert validate_sap_record(VALID)["record_state"] == "Valid"

    def test_only_a_missing_company_makes_a_draft(self):
        result = validate_sap_record(_with(company=None))
        assert result["record_state"] == "Draft"
        assert "Missing mandatory field: company" in result["issues"]

    @pytest.mark.parametrize("field", ["contact_name", "product"])
    def test_other_gaps_require_review(self, field):
        result = validate_sap_record(_with(**{field: None}))
        assert result["record_state"] == "Requires Review"
        assert f"Missing field in SAP: {field}" in result["issues"]

    def test_missing_phone_and_email_requires_review(self):
        result = validate_sap_record(_with(phone=None))
        assert result["record_state"] == "Requires Review"
        assert "Missing field in SAP: phone or email" in result["issues"]

    def test_bad_phone_requires_review(self):
        assert validate_sap_record(_with(phone="abc"))["record_state"] == "Requires Review"

    def test_writes_no_decision_log(self, db):
        validate_sap_record(VALID)
        assert db.query(AIDecisionLog).count() == 0
