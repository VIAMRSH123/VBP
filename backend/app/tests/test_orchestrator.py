"""Pipeline orchestrator — the WhatsApp-to-assigned-lead flow, retry with backoff, and the Dead Letter Queue.

The heuristic AI, the mock WhatsApp client and the mock Quip sync are what run here (conftest blanks every
credential), so these are real end-to-end runs through every stage, not stubs of the orchestrator itself.
"""
import json

import pytest

from app.integrations import quip_client
from app.models.activity import LeadActivity, LeadStatusHistory
from app.models.bronze import BronzeWhatsAppRaw
from app.models.lead import Lead
from app.models.notification import Notification
from app.models.pipeline import DeadLetterEntry, PipelineEvent
from app.models.representative import Representative
from app.orchestrator import retry
from app.orchestrator.orchestrator import PipelineOrchestrator
from app.services.ai import enrichment

SENDER = "+97455999999"
MESSAGE = (
    "Company: Al Fardan Construction\nContact: Omar Al Fardan\nPhone: +97455123456\n"
    "Product: Cement\nQuantity: 200"
)


@pytest.fixture(autouse=True)
def isolated_io(monkeypatch, tmp_path):
    """No Quip snapshots in the working tree, and no real sleeping during backoff."""
    monkeypatch.setattr(quip_client, "MOCK_DIR", tmp_path)
    sleeps: list[float] = []
    monkeypatch.setattr(retry.time, "sleep", sleeps.append)
    return sleeps


@pytest.fixture()
def rep(db):
    rep = Representative(
        representative_code="REP-002", name="Khalid Rahman", territory="Al Rayyan",
        product_category="Building Materials", phone="+97455001002", manager_phone="+97444001001", workload=2,
    )
    db.add(rep)
    db.commit()
    return rep


def run(db, message=MESSAGE, **kwargs):
    return PipelineOrchestrator(db).run_lead_ingestion(message, SENDER, **kwargs)


def stages(db, execution):
    return [e.stage for e in db.query(PipelineEvent).filter(PipelineEvent.execution_id == execution.id)]


# --- the happy path ---------------------------------------------------------------------------


def test_message_becomes_an_enriched_assigned_lead(db, rep):
    execution = run(db)

    assert execution.status == "success"
    assert execution.retry_count == 0
    lead = db.query(Lead).one()
    assert execution.lead_id == lead.id
    assert (lead.company, lead.contact_name, lead.product, lead.quantity) == (
        "Al Fardan Construction", "Omar Al Fardan", "Cement", 200,
    )
    assert lead.source == "whatsapp"
    assert lead.sales_rep_phone == SENDER
    assert lead.record_state == "Valid"
    assert lead.lead_number == "L-10000"
    # enrichment
    assert 0 <= lead.lead_score <= 100 and lead.industry and lead.product_category == "Building Materials"
    # matching moved New -> Assigned
    assert lead.representative_id == rep.id and lead.representative_name == "Khalid Rahman"
    assert lead.status == "Assigned"
    assert rep.workload == 3


def test_every_stage_leaves_a_trace(db, rep):
    execution = run(db)
    lead = db.query(Lead).one()

    assert stages(db, execution) == ["bronze_ingest", "persist", "enrichment", "dashboard_refresh"]
    bronze = db.query(BronzeWhatsAppRaw).one()
    assert bronze.raw_payload == MESSAGE and bronze.lead_id == lead.id and bronze.processed is True
    history = [(h.from_status, h.to_status) for h in db.query(LeadStatusHistory).filter_by(lead_id=lead.id)]
    assert history == [("", "New"), ("New", "Assigned")]
    kinds = {a.activity_type for a in db.query(LeadActivity).filter_by(lead_id=lead.id)}
    assert {"LeadCreated", "LeadEnriched", "LeadAssigned"} <= kinds
    assert (quip_client.MOCK_DIR / f"{lead.lead_number}.json").exists()


def test_rep_and_manager_are_both_notified_of_the_assignment(db, rep):
    run(db)
    sent = {(n.recipient, n.template, n.recipient_role) for n in db.query(Notification)}
    assert sent == {
        ("+97455001002", "LeadAssigned", "sales_representative"),
        ("+97444001001", "LeadUpdated", "sales_manager"),
    }


def test_incomplete_message_is_kept_as_a_draft_not_dropped(db, rep):
    execution = run(db, "Company: Al Fardan Construction\nContact: Omar Al Fardan\nPhone: +97455123456")

    assert execution.status == "success"
    lead = db.query(Lead).one()
    assert lead.record_state == "Draft"
    assert "product" in lead.missing_fields


def test_no_matching_rep_goes_to_the_unassigned_queue_and_pings_the_manager(db):
    db.add(Representative(representative_code="REP-X", name="Far Away", territory="Elsewhere",
                          product_category="Software", workload=20, manager_phone="+97444001001"))
    from app.models.representative import Manager

    db.add(Manager(name="Youssef Hassan", phone="+97444001001"))
    db.commit()

    execution = run(db)

    assert execution.status == "success"
    lead = db.query(Lead).one()
    assert lead.representative_id == "" and lead.status == "New"
    assert "UnassignedQueue" in {a.activity_type for a in db.query(LeadActivity).filter_by(lead_id=lead.id)}
    alerts = db.query(Notification).all()
    assert [(n.template, n.recipient, n.recipient_role) for n in alerts] == [
        ("NeedsAttention", "+97444001001", "sales_manager")
    ]


# --- replays and status updates ---------------------------------------------------------------


def test_replaying_the_same_message_merges_instead_of_creating_a_second_lead(db, rep):
    first = run(db)
    second = run(db)

    assert db.query(Lead).count() == 1
    assert second.id != first.id  # every run gets its own execution row...
    assert second.lead_id == first.lead_id  # ...but resolves to the same lead
    assert second.status == "success"
    merged = db.query(LeadActivity).filter_by(activity_type="DuplicateMerged").all()
    assert len(merged) == 1
    assert rep.workload == 3  # the merge did not assign (and count) the lead a second time


def test_status_update_message_moves_the_lead_and_records_remarks(db, rep):
    run(db)
    execution = run(db, "LeadID: L-10000\nStatus: Contacted\nRemarks: Called, follow-up Friday")

    assert execution.status == "success"
    lead = db.query(Lead).one()
    assert lead.status == "Contacted"
    assert lead.remarks == "Called, follow-up Friday"
    assert stages(db, execution) == ["bronze_ingest", "status_update"]


def test_illegal_status_update_is_rejected_and_logged(db, rep):
    run(db)
    execution = run(db, "LeadID: L-10000\nStatus: Won")  # Assigned -> Won is not a legal move

    lead = db.query(Lead).one()
    assert lead.status == "Assigned"
    assert "StatusUpdateRejected" in {a.activity_type for a in db.query(LeadActivity).filter_by(lead_id=lead.id)}
    failed = db.query(PipelineEvent).filter_by(execution_id=execution.id, success=False).one()
    assert json.loads(failed.payload)["reason"] == "invalid transition"


def test_status_update_for_an_unknown_lead_does_not_create_one(db, rep):
    execution = run(db, "LeadID: L-99999\nStatus: Contacted")

    assert db.query(Lead).count() == 0
    assert execution.lead_id == ""
    failed = db.query(PipelineEvent).filter_by(execution_id=execution.id, success=False).one()
    assert json.loads(failed.payload)["reason"] == "lead not found"


def test_website_channel_ignores_status_updates_in_visitor_text(db, rep):
    run(db)
    fields = {
        "message_type": "status_update", "lead_id_reference": "L-10000", "status": "Lost",
        "company": "Visitor Co", "contact_name": "V", "phone": "+97466000000", "product": "Rice",
        "quantity": 5, "missing_fields": [], "confidence": 1.0,
    }
    run(db, "visitor text", channel="website", structured_fields=fields)

    original = db.query(Lead).filter_by(lead_number="L-10000").one()
    assert original.status == "Assigned"
    created = db.query(Lead).filter_by(lead_number="L-10001").one()
    assert created.source == "website" and created.company == "Visitor Co"


# --- retry with backoff and the Dead Letter Queue ----------------------------------------------


def test_transient_failure_is_retried_and_the_run_still_succeeds(db, rep, monkeypatch, isolated_io):
    real = enrichment.enrich_lead
    calls = {"n": 0}

    def flaky(*args, **kwargs):
        calls["n"] += 1
        if calls["n"] == 1:
            raise RuntimeError("LLM timeout")
        return real(*args, **kwargs)

    monkeypatch.setattr(enrichment, "enrich_lead", flaky)
    execution = run(db)

    assert execution.status == "success"
    assert execution.retry_count == 1
    assert calls["n"] == 2
    assert isolated_io == [retry.BASE_BACKOFF_SECONDS]
    assert db.query(DeadLetterEntry).count() == 0
    assert db.query(Lead).one().status == "Assigned"


def test_exhausted_retries_back_off_exponentially_then_dead_letter(db, rep, monkeypatch, isolated_io):
    def always_fails(*args, **kwargs):
        raise RuntimeError("LLM down")

    monkeypatch.setattr(enrichment, "enrich_lead", always_fails)
    execution = run(db)

    assert execution.status == "dead_letter"
    assert execution.retry_count == retry.MAX_ATTEMPTS
    assert execution.current_stage == "enrichment"
    assert "LLM down" in execution.error_details
    assert execution.ended_at
    # sleeps happen between attempts only, doubling each time
    assert isolated_io == [0.2, 0.4]

    entry = db.query(DeadLetterEntry).one()
    assert (entry.execution_id, entry.workflow_name, entry.stage) == (execution.id, "lead_ingestion", "enrichment")
    assert entry.resolved is False and "LLM down" in entry.error_details
    assert json.loads(entry.payload) == {"raw_message": MESSAGE, "sender_phone": SENDER}
    failure = db.query(PipelineEvent).filter_by(execution_id=execution.id, event_type="PipelineFailed").one()
    assert failure.success is False


def test_a_dead_lettered_run_keeps_what_it_persisted_before_failing(db, rep, monkeypatch):
    monkeypatch.setattr(enrichment, "enrich_lead", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("boom")))
    run(db)

    # The raw message and the lead were already committed, so a replay has something to resume from.
    assert db.query(BronzeWhatsAppRaw).count() == 1
    assert db.query(Lead).count() == 1
