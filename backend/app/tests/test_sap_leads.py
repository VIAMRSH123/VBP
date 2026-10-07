import json

import pytest

from app.config import get_settings
from app.models.activity import LeadStatusHistory
from app.models.config import Configuration
from app.models.lead import Lead
from app.models.notification import Notification
from app.models.pipeline import DeadLetterEntry
from app.models.sap import SapSyncState
from app.services import sap_sync_service as sync
from app.workers.reminder_worker import run_reminder_check

EXT = "sap_b1_mock"
TODAY = None  # the mock fixture is built "as of today", so no literal dates are needed here


def leads(db):
    return db.query(Lead).filter(Lead.external_system == EXT).all()


def counts_of(run):
    return json.loads(run.counts)


def test_backfill_turns_opportunities_and_lead_partners_into_leads(db, mock_sap):
    run = sync.run_sync(db)
    counts = counts_of(run)

    assert run.status == "success" and run.error_details == ""
    assert counts["SalesOpportunities"]["created"] == len(mock_sap.data["SalesOpportunities"])
    assert len(leads(db)) == counts["SalesOpportunities"]["created"] + counts["LeadPartners"]["created"]
    opportunity_leads = [lead for lead in leads(db) if lead.external_id.startswith("opp:")]
    assert all(lead.source == "sap" and lead.sap_hash for lead in opportunity_leads)
    assert all(lead.territory and lead.industry for lead in opportunity_leads)
    assert all(lead.deal_size_estimate > 0 for lead in opportunity_leads)
    assert all(lead.representative_id for lead in opportunity_leads)  # SAP's salesperson is used directly


def test_won_and_lost_come_from_sap_and_skip_the_transition_rules(db, mock_sap):
    sync.run_sync(db)
    sold = {f"opp:{o['SequentialNo']}" for o in mock_sap.data["SalesOpportunities"] if o["Status"] == "sos_Sold"}
    missed = {f"opp:{o['SequentialNo']}" for o in mock_sap.data["SalesOpportunities"] if o["Status"] == "sos_Missed"}
    by_id = {lead.external_id: lead for lead in leads(db)}

    assert sold and all(by_id[key].status == "Won" for key in sold)
    assert missed and all(by_id[key].status == "Lost" for key in missed)
    history = db.query(LeadStatusHistory).filter(LeadStatusHistory.lead_id == by_id[next(iter(sold))].id).all()
    assert [h.to_status for h in history][-1] == "Won"  # New -> Won is not an allowed manual transition


def test_backfill_sends_no_notifications_and_counts_what_it_held_back(db, mock_sap):
    run = sync.run_sync(db)
    assert db.query(Notification).count() == 0
    assert run.notifications_suppressed > 0


def test_stale_backfilled_leads_do_not_trigger_reminders(db, mock_sap):
    sync.run_sync(db)
    sent = run_reminder_check(db)
    assert sent == {"stage1": 0, "stage2": 0, "stage3_escalated": 0}
    assert db.query(Notification).count() == 0


def test_rerunning_creates_no_duplicates_and_touches_nothing(db, mock_sap):
    sync.run_sync(db)
    before = {lead.external_id: (lead.lead_number, lead.updated_at) for lead in leads(db)}

    counts = counts_of(sync.run_sync(db))

    assert len(leads(db)) == len(before)
    assert counts["SalesOpportunities"]["created"] == 0 and counts["SalesOpportunities"]["updated"] == 0
    assert {lead.external_id: (lead.lead_number, lead.updated_at) for lead in leads(db)} == before


def test_incremental_run_creates_new_leads_and_closes_sold_ones(db, mock_sap):
    sync.run_sync(db)
    total = len(leads(db))

    changes = mock_sap.drift()
    run = sync.run_sync(db)
    counts = counts_of(run)

    assert run.mode == "incremental" and run.status == "success"
    assert counts["SalesOpportunities"]["created"] == changes["new_opportunities"]
    assert counts["SalesOpportunities"]["updated"] >= changes["closed"]
    assert len(leads(db)) == total + changes["new_opportunities"]


def test_a_manual_status_survives_until_sap_moves_the_stage(db, mock_sap):
    sync.run_sync(db)
    opportunity = next(o for o in mock_sap.data["SalesOpportunities"] if o["Status"] == "sos_Open" and o["CurrentStageNo"] == 1)
    lead = db.query(Lead).filter(Lead.external_id == f"opp:{opportunity['SequentialNo']}").one()
    derived = lead.status
    lead.status = "Contacted"
    db.commit()

    sync.run_sync(db)
    db.refresh(lead)
    assert lead.status == "Contacted"  # SAP did not change, so the hand-set status stays

    opportunity.update({"CurrentStageNo": 3, "ClosingPercentage": 50.0, "UpdateDate": mock_sap.as_of.isoformat()})
    sync.run_sync(db)
    db.refresh(lead)
    assert lead.status != "Contacted" and lead.status != derived or lead.status == "Negotiation"
    assert json.loads(lead.sap_refs)["stage_percent"] == 50.0


def test_a_lead_partner_is_rekeyed_when_its_first_opportunity_appears(db, mock_sap):
    sync.run_sync(db)
    partner_lead = next(lead for lead in leads(db) if lead.external_id.startswith("bp:"))
    card = partner_lead.external_id.split(":", 1)[1]
    total = len(leads(db))

    mock_sap.drift()  # adds opportunities; force one for this specific partner
    template = dict(mock_sap.data["SalesOpportunities"][-1])
    sequence = max(o["SequentialNo"] for o in mock_sap.data["SalesOpportunities"]) + 1
    template.update({"SequentialNo": sequence, "CardCode": card, "UpdateDate": mock_sap.as_of.isoformat()})
    mock_sap.data["SalesOpportunities"].append(template)
    sync.run_sync(db)

    db.refresh(partner_lead)
    assert partner_lead.external_id == f"opp:{sequence}"
    assert db.query(Lead).filter(Lead.external_id == f"bp:{card}").count() == 0
    assert len(leads(db)) >= total  # re-keyed in place, not duplicated


def test_reconcile_archives_leads_that_disappeared_from_sap(db, mock_sap):
    sync.run_sync(db)
    removed = mock_sap.data["SalesOpportunities"].pop(0)
    key = f"opp:{removed['SequentialNo']}"
    db.query(SapSyncState).filter(SapSyncState.entity == "SalesOpportunities").update({"last_reconcile_at": ""})
    db.commit()

    sync.run_sync(db)

    assert db.query(Lead).filter(Lead.external_id == key).one().status == "Archived"


def test_reconcile_refuses_to_archive_everything_when_sap_returns_nothing(db, mock_sap):
    sync.run_sync(db)
    mock_sap.data["SalesOpportunities"].clear()
    mock_sap.data["BusinessPartners"].clear()
    db.query(SapSyncState).filter(SapSyncState.entity == "SalesOpportunities").update({"last_reconcile_at": ""})
    db.commit()

    run = sync.run_sync(db)

    assert run.status == "partial" and "refusing to archive" in run.error_details
    assert db.query(Lead).filter(Lead.status == "Archived").count() == 0


def test_notifications_are_capped_per_run_with_a_summary_for_managers(db, mock_sap, monkeypatch):
    monkeypatch.setattr(get_settings(), "sap_notify_max_per_run", 1)
    db.add(Configuration(key="boss_phone", value="+919999900001"))
    db.commit()
    sync.run_sync(db)

    mock_sap.drift(rounds=3)
    run = sync.run_sync(db)

    rows = db.query(Notification).all()
    announced = {n.lead_id for n in rows if n.template != "SapSyncSummary"}
    assert len(announced) == 1  # one lead announced, the rest held back
    assert run.notifications_suppressed >= 2
    assert "SapSyncSummary" in [n.template for n in rows]


def test_a_failing_stage_sends_the_record_to_the_dead_letter_queue_without_stopping_the_run(db, mock_sap, monkeypatch):
    from app.orchestrator import retry
    from app.services.ai import enrichment

    monkeypatch.setattr(retry.time, "sleep", lambda _s: None)
    real = enrichment.enrich_lead
    calls = {"n": 0}

    def flaky(*args, **kwargs):
        calls["n"] += 1
        if kwargs.get("lead_id") and calls["n"] <= 3:  # the first record fails all three attempts
            raise RuntimeError("enrichment down")
        return real(*args, **kwargs)

    monkeypatch.setattr(enrichment, "enrich_lead", flaky)
    run = sync.run_sync(db)

    entry = db.query(DeadLetterEntry).one()
    payload = json.loads(entry.payload)
    assert payload["kind"] == "sap_record" and payload["entity"] in ("SalesOpportunities", "BusinessPartners")
    assert run.status == "success"
    assert counts_of(run)["SalesOpportunities"]["created"] == len(mock_sap.data["SalesOpportunities"]) - (
        1 if payload["entity"] == "SalesOpportunities" else 0
    )
    # the half-processed lead has no hash, so the next run retries it
    broken = db.query(Lead).filter(Lead.external_id == f"{'opp' if payload['entity'] == 'SalesOpportunities' else 'bp'}:{payload['key']}").one()
    assert broken.sap_hash == ""


def test_mock_leads_are_tagged_so_they_can_be_purged(db, mock_sap):
    sync.run_sync(db)
    assert sync.has_mock_data(db)
    sync.purge_mock_data(db)
    assert db.query(Lead).filter(Lead.external_system == EXT).count() == 0


def test_lead_api_exposes_source_and_sap_references(db, client, auth, mock_sap):
    sync.run_sync(db)
    headers = auth("administrator")
    lead = next(l for l in leads(db) if l.external_id.startswith("opp:"))

    detail = client.get(f"/api/leads/{lead.id}", headers=headers).json()
    assert detail["source"] == "sap" and detail["external_system"] == EXT and detail["territory"]

    sap = client.get(f"/api/leads/{lead.id}/sap", headers=headers).json()
    assert sap["linked"] and sap["external_id"] == lead.external_id
    assert sap["refs"]["opportunity_no"] == int(lead.external_id.split(":")[1])

    only_sap = client.get("/api/leads?source=sap&limit=200", headers=headers).json()
    assert only_sap["total"] == len(leads(db))
    assert client.get("/api/leads?source=whatsapp", headers=headers).json()["total"] == 0


def test_lead_sap_endpoint_for_a_non_sap_lead_is_empty(db, client, auth):
    lead = Lead(lead_number="L-1", company="Local Co", source="whatsapp")
    db.add(lead)
    db.commit()
    body = client.get(f"/api/leads/{lead.id}/sap", headers=auth("administrator")).json()
    assert body["linked"] is False and body["refs"] == {}
