"""Heuristic lead extraction — the message formats documented in docs/SALES_REP_GUIDE.md."""
import pytest

from app.models.ai_decision import AIDecisionLog
from app.services.ai.extraction import _heuristic_extract, extract_lead

GUIDE_EXAMPLE = (
    "Company: Al Fardan Construction\n"
    "Contact: Omar Al Fardan\n"
    "Phone: +97455123456\n"
    "Product: Cement\n"
    "Quantity: 200"
)


def test_guide_example_extracts_every_field():
    result = _heuristic_extract(GUIDE_EXAMPLE)
    assert result["message_type"] == "new_lead"
    assert result["company"] == "Al Fardan Construction"
    assert result["contact_name"] == "Omar Al Fardan"
    assert result["phone"] == "+97455123456"
    assert result["product"] == "Cement"
    assert result["quantity"] == 200
    assert result["missing_fields"] == []
    assert result["confidence"] == 0.9


def test_phone_has_no_trailing_whitespace():
    # The phone is the dedup key; "+97455123456\n" would never match a resend.
    assert _heuristic_extract(GUIDE_EXAMPLE)["phone"] == "+97455123456"


def test_fields_in_any_order():
    msg = "Product: Cement\nPhone: +97455123456\nContact: Omar\nCompany: Al Fardan\nQuantity: 5"
    result = _heuristic_extract(msg)
    assert (result["company"], result["contact_name"], result["product"]) == ("Al Fardan", "Omar", "Cement")
    assert result["phone"] == "+97455123456"
    assert result["quantity"] == 5


def test_extra_prose_around_fields_is_ignored():
    msg = "Hi team, new lead!\nCompany: ABC Trading\nContact: Ahmed Ali\nEmail: a@abc.com\nProduct: Tissue Paper\nThanks."
    result = _heuristic_extract(msg)
    assert result["company"] == "ABC Trading"
    assert result["email"] == "a@abc.com"
    assert result["product"] == "Tissue Paper"


def test_single_line_message_is_split_on_labels():
    msg = "Company: ABC Trading Contact: Ahmed Ali Phone: +97455123456 Product: Tissue Paper Quantity: 300"
    result = _heuristic_extract(msg)
    assert result["company"] == "ABC Trading"
    assert result["contact_name"] == "Ahmed Ali"
    assert result["phone"] == "+97455123456"
    assert result["product"] == "Tissue Paper"
    assert result["quantity"] == 300


def test_labels_are_case_insensitive_but_values_keep_their_case():
    result = _heuristic_extract("COMPANY: Al Fardan\nCONTACT: Omar\nPHONE: +97455123456\nPRODUCT: Cement")
    assert result["company"] == "Al Fardan"
    assert result["product"] == "Cement"


def test_quantity_with_thousands_separator():
    assert _heuristic_extract(GUIDE_EXAMPLE.replace("200", "1,200"))["quantity"] == 1200


def test_quantity_is_optional():
    result = _heuristic_extract(GUIDE_EXAMPLE.replace("\nQuantity: 200", ""))
    assert result["quantity"] is None
    assert result["missing_fields"] == []


def test_email_instead_of_phone_is_not_flagged_missing():
    msg = "Company: ABC Trading\nContact: Ahmed Ali\nEmail: a@abc.com\nProduct: Tissue Paper"
    result = _heuristic_extract(msg)
    assert result["missing_fields"] == []
    assert result["confidence"] == 0.9


def test_incomplete_message_still_yields_partial_record():
    result = _heuristic_extract("Company: Acme\nContact: Jo\nPhone: +97455512345")
    assert result["message_type"] == "new_lead"
    assert result["company"] == "Acme"
    assert result["product"] is None
    assert result["missing_fields"] == ["product"]
    assert result["confidence"] == 0.6


def test_no_phone_and_no_email_flags_phone():
    result = _heuristic_extract("Company: Acme\nContact: Jo\nProduct: Cement")
    assert result["missing_fields"] == ["phone"]


def test_status_update_message():
    msg = "LeadID: L-10005\nStatus: Quote Sent\nRemarks: Follow-up scheduled for Friday"
    result = _heuristic_extract(msg)
    assert result["message_type"] == "status_update"
    assert result["lead_id_reference"] == "L-10005"
    assert result["status"] == "Quote Sent"
    assert result["remarks"] == "Follow-up scheduled for Friday"
    assert result["missing_fields"] == []


def test_status_update_without_remarks():
    result = _heuristic_extract("LeadID: L-10005\nStatus: Won")
    assert result["message_type"] == "status_update"
    assert result["status"] == "Won"
    assert result["remarks"] is None


@pytest.mark.parametrize("message", ["hello there", "", "   "])
def test_unrecognised_message_is_unknown(message):
    result = _heuristic_extract(message)
    assert result["message_type"] == "unknown"
    assert result["confidence"] == 0.2


def test_extract_lead_uses_heuristic_and_logs_decision(db):
    result = extract_lead(db, GUIDE_EXAMPLE, sender_phone="+97455000000")
    assert result["company"] == "Al Fardan Construction"
    decision = db.query(AIDecisionLog).filter(AIDecisionLog.skill == "extraction").one()
    assert decision.model_version == "heuristic-fallback"
