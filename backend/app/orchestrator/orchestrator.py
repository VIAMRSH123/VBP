"""Pipeline Orchestrator — Blueprint Part 6.

Central workflow engine that runs the full WhatsApp-to-dashboard flow:
receive event -> extract -> validate -> duplicate-check -> persist (Bronze/Silver)
-> enrich -> match representative -> sync Quip -> refresh dashboard -> notify -> audit.

Every run is recorded as a PipelineExecution with an append-only PipelineEvent log,
retries transient stage failures with exponential backoff, and routes exhausted
failures to the Dead Letter Queue for manual replay.
"""
import json
import logging
from dataclasses import dataclass
from datetime import datetime, time, timezone

from sqlalchemy.orm import Session

from app.models.bronze import BronzeWhatsAppRaw
from app.models.config import Configuration
from app.models.lead import Lead
from app.models.pipeline import DeadLetterEntry, PipelineExecution, PipelineEvent
from app.models.sap import BronzeSapRaw
from app.models.representative import Manager, Representative
from app.orchestrator import events
from app.orchestrator.retry import with_retry
from app.services import dashboard_service, lead_service
from app.services.ai import duplicate_detection, enrichment, extraction, validation
from app.services.audit_service import record_audit
from app.services.notification_service import send_notification
from app.services.representative_service import assign_representative
from app.services.sap_mapper import SapLeadRecord, utc_now_iso
from app.workers.reminder_worker import TERMINAL_STATUSES, stage_for_age
from app.integrations import quip_client

logger = logging.getLogger("orchestrator")

# How each ingestion channel is labelled on the lead it creates.
_CHANNEL_ORIGINS = {"whatsapp": "WhatsApp message", "website": "Website enquiry"}


class PipelineFailure(Exception):
    def __init__(self, stage: str, original: Exception):
        self.stage = stage
        self.original = original
        super().__init__(f"Pipeline failed at stage '{stage}': {original}")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class SapLeadOutcome:
    action: str  # created | updated | failed
    execution: PipelineExecution
    lead: Lead | None = None
    notified: bool = False  # at least one notification went out for this record
    suppressed: bool = False  # notifications were due but notify=False held them back


class PipelineOrchestrator:
    def __init__(self, db: Session):
        self.db = db
        # Per-record switches. The WhatsApp path leaves the defaults; the SAP path sets them per record.
        self._bulk = False
        self._notify_enabled = True
        self._sent = 0
        self._suppressed = 0

    def _notify(self, **kwargs) -> None:
        if not self._notify_enabled:
            self._suppressed += 1
            return
        send_notification(self.db, **kwargs)
        self._sent += 1

    def _emit(self, execution: PipelineExecution, event_type: str, stage: str, payload: dict, success: bool = True) -> None:
        if self._bulk:
            return  # a backfill would write thousands of per-stage events nobody reads
        self.db.add(
            PipelineEvent(
                execution_id=execution.id,
                event_type=event_type,
                stage=stage,
                payload=json.dumps(payload, default=str)[:4000],
                success=success,
            )
        )
        execution.current_stage = stage
        self.db.commit()

    def _run_stage(self, execution: PipelineExecution, stage: str, fn):
        def on_fail(attempt: int, exc: Exception):
            execution.retry_count += 1
            self.db.commit()

        try:
            return with_retry(fn, stage=stage, on_attempt_failed=on_fail)
        except Exception as exc:  # noqa: BLE001
            raise PipelineFailure(stage, exc) from exc

    def _send_to_dlq(self, execution: PipelineExecution, payload: dict, error: str) -> None:
        self.db.add(
            DeadLetterEntry(
                execution_id=execution.id,
                workflow_name=execution.workflow_name,
                stage=execution.current_stage,
                payload=json.dumps(payload, default=str)[:4000],
                error_details=error[:2000],
            )
        )
        execution.status = "dead_letter"
        execution.error_details = error[:2000]
        execution.ended_at = _now_iso()
        self.db.commit()
        self._emit(execution, events.PIPELINE_FAILED, execution.current_stage, {"error": error}, success=False)

    def run_lead_ingestion(
        self,
        raw_message: str,
        sender_phone: str,
        actor: str = "whatsapp-webhook",
        *,
        channel: str = "whatsapp",
        structured_fields: dict | None = None,
    ) -> PipelineExecution:
        """`channel="website"` passes `structured_fields` (no text extraction) and never applies a
        status update — the sender is an anonymous visitor, not a rep."""
        db = self.db
        execution = PipelineExecution(
            workflow_name="lead_ingestion",
            trigger_source=channel,
            status="running",
            started_at=_now_iso(),
        )
        db.add(execution)
        db.commit()

        try:
            # Stage 1-3: receive event, create execution id (above), store raw payload (Bronze)
            bronze = self._run_stage(
                execution,
                "bronze_ingest",
                lambda: self._store_bronze(sender_phone, raw_message),
            )
            self._emit(execution, events.LEAD_CREATED, "bronze_ingest", {"bronze_id": bronze.id})

            # Stage 4: Claude extraction
            fields = self._run_stage(
                execution,
                "extraction",
                lambda: structured_fields if structured_fields is not None
                else extraction.extract_lead(db, raw_message, sender_phone),
            )

            # Stage 5: validation
            validation_result = self._run_stage(execution, "validation", lambda: validation.validate_lead(db, fields))

            is_status_update = fields.get("message_type") == "status_update" and fields.get("lead_id_reference")
            if channel != "website" and is_status_update:
                lead = self._apply_status_update(execution, fields, bronze, actor)
                execution.lead_id = lead.id if lead else ""
                execution.status = "success"
                execution.ended_at = _now_iso()
                db.commit()
                return execution

            # Stage 6: duplicate detection
            dup_result = self._run_stage(execution, "duplicate_detection", lambda: duplicate_detection.detect_duplicate(db, fields))

            if dup_result.get("is_duplicate") and dup_result.get("merge_recommendation") == "merge":
                lead = db.query(Lead).filter(Lead.lead_number == dup_result["matched_lead_id"]).first()
                if lead:
                    lead_service.log_activity(
                        db, lead.id, "DuplicateMerged", f"Incoming message merged into existing lead: {fields}", actor
                    )
                    lead_service.touch_last_activity(db, lead)
                    bronze.lead_id = lead.id
                    bronze.processed = True
                    db.commit()
                    execution.lead_id = lead.id
                    execution.status = "success"
                    execution.ended_at = _now_iso()
                    db.commit()
                    return execution

            # Stage 7: persist to Silver (create Lead)
            lead = self._run_stage(
                execution,
                "persist",
                lambda: self._create_lead(
                    fields, validation_result, dup_result,
                    source=channel, origin=_CHANNEL_ORIGINS.get(channel, channel), sender_phone=sender_phone, raw_message=raw_message,
                ),
            )
            bronze.lead_id = lead.id
            bronze.processed = True
            db.commit()
            execution.lead_id = lead.id
            self._emit(execution, events.LEAD_CREATED, "persist", {"lead_number": lead.lead_number})

            # Stage 8: enrichment
            self._run_stage(execution, "enrichment", lambda: self._enrich(lead, fields))
            self._emit(execution, events.LEAD_ENRICHED, "enrichment", {"lead_number": lead.lead_number})

            # Stage 9: representative matching
            self._run_stage(execution, "representative_matching", lambda: self._match_representative(lead, actor))

            # Stage 10: Quip sync
            self._run_stage(execution, "quip_sync", lambda: quip_client.sync_lead(lead.lead_number, self._lead_snapshot(lead)))

            # Stage 11: dashboard refresh (Gold aggregation)
            self._run_stage(execution, "dashboard_refresh", lambda: dashboard_service.refresh_gold_metrics(db))
            self._emit(execution, events.DASHBOARD_REFRESHED, "dashboard_refresh", {})

            # Stage 12: notifications already sent during representative matching (LeadAssigned)

            # Stage 13: audit trail
            record_audit(
                db,
                actor=actor,
                action="pipeline.lead_ingestion.completed",
                entity_type="lead",
                entity_id=lead.id,
                details=f"Lead {lead.lead_number} ingested via WhatsApp pipeline",
            )

            execution.status = "success"
            execution.ended_at = _now_iso()
            db.commit()
            return execution

        except PipelineFailure as failure:
            self._send_to_dlq(execution, {"raw_message": raw_message, "sender_phone": sender_phone}, str(failure.original))
            return execution

    def run_sap_lead_sync(
        self,
        record: SapLeadRecord,
        *,
        external_system: str,
        notify: bool,
        bulk: bool,
        actor: str = "sap-sync",
        bronze_id: str = "",
    ) -> SapLeadOutcome:
        """One SAP opportunity/lead -> validated, enriched, assigned Lead (created or updated in place).

        No duplicate detection: SAP ids are unique and one customer legitimately has several opportunities.
        `bulk` (backfill) skips per-stage events, Quip and per-lead AI logging; `notify` gates every
        outbound message. Caller commits nothing: every stage commits itself.
        """
        db = self.db
        self._bulk, self._notify_enabled, self._sent, self._suppressed = bulk, notify, 0, 0
        execution = PipelineExecution(
            workflow_name="sap_lead_sync", trigger_source="sap_sync", status="running", started_at=_now_iso()
        )
        db.add(execution)
        db.commit()

        lead: Lead | None = None
        try:
            validation_result = self._run_stage(execution, "validation", lambda: validation.validate_sap_record(record.fields))
            lead = (
                db.query(Lead)
                .filter(Lead.external_system == external_system, Lead.external_id == record.external_id)
                .first()
            )
            if lead is None:
                lead = self._run_stage(execution, "persist", lambda: self._create_sap_lead(record, validation_result, external_system))
                action = "created"
            else:
                self._run_stage(execution, "persist", lambda: self._update_lead_from_sap(lead, record, validation_result, actor))
                action = "updated"
            execution.lead_id = lead.id
            self._emit(execution, events.LEAD_CREATED if action == "created" else events.LEAD_UPDATED, "persist", {"lead_number": lead.lead_number})

            overrides = {
                "deal_size_estimate": record.deal_value,
                "industry": record.industry,
                "product_category": record.product_category,
                "buying_probability": record.buying_probability,
            }
            self._run_stage(
                execution,
                "enrichment",
                lambda: self._enrich(
                    lead, record.fields, overrides=overrides, is_existing_customer=record.is_existing_customer,
                    allow_llm=(action == "created" and not bulk), log=not bulk,
                ),
            )
            self._emit(execution, events.LEAD_ENRICHED, "enrichment", {"lead_number": lead.lead_number})

            self._run_stage(
                execution, "representative_matching",
                lambda: self._assign_sap_rep(lead, record, external_system, actor),
            )
            if not bulk:
                self._run_stage(execution, "quip_sync", lambda: quip_client.sync_lead(lead.lead_number, self._lead_snapshot(lead)))
            if action == "created":
                record_audit(
                    db, actor=actor, action="pipeline.sap_lead_sync.created", entity_type="lead", entity_id=lead.id,
                    details=f"Lead {lead.lead_number} created from SAP record {record.external_id}",
                )

            # The hash is written last so a record that failed half-way is retried on the next run.
            lead.sap_hash = record.record_hash
            if bronze_id:
                bronze = db.get(BronzeSapRaw, bronze_id)
                if bronze:
                    bronze.lead_id, bronze.processed = lead.id, True
            execution.status = "success"
            execution.ended_at = _now_iso()
            db.commit()
            return SapLeadOutcome(action, execution, lead, notified=self._sent > 0, suppressed=self._suppressed > 0)

        except PipelineFailure as failure:
            entity = "SalesOpportunities" if record.external_id.startswith("opp:") else "BusinessPartners"
            payload = {
                "kind": "sap_record", "entity": entity, "key": record.external_id.split(":", 1)[1],
                "external_system": external_system, "bronze_id": bronze_id,
            }
            self._send_to_dlq(execution, payload, str(failure.original))
            return SapLeadOutcome("failed", execution, lead)

    def _create_sap_lead(self, record: SapLeadRecord, validation_result: dict, external_system: str) -> Lead:
        db = self.db
        extra = {"external_system": external_system, "external_id": record.external_id, "sap_card_code": record.card_code}
        lead = self._create_lead(
            record.fields, validation_result, {}, source="sap", origin=f"SAP ({record.external_id})", extra=extra
        )
        self._apply_sap_fields(lead, record, validation_result)
        if record.created_at:
            lead.created_at = datetime.combine(record.created_at, time.min)
        db.commit()
        lead_service.set_status_from_source(db, lead, record.status, remarks=f"Initial status from SAP ({record.refs.get('stage', '')})")
        return lead

    def _apply_sap_fields(self, lead: Lead, record: SapLeadRecord, validation_result: dict) -> list[str]:
        """Copies SAP-owned fields onto the lead. Returns the names that actually changed."""
        fields = record.fields
        incoming = {
            "company": fields.get("company") or "",
            "contact_name": fields.get("contact_name") or "",
            "phone": fields.get("phone") or "",
            "email": fields.get("email") or "",
            "product": fields.get("product") or "",
            "quantity": fields.get("quantity") or 0,
            "remarks": fields.get("remarks") or lead.remarks,
            "territory": record.territory or lead.territory,
            "sap_card_code": record.card_code,
            "record_state": validation_result.get("record_state", "Draft"),
            "missing_fields": ",".join(fields.get("missing_fields", [])),
        }
        changed = [name for name, value in incoming.items() if getattr(lead, name) != value]
        for name, value in incoming.items():
            setattr(lead, name, value)
        lead.sap_refs = json.dumps({**record.refs, "derived_status": record.status}, default=str)
        lead.sap_synced_at = utc_now_iso()
        lead.last_activity_at = record.last_activity_at or _now_iso()
        # Reminders measure inactivity from SAP's own timestamp; a record that is already old when we first
        # see it starts at the stage it has aged into, so syncing history never fires a reminder burst.
        lead.reminder_stage = stage_for_age(lead.last_activity_at)
        return changed

    def _update_lead_from_sap(self, lead: Lead, record: SapLeadRecord, validation_result: dict, actor: str) -> None:
        db = self.db
        previous = {}
        try:
            previous = json.loads(lead.sap_refs or "{}")
        except ValueError:
            pass
        changed = self._apply_sap_fields(lead, record, validation_result)
        db.commit()

        # SAP is authoritative, but a status someone set by hand in the app survives until SAP's own
        # derived status moves; only then is it overwritten.
        previous_status = lead.status
        if previous.get("derived_status") != record.status:
            if lead_service.set_status_from_source(db, lead, record.status, actor, remarks=f"SAP stage: {record.refs.get('stage', '')}"):
                changed.append("status")
                if record.status in ("Won", "Lost") and previous_status != record.status:
                    self._notify_closed(lead, record.status)
        if changed:
            lead_service.log_activity(db, lead.id, "SAPUpdated", f"Updated from SAP: {', '.join(changed)}", actor)

    def _notify_closed(self, lead: Lead, status: str) -> None:
        rep = self.db.get(Representative, lead.representative_id) if lead.representative_id else None
        if rep and rep.phone:
            self._notify(
                lead_id=lead.id, recipient=rep.phone, recipient_role="sales_representative", template=status,
                context={"lead_number": lead.lead_number, "company": lead.company, "detail": "closed in SAP"},
            )

    def _assign_sap_rep(self, lead: Lead, record: SapLeadRecord, external_system: str, actor: str) -> None:
        db = self.db
        sap_rep = None
        if record.sales_person_code is not None:
            sap_rep = (
                db.query(Representative)
                .filter(Representative.external_system == external_system, Representative.external_id == str(record.sales_person_code))
                .first()
            )
        closed = lead.status in TERMINAL_STATUSES
        if sap_rep is not None:
            if sap_rep.id == lead.representative_id:
                return  # already theirs; nothing to announce
            self._match_representative(lead, actor, preset_rep=sap_rep, announce=not closed)
        elif not lead.representative_id and not closed:
            # SAP named nobody: fall back to the roster-based scoring so the lead still lands somewhere.
            self._match_representative(lead, actor)

    # --- stage implementations -------------------------------------------------

    def _store_bronze(self, sender_phone: str, raw_message: str) -> BronzeWhatsAppRaw:
        bronze = BronzeWhatsAppRaw(sender_phone=sender_phone, raw_payload=raw_message)
        self.db.add(bronze)
        self.db.commit()
        self.db.refresh(bronze)
        return bronze

    def _apply_status_update(self, execution: PipelineExecution, fields: dict, bronze: BronzeWhatsAppRaw, actor: str):
        db = self.db
        lead = db.query(Lead).filter(Lead.lead_number == fields["lead_id_reference"]).first()
        if not lead:
            self._emit(execution, events.PIPELINE_FAILED, "status_update", {"reason": "lead not found"}, success=False)
            return None

        new_status = fields.get("status") or lead.status
        if fields.get("remarks"):
            lead.remarks = fields["remarks"]
        transitioned = lead_service.change_status(db, lead, new_status, actor=actor, remarks=fields.get("remarks", ""))
        bronze.lead_id = lead.id
        bronze.processed = True
        db.commit()

        if not transitioned:
            lead_service.log_activity(
                db, lead.id, "StatusUpdateRejected",
                f"Requested status '{new_status}' is not a valid transition from '{lead.status}'; ignored.",
                actor,
            )
            self._emit(
                execution, events.PIPELINE_FAILED, "status_update",
                {"reason": "invalid transition", "from": lead.status, "to": new_status}, success=False,
            )
            return lead

        self._emit(execution, events.LEAD_UPDATED, "status_update", {"lead_number": lead.lead_number, "status": new_status})
        quip_client.sync_lead(lead.lead_number, self._lead_snapshot(lead))
        dashboard_service.refresh_gold_metrics(db)

        if lead.representative_id and new_status in ("Won", "Lost"):
            from app.models.representative import Representative

            rep = db.get(Representative, lead.representative_id)
            if rep and rep.phone:
                send_notification(
                    db,
                    lead_id=lead.id,
                    recipient=rep.phone,
                    recipient_role="sales_representative",
                    template=new_status,
                    context={"lead_number": lead.lead_number, "company": lead.company, "detail": fields.get("remarks", "")},
                )
        return lead

    def _create_lead(
        self,
        fields: dict,
        validation_result: dict,
        dup_result: dict,
        *,
        source: str,
        origin: str,
        sender_phone: str = "",
        raw_message: str = "",
        extra: dict | None = None,
    ) -> Lead:
        db = self.db
        lead = Lead(
            lead_number=lead_service.next_lead_number(db),
            source=source,
            raw_message=raw_message,
            sales_rep_phone=sender_phone,
            company=fields.get("company") or "",
            contact_name=fields.get("contact_name") or "",
            phone=fields.get("phone") or "",
            email=fields.get("email") or "",
            product=fields.get("product") or "",
            quantity=fields.get("quantity") or 0,
            remarks=fields.get("remarks") or "",
            status="New",
            record_state=validation_result.get("record_state", "Draft"),
            is_duplicate=dup_result.get("is_duplicate", False),
            duplicate_of=dup_result.get("matched_lead_id") or "",
            duplicate_confidence=dup_result.get("confidence", 0.0),
            extraction_confidence=fields.get("confidence", 0.0),
            missing_fields=",".join(fields.get("missing_fields", [])),
            last_activity_at=_now_iso(),
            **(extra or {}),
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)

        from app.models.activity import LeadStatusHistory

        db.add(LeadStatusHistory(lead_id=lead.id, from_status="", to_status="New", changed_by="system"))
        lead_service.log_activity(db, lead.id, "LeadCreated", f"Lead created from {origin} ({lead.record_state})")
        return lead

    def _enrich(
        self,
        lead: Lead,
        fields: dict,
        *,
        overrides: dict | None = None,
        is_existing_customer: bool = False,
        allow_llm: bool = True,
        log: bool = True,
    ) -> None:
        db = self.db
        known = {key: value for key, value in (overrides or {}).items() if value}
        result = enrichment.enrich_lead(
            db, fields, is_existing_customer=is_existing_customer, lead_id=lead.id,
            overrides=known, allow_llm=allow_llm, log=log,
        )
        result = {**result, **known}  # whatever the system of record knows beats a guess, even from the LLM
        lead.industry = result["industry"]
        lead.customer_type = "Existing" if is_existing_customer else result["customer_type"]
        lead.existing_customer_flag = is_existing_customer
        lead.product_category = result["product_category"]
        lead.deal_size_estimate = result["deal_size_estimate"]
        lead.buying_probability = result["buying_probability"]
        lead.lead_score = result["lead_score"]
        lead.risk_score = result["risk_score"]
        lead.priority = result.get("priority", "Medium")
        lead.enrichment_confidence = result["confidence"]
        lead.ai_reasoning = result.get("reasoning", "")
        db.commit()
        if not self._bulk:
            lead_service.log_activity(db, lead.id, "LeadEnriched", f"AI enrichment applied: score={lead.lead_score}")

    def _match_representative(
        self, lead: Lead, actor: str, *, preset_rep: Representative | None = None, announce: bool = True
    ) -> None:
        """`preset_rep` is a rep the source system already chose (SAP salesperson): no scoring, no workload bump.
        `announce=False` links the rep silently (closed leads) and skips the unassigned-queue ping."""
        db = self.db
        if preset_rep is not None:
            result = {"assigned": True, "representative": preset_rep, "confidence": 1.0}
        elif announce:
            result = assign_representative(db, lead.territory, lead.product_category, "", lead.id)
        else:
            result = {"assigned": False}

        if result["assigned"]:
            rep = result["representative"]
            lead.representative_id = rep.id
            lead.representative_name = rep.name
            lead.manager_id = rep.manager_id
            lead.assignment_confidence = result["confidence"]
            db.commit()
            if lead.status == "New":
                lead_service.change_status(db, lead, "Assigned", actor="pipeline")
            lead_service.log_activity(db, lead.id, "LeadAssigned", f"Assigned to {rep.name} (confidence={result['confidence']})")

            if announce and rep.phone:
                self._notify(
                    lead_id=lead.id,
                    recipient=rep.phone,
                    recipient_role="sales_representative",
                    template="LeadAssigned",
                    context={"lead_number": lead.lead_number, "company": lead.company, "product": lead.product},
                )
            if announce and rep.manager_phone:
                self._notify(
                    lead_id=lead.id,
                    recipient=rep.manager_phone,
                    recipient_role="sales_manager",
                    template="LeadUpdated",
                    context={"lead_number": lead.lead_number, "company": lead.company, "detail": f"assigned to {rep.name}"},
                )
        elif announce:
            lead_service.log_activity(db, lead.id, "UnassignedQueue", "No confident representative match found; routed to Unassigned Queue")
            notify_context = {
                "lead_number": lead.lead_number,
                "company": lead.company,
                "detail": "no confident representative match; routed to Unassigned Queue",
            }
            # Manager table is rarely seeded in practice — boss_phone (Configuration) is the
            # realistic fallback recipient so this ping doesn't silently go nowhere.
            for manager in db.query(Manager).filter(Manager.phone != "").all():
                self._notify(
                    lead_id=lead.id, recipient=manager.phone,
                    recipient_role="sales_manager", template="NeedsAttention", context=notify_context,
                )
            boss_phone = db.query(Configuration).filter(Configuration.key == "boss_phone").first()
            if boss_phone and boss_phone.value:
                self._notify(
                    lead_id=lead.id, recipient=boss_phone.value,
                    recipient_role="administrator", template="NeedsAttention", context=notify_context,
                )

    def _lead_snapshot(self, lead: Lead) -> dict:
        return {
            "lead_number": lead.lead_number,
            "company": lead.company,
            "contact_name": lead.contact_name,
            "product": lead.product,
            "status": lead.status,
            "representative_name": lead.representative_name,
            "lead_score": lead.lead_score,
            "deal_size_estimate": lead.deal_size_estimate,
            "updated_at": lead.updated_at,
        }
