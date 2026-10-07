"""SAP opportunities and lead partners -> leads.

Reads SalesOpportunities (and `cLid` business partners that have no opportunity yet), stores the raw
payload in Bronze, derives a `SapLeadRecord` with the pure mapper and hands it to the orchestrator,
which creates or updates the Lead. Unchanged records (same content hash) never reach the orchestrator.
"""
import json
import logging
from dataclasses import dataclass
from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from app.config import Settings
from app.integrations.sap_client import SapSession
from app.integrations.sap_entities import ENTITIES, date_filter
from app.models.config import Configuration
from app.models.lead import Customer, Lead
from app.models.representative import Manager
from app.models.sap import BronzeSapRaw, SapDocument, SapSyncState
from app.orchestrator.orchestrator import PipelineOrchestrator
from app.services import lead_service, sap_masters_sync as masters
from app.services.notification_service import send_notification
from app.services.sap_mapper import (
    SapLinkedDocs,
    content_hash,
    derive_opportunity_record,
    derive_partner_lead_record,
    linked_document_numbers,
    parse_stage_map,
    utc_now_iso,
)

logger = logging.getLogger("sap.leads")

NOTIFY_MAX_AGE_HOURS = 48  # records quieter than this are history, not news
RECONCILE_EVERY_HOURS = 24
ENTITY = "SalesOpportunities"


@dataclass
class LeadSyncStats:
    notified: int = 0  # records that sent at least one notification
    suppressed: int = 0  # records whose notifications were held back (backfill, cap, or old)
    notification_budget: int = 0


def _hours_since(iso_ts: str) -> float:
    if not iso_ts:
        return 0.0
    try:
        ts = datetime.fromisoformat(iso_ts)
    except ValueError:
        return 0.0
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - ts).total_seconds() / 3600


def store_bronze(db: Session, ext: str, entity: str, key: str, payload: dict, run_id: str) -> BronzeSapRaw:
    """Keeps the latest raw payload per SAP record. A new hash resets `processed` so it is re-derived."""
    digest = content_hash(payload)
    row = (
        db.query(BronzeSapRaw)
        .filter(BronzeSapRaw.external_system == ext, BronzeSapRaw.entity == entity, BronzeSapRaw.entity_key == key)
        .first()
    )
    if row is None:
        row = BronzeSapRaw(external_system=ext, entity=entity, entity_key=key)
        db.add(row)
    if row.content_hash != digest:
        row.payload = json.dumps(payload, default=str)
        row.content_hash = digest
        row.processed = False
    row.source_update_date = str(payload.get("UpdateDate") or "")
    row.sync_run_id = run_id
    db.commit()
    return row


def _document_dict(doc: SapDocument) -> dict:
    return {
        "doc_entry": doc.doc_entry,
        "doc_num": doc.doc_num,
        "cancelled": doc.cancelled,
        "doc_status": doc.doc_status,
        "doc_due_date": doc.doc_due_date,
        "doc_total": doc.doc_total,
        "vat_sum": doc.vat_sum,
        "currency": doc.currency,
        "top_item_name": doc.top_item_name,
        "top_item_group": doc.top_item_group,
        "quantity_total": doc.quantity_total,
    }


def _partner_dict(customer: Customer | None) -> dict:
    if customer is None:
        return {}
    return {
        "company": customer.company,
        "contact_name": customer.contact_name,
        "phone": customer.phone,
        "email": customer.email,
    }


def _stage_map(db: Session) -> dict[str, str]:
    row = db.query(Configuration).filter(Configuration.key == "sap_stage_map").first()
    return parse_stage_map(row.value if row else None)


def _fetch_opportunities(sap: SapSession, since: date | None, backfill: bool) -> dict[str, dict]:
    """Opportunities changed since `since`; a backfill also pulls every open one however old."""
    spec = ENTITIES[ENTITY]
    rows: dict[str, dict] = {}
    window = date_filter(spec.date_field, since, sap.version) if since else None
    for row in sap.fetch_all(ENTITY, filter=window):
        rows[str(row["SequentialNo"])] = row
    if backfill:
        for row in sap.fetch_all(ENTITY, filter="Status eq 'sos_Open'"):
            rows.setdefault(str(row["SequentialNo"]), row)
    return rows


def _reprocess_for_changed_cards(db: Session, ext: str, changed_cards: set[str], rows: dict[str, dict]) -> None:
    """A new order can change a lead without touching the opportunity's own UpdateDate; re-derive from Bronze."""
    if not changed_cards:
        return
    keys = [
        lead.external_id.split(":", 1)[1]
        for lead in db.query(Lead).filter(
            Lead.external_system == ext, Lead.sap_card_code.in_(changed_cards), Lead.external_id.like("opp:%")
        )
    ]
    for key in keys:
        if key in rows:
            continue
        bronze = (
            db.query(BronzeSapRaw)
            .filter(BronzeSapRaw.external_system == ext, BronzeSapRaw.entity == ENTITY, BronzeSapRaw.entity_key == key)
            .first()
        )
        if bronze:
            rows[key] = json.loads(bronze.payload)


def _notify_decision(record, backfill: bool, stats: LeadSyncStats) -> bool:
    return (not backfill) and stats.notification_budget > 0 and _hours_since(record.last_activity_at) <= NOTIFY_MAX_AGE_HOURS


def _run_record(orchestrator, db, ext, record, bronze, backfill, stats, counts, entity) -> None:
    existing = db.query(Lead).filter(Lead.external_system == ext, Lead.external_id == record.external_id).first()
    if existing is not None and existing.sap_hash == record.record_hash:
        masters.bump(counts, entity, "unchanged")
        return
    outcome = orchestrator.run_sap_lead_sync(
        record,
        external_system=ext,
        notify=_notify_decision(record, backfill, stats),
        bulk=backfill,
        bronze_id=bronze.id,
    )
    masters.bump(counts, entity, outcome.action)
    if outcome.notified:
        stats.notified += 1
        stats.notification_budget -= 1
    elif outcome.suppressed:
        stats.suppressed += 1


def sync_leads(
    db: Session,
    sap: SapSession,
    ext: str,
    counts: dict,
    settings: Settings,
    *,
    backfill: bool,
    since: date | None,
    changed_cards: set[str],
    partner_rows: list[dict],
    run_id: str,
    today: date,
) -> LeadSyncStats:
    stats = LeadSyncStats(notification_budget=settings.sap_notify_max_per_run)
    orchestrator = PipelineOrchestrator(db)

    customers = {c.external_id: c for c in db.query(Customer).filter(Customer.external_system == ext, Customer.external_id != "")}
    documents = {
        (d.doc_type, d.doc_entry): _document_dict(d) for d in db.query(SapDocument).filter(SapDocument.external_system == ext)
    }
    stage_names = masters.lookup_map(db, ext, "sales_stage")
    percentages = masters.stage_percentages(db, ext)
    stage_map = _stage_map(db)
    territories = masters.lookup_map(db, ext, "territory")
    industries = masters.lookup_map(db, ext, "industry")

    rows = _fetch_opportunities(sap, since, backfill)
    _reprocess_for_changed_cards(db, ext, changed_cards, rows)
    opportunity_cards: set[str] = {
        code for (code,) in db.query(Lead.sap_card_code).filter(Lead.external_system == ext, Lead.external_id.like("opp:%"))
    }

    for key, row in sorted(rows.items(), key=lambda item: int(item[0])):
        masters.bump(counts, ENTITY, "fetched")
        try:
            card = row.get("CardCode") or ""
            opportunity_cards.add(card)
            customer = customers.get(card)
            quote_nos, order_nos = linked_document_numbers(row)
            docs = SapLinkedDocs(
                quotations=[documents[("quotation", n)] for n in quote_nos if ("quotation", n) in documents],
                orders=[documents[("order", n)] for n in order_nos if ("order", n) in documents],
            )
            record = derive_opportunity_record(
                row,
                _partner_dict(customer),
                docs,
                stage_name=stage_names.get(str(row.get("CurrentStageNo")), ""),
                stage_percentages=percentages,
                stage_map=stage_map,
                territory_name=(customer.territory if customer else "") or "",
                industry_name=(customer.industry if customer else "") or "",
                is_existing_customer=bool(customer and customer.order_count > 0),
                today=today,
                default_country_code=settings.sap_default_country_code,
                order_means_won=settings.sap_order_means_won,
            )
            _rekey_partner_lead(db, ext, card, record.external_id)
            bronze = store_bronze(db, ext, ENTITY, key, row, run_id)
            _run_record(orchestrator, db, ext, record, bronze, backfill, stats, counts, ENTITY)
        except Exception:  # noqa: BLE001 - one bad record must not stop the rest
            db.rollback()
            logger.exception("SAP opportunity %s failed", key)
            masters.bump(counts, ENTITY, "failed")

    for row in partner_rows:
        card = row["CardCode"]
        if card in opportunity_cards:
            continue  # its opportunity already represents it
        try:
            customer = customers.get(card)
            record = derive_partner_lead_record(
                row,
                _partner_dict(customer),
                territory_name=(customer.territory if customer else "") or "",
                industry_name=(customer.industry if customer else "") or "",
            )
            masters.bump(counts, "LeadPartners", "fetched")
            bronze = store_bronze(db, ext, "BusinessPartners", card, row, run_id)
            _run_record(orchestrator, db, ext, record, bronze, backfill, stats, counts, "LeadPartners")
        except Exception:  # noqa: BLE001
            db.rollback()
            logger.exception("SAP lead partner %s failed", card)
            masters.bump(counts, "LeadPartners", "failed")

    if not backfill:
        _send_summary(db, stats, counts)
    return stats


def _rekey_partner_lead(db: Session, ext: str, card_code: str, opportunity_key: str) -> None:
    """A lead created from a bare partner becomes that partner's first opportunity instead of a second lead."""
    if not card_code:
        return
    taken = db.query(Lead.id).filter(Lead.external_system == ext, Lead.external_id == opportunity_key).first()
    partner_lead = db.query(Lead).filter(Lead.external_system == ext, Lead.external_id == f"bp:{card_code}").first()
    if partner_lead is None or taken is not None:
        return
    partner_lead.external_id = opportunity_key
    db.commit()
    lead_service.log_activity(db, partner_lead.id, "SAPLinked", f"Linked to SAP opportunity {opportunity_key.split(':', 1)[1]}", "sap-sync")


def _send_summary(db: Session, stats: LeadSyncStats, counts: dict) -> None:
    """When the per-run cap held messages back, managers get one line instead of silence."""
    if stats.suppressed == 0:
        return
    created = sum(counts.get(entity, {}).get("created", 0) for entity in (ENTITY, "LeadPartners"))
    updated = sum(counts.get(entity, {}).get("updated", 0) for entity in (ENTITY, "LeadPartners"))
    detail = f"{created} new and {updated} updated leads synced; {stats.suppressed} had no individual alert (see the dashboard)"
    recipients = [m.phone for m in db.query(Manager).filter(Manager.phone != "")]
    boss = db.query(Configuration).filter(Configuration.key == "boss_phone").first()
    if boss and boss.value:
        recipients.append(boss.value)
    for phone in dict.fromkeys(recipients):
        send_notification(db, lead_id="", recipient=phone, recipient_role="sales_manager", template="SapSyncSummary", context={"detail": detail})


# --- reconcile -------------------------------------------------------------------------------


def reconcile_due(db: Session, ext: str) -> bool:
    row = db.query(SapSyncState).filter(SapSyncState.external_system == ext, SapSyncState.entity == ENTITY).first()
    return row is None or not row.last_reconcile_at or _hours_since(row.last_reconcile_at) >= RECONCILE_EVERY_HOURS


def reconcile_leads(db: Session, sap: SapSession, ext: str, counts: dict) -> None:
    """Archives leads whose opportunity or lead partner no longer exists in SAP. Fetches keys only."""
    opportunity_keys = {str(r["SequentialNo"]) for r in sap.fetch_all(ENTITY, select=("SequentialNo",))}
    partner_keys = {r["CardCode"] for r in sap.fetch_all("BusinessPartners", select=("CardCode",))}
    local = db.query(Lead).filter(Lead.external_system == ext, Lead.external_id != "", Lead.status != "Archived").all()
    if local and not opportunity_keys and not partner_keys:
        raise RuntimeError("SAP returned no opportunities or partners; refusing to archive every SAP lead")

    for lead in local:
        kind, _, key = lead.external_id.partition(":")
        gone = (kind == "opp" and key not in opportunity_keys) or (kind == "bp" and key not in partner_keys)
        if gone and lead_service.set_status_from_source(db, lead, "Archived", remarks="No longer present in SAP"):
            masters.bump(counts, "Reconcile", "updated")

    row = db.query(SapSyncState).filter(SapSyncState.external_system == ext, SapSyncState.entity == ENTITY).first()
    if row is None:
        row = SapSyncState(external_system=ext, entity=ENTITY)
        db.add(row)
    row.last_reconcile_at = utc_now_iso()
    db.commit()
