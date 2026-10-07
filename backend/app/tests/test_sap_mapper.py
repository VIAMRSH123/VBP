from datetime import date

import pytest

from app.services import sap_mapper as m

TODAY = date(2026, 10, 7)


def quote(entry=1, status="bost_Open", due="2026-11-01", cancelled=False, total=105.0):
    return {"doc_entry": entry, "doc_num": entry + 1000, "doc_status": status, "doc_due_date": due, "cancelled": cancelled,
            "doc_total": total, "vat_sum": 5.0, "top_item_name": "Toor Dal 1kg", "top_item_group": "Pulses",
            "quantity_total": 200.0, "currency": "INR"}


def derive(opp_overrides=None, *, quotations=(), orders=(), stage="Lead", percent=10.0, stage_map=None, order_means_won=True):
    opp = {"SequentialNo": 1, "Status": "sos_Open", "CurrentStageNo": 1, "SalesPerson": -1, "CardCode": "C1", "MaxLocalTotal": 1000.0}
    opp.update(opp_overrides or {})
    docs = m.SapLinkedDocs(quotations=list(quotations), orders=list(orders))
    return m.derive_status(opp, docs, stage_name=stage, percent=percent, stage_map=stage_map or {}, today=TODAY, order_means_won=order_means_won)


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("9848011101", "+919848011101"),
        ("+97455123456", "+97455123456"),
        ("0097455123456", "+97455123456"),
        ("040-23551234", "+914023551234"),
        ("919848011101", "+919848011101"),
        ("", ""),
        (None, ""),
        ("n/a", ""),
    ],
)
def test_normalize_phone(raw, expected):
    assert m.normalize_phone(raw, "91") == expected


def test_sap_timestamp_combines_date_and_time_as_utc():
    assert m.sap_timestamp("2026-10-07", "14:30:00") == "2026-10-07T14:30:00+00:00"
    assert m.sap_timestamp("2026-10-07", "14:30") == "2026-10-07T14:30:00+00:00"
    assert m.sap_timestamp("2026-10-07") == "2026-10-07T00:00:00+00:00"
    assert m.sap_timestamp(None) == ""


def test_content_hash_is_stable_regardless_of_key_order():
    assert m.content_hash({"a": 1, "b": [1, 2]}) == m.content_hash({"b": [1, 2], "a": 1})
    assert m.content_hash({"a": 1}) != m.content_hash({"a": 2})


def test_sold_and_missed_win_over_everything():
    assert derive({"Status": "sos_Sold"}) == "Won"
    assert derive({"Status": "sos_Missed"}, quotations=[quote()]) == "Lost"


def test_unknown_closed_status_is_archived():
    assert derive({"Status": "sos_SomethingElse"}) == "Archived"


def test_live_order_means_won_but_cancelled_order_does_not():
    assert derive(orders=[quote()]) == "Won"
    assert derive(orders=[quote(cancelled=True)]) == "New"
    assert derive(orders=[quote()], order_means_won=False) == "New"


def test_open_quotation_maps_by_percent_and_due_date():
    assert derive(quotations=[quote()], percent=25) == "Quote Sent"
    assert derive(quotations=[quote()], percent=50) == "Negotiation"
    assert derive(quotations=[quote(due="2026-10-01")], percent=25) == "Awaiting Customer"
    assert derive(quotations=[quote(status="bost_Close")], percent=25) == "New"
    assert derive(quotations=[quote(cancelled=True)], percent=25) == "New"


def test_stage_keywords_and_percent_buckets_for_open_opportunities_without_documents():
    assert derive(stage="Qualification", percent=25) == "Qualified"
    assert derive(stage="Proposal", percent=50) == "Quote Requested"
    assert derive(stage="Negotiation", percent=75) == "Negotiation"
    assert derive(stage="Site visit", percent=20) == "Contacted"
    assert derive(stage="Stage X", percent=5) == "New"
    assert derive(stage="Stage X", percent=40) == "Qualified"
    assert derive(stage="Stage X", percent=90) == "Negotiation"


def test_configured_stage_map_overrides_keywords_by_name_or_number():
    assert derive(stage="Proposal", percent=50, stage_map=m.parse_stage_map('{"Proposal": "Contacted"}')) == "Contacted"
    assert derive({"CurrentStageNo": 3}, stage="Whatever", percent=50, stage_map=m.parse_stage_map('{"3": "Qualified"}')) == "Qualified"
    assert m.parse_stage_map('{"Proposal": "Not A Status"}') == {}
    assert m.parse_stage_map("not json") == {}


def test_new_opportunity_with_a_salesperson_is_assigned():
    assert derive({"SalesPerson": 3}, stage="Lead", percent=10) == "Assigned"
    assert derive({"SalesPerson": -1}, stage="Lead", percent=10) == "New"


PARTNER = {"company": "Hotel Minerva", "contact_name": "Venkat", "phone": "+919848011101", "email": "a@b.c", "currency": "INR"}


def _record(opportunity, *, partner=None, quotations=(), orders=(), **overrides):
    options = dict(stage_name="Lead", stage_percentages={}, stage_map={}, territory_name="Hyderabad", industry_name="Retail",
                   is_existing_customer=False, today=TODAY)
    options.update(overrides)
    docs = m.SapLinkedDocs(quotations=list(quotations), orders=list(orders))
    return m.derive_opportunity_record(opportunity, PARTNER if partner is None else partner, docs, **options)


def test_won_deal_value_is_order_net_of_vat_and_open_value_is_max_local_total():
    won = _record({"SequentialNo": 7, "Status": "sos_Sold", "CardCode": "C1", "MaxLocalTotal": 5000.0}, orders=[quote(total=1050.0)])
    assert won.status == "Won" and won.deal_value == 1045.0  # 1050 - 5 VAT
    open_ = _record({"SequentialNo": 8, "Status": "sos_Open", "CardCode": "C1", "MaxLocalTotal": 5000.0})
    assert open_.deal_value == 5000.0


def test_record_carries_partner_details_territory_and_external_id():
    record = _record({"SequentialNo": 9, "Status": "sos_Open", "CardCode": "C1", "SalesPerson": 4, "StartDate": "2026-09-01",
                      "UpdateDate": "2026-10-06", "UpdateTime": "10:00:00", "ClosingPercentage": 25.0, "CurrentStageNo": 2}, stage_name="Qualification")
    assert record.external_id == "opp:9" and record.card_code == "C1" and record.sales_person_code == 4
    assert record.fields["company"] == "Hotel Minerva" and record.fields["phone"] == "+919848011101"
    assert record.territory == "Hyderabad" and record.industry == "Retail"
    assert record.buying_probability == 25.0 and record.created_at == date(2026, 9, 1)
    assert record.last_activity_at == "2026-10-06T10:00:00+00:00"
    assert record.fields["missing_fields"] == ["product"]  # no linked document -> product falls back to opportunity name only if present


def test_missing_contact_details_are_reported_not_invented():
    record = m.derive_opportunity_record({"SequentialNo": 1, "Status": "sos_Open", "CardCode": "C9", "CustomerName": "Mystery Co", "OpportunityName": "Enquiry"},
                                          {}, m.SapLinkedDocs(), stage_name="Lead", stage_percentages={}, stage_map={}, territory_name="",
                                          industry_name="", is_existing_customer=False, today=TODAY)
    assert record.fields["company"] == "Mystery Co"
    assert set(record.fields["missing_fields"]) == {"contact_name", "phone"}


def test_record_hash_changes_when_the_derived_record_changes():
    a = _record({"SequentialNo": 1, "Status": "sos_Open", "CardCode": "C1"})
    b = _record({"SequentialNo": 1, "Status": "sos_Open", "CardCode": "C1"})
    c = _record({"SequentialNo": 1, "Status": "sos_Open", "CardCode": "C1"}, territory_name="Warangal")
    assert a.record_hash == b.record_hash != c.record_hash


def test_partner_lead_record_uses_bp_key_and_assigns_when_salesperson_set():
    row = {"CardCode": "L2001", "CardName": "Charminar Sweets", "SalesPersonCode": 2, "UpdateDate": "2026-10-01"}
    partner = {"company": "Charminar Sweets", "contact_name": "", "phone": "+919000000000", "email": ""}
    record = m.derive_partner_lead_record(row, partner, territory_name="Hyderabad", industry_name="Retail")
    assert record.external_id == "bp:L2001" and record.status == "Assigned" and record.sales_person_code == 2
    assert "contact_name" in record.fields["missing_fields"]
    unassigned = m.derive_partner_lead_record({**row, "SalesPersonCode": -1}, partner, territory_name="", industry_name="")
    assert unassigned.status == "New" and unassigned.sales_person_code is None


def test_linked_document_numbers_split_quotes_and_orders():
    opp = {"SalesOpportunitiesLines": [
        {"DocumentType": "sodt_Quotation", "DocumentNumber": 1001},
        {"DocumentType": "sodt_Order", "DocumentNumber": 5001},
        {"DocumentType": None, "DocumentNumber": None},
        {"DocumentType": "sodt_Quotation", "DocumentNumber": 0},
    ]}
    assert m.linked_document_numbers(opp) == ([1001], [5001])
