"""Lead status engine — STATUS_TRANSITIONS enforcement, the history/activity trail, and the
SAP-sourced path that deliberately bypasses the transition rules."""
import pytest

from app.models.activity import LeadActivity, LeadStatusHistory
from app.models.lead import Lead
from app.services.lead_service import (
    STATUS_TRANSITIONS,
    change_status,
    next_lead_number,
    set_status_from_source,
)

ALL_STATUSES = list(STATUS_TRANSITIONS)
LEGAL = [(src, dst) for src, dsts in STATUS_TRANSITIONS.items() for dst in dsts]
ILLEGAL = [
    (src, dst)
    for src in ALL_STATUSES
    for dst in ALL_STATUSES
    if dst != src and dst not in STATUS_TRANSITIONS[src]
]


def _lead(db, status="New", number="L-10001"):
    lead = Lead(lead_number=number, company="Acme Co", status=status)
    db.add(lead)
    db.commit()
    return lead


def _history(db, lead):
    return db.query(LeadStatusHistory).filter(LeadStatusHistory.lead_id == lead.id).all()


def test_transition_table_is_closed():
    """Every target is itself a known status, so no transition leads off the map."""
    for dsts in STATUS_TRANSITIONS.values():
        assert set(dsts) <= set(ALL_STATUSES)


@pytest.mark.parametrize("src,dst", LEGAL)
def test_legal_transition_is_accepted_and_recorded(db, src, dst):
    lead = _lead(db, status=src)
    assert change_status(db, lead, dst, actor="rep1", remarks="because") is True
    assert lead.status == dst
    rows = _history(db, lead)
    assert len(rows) == 1
    assert (rows[0].from_status, rows[0].to_status) == (src, dst)
    assert rows[0].changed_by == "rep1"
    assert rows[0].remarks == "because"


@pytest.mark.parametrize("src,dst", ILLEGAL)
def test_illegal_transition_is_rejected_without_side_effects(db, src, dst):
    lead = _lead(db, status=src)
    assert change_status(db, lead, dst) is False
    assert lead.status == src
    assert _history(db, lead) == []
    assert db.query(LeadActivity).filter(LeadActivity.lead_id == lead.id).count() == 0


def test_archived_is_terminal():
    assert STATUS_TRANSITIONS["Archived"] == []


def test_accepted_transition_logs_activity_and_resets_reminders(db):
    lead = _lead(db, status="Assigned")
    lead.reminder_stage = 2
    db.commit()
    assert change_status(db, lead, "Contacted", actor="rep1") is True
    activity = db.query(LeadActivity).filter(LeadActivity.lead_id == lead.id).one()
    assert activity.activity_type == "StatusChanged"
    assert "Contacted" in activity.description
    assert lead.reminder_stage == 0
    assert lead.last_activity_at


def test_same_status_is_a_noop_that_still_returns_true(db):
    """Re-sending the current status passes the guard; it writes a from==to history row."""
    lead = _lead(db, status="Contacted")
    assert change_status(db, lead, "Contacted") is True
    rows = _history(db, lead)
    assert len(rows) == 1
    assert rows[0].from_status == rows[0].to_status == "Contacted"


def test_unknown_current_status_rejects_every_move(db):
    lead = _lead(db, status="Draft")
    assert change_status(db, lead, "Assigned") is False
    assert lead.status == "Draft"


def test_full_happy_path_builds_ordered_history(db):
    lead = _lead(db)
    path = ["Assigned", "Contacted", "Qualified", "Quote Requested", "Quote Sent", "Won"]
    for status in path:
        assert change_status(db, lead, status) is True
    rows = _history(db, lead)
    assert {r.to_status for r in rows} == set(path)
    assert len(rows) == len(path)


def test_set_status_from_source_skips_transition_rules(db):
    lead = _lead(db, status="New")
    assert set_status_from_source(db, lead, "Won", remarks="SAP order") is True
    assert lead.status == "Won"
    rows = _history(db, lead)
    assert (rows[0].from_status, rows[0].to_status, rows[0].changed_by) == ("New", "Won", "sap-sync")


def test_set_status_from_source_same_status_changes_nothing(db):
    lead = _lead(db, status="Won")
    assert set_status_from_source(db, lead, "Won") is False
    assert _history(db, lead) == []


def test_set_status_from_source_leaves_last_activity_to_the_caller(db):
    lead = _lead(db, status="New")
    set_status_from_source(db, lead, "Won")
    assert not lead.last_activity_at


def test_next_lead_number_starts_at_10000_and_increments(db):
    assert next_lead_number(db) == "L-10000"
    _lead(db, number="L-10000")
    assert next_lead_number(db) == "L-10001"


def test_next_lead_number_uses_numeric_not_string_max(db):
    _lead(db, number="L-99999")
    _lead(db, number="L-100000")
    assert next_lead_number(db) == "L-100001"
