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
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.bronze import BronzeWhatsAppRaw
from app.models.config import Configuration
from app.models.lead import Lead
from app.models.pipeline import DeadLetterEntry, PipelineExecution, PipelineEvent
from app.models.representative import Manager
from app.orchestrator import events
from app.orchestrator.retry import with_retry
from app.services import dashboard_service, lead_service
from app.services.ai import duplicate_detection, enrichment, extraction, validation
from app.services.audit_service import record_audit
from app.services.notification_service import send_notification
from app.services.representative_service import assign_representative
from app.integrations import quip_client

logger = logging.getLogger("orchestrator")


class PipelineFailure(Exception):
    def __init__(self, stage: str, original: Exception):
        self.stage = stage
        self.original = original
        super().__init__(f"Pipeline failed at stage '{stage}': {original}")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class PipelineOrchestrator:
    def __init__(self, db: Session):
        self.db = db

    def _emit(self, execution: PipelineExecution, event_type: str, stage: str, payload: dict, success: bool = True) -> None:
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

    def run_lead_ingestion(self, raw_message: str, sender_phone: str, actor: str = "whatsapp-webhook") -> PipelineExecution:
        db = self.db
        execution = PipelineExecution(
            workflow_name="lead_ingestion",
            trigger_source="whatsapp",
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
            fields = self._run_stage(execution, "extraction", lambda: extraction.extract_lead(db, raw_message, sender_phone))

            # Stage 5: validation
            validation_result = self._run_stage(execution, "validation", lambda: validation.validate_lead(db, fields))

            if fields.get("message_type") == "status_update" and fields.get("lead_id_reference"):
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
                lambda: self._create_lead(fields, validation_result, dup_result, sender_phone, raw_message),
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
        self, fields: dict, validation_result: dict, dup_result: dict, sender_phone: str, raw_message: str
    ) -> Lead:
        db = self.db
        lead = Lead(
            lead_number=lead_service.next_lead_number(db),
            source="whatsapp",
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
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)

        from app.models.activity import LeadStatusHistory

        db.add(LeadStatusHistory(lead_id=lead.id, from_status="", to_status="New", changed_by="system"))
        lead_service.log_activity(db, lead.id, "LeadCreated", f"Lead created from WhatsApp message ({lead.record_state})")
        return lead

    def _enrich(self, lead: Lead, fields: dict) -> None:
        db = self.db
        result = enrichment.enrich_lead(db, fields, is_existing_customer=False, lead_id=lead.id)
        lead.industry = result["industry"]
        lead.customer_type = result["customer_type"]
        lead.product_category = result["product_category"]
        lead.deal_size_estimate = result["deal_size_estimate"]
        lead.buying_probability = result["buying_probability"]
        lead.lead_score = result["lead_score"]
        lead.risk_score = result["risk_score"]
        lead.priority = result.get("priority", "Medium")
        lead.enrichment_confidence = result["confidence"]
        lead.ai_reasoning = result.get("reasoning", "")
        db.commit()
        lead_service.log_activity(db, lead.id, "LeadEnriched", f"AI enrichment applied: score={lead.lead_score}")

    def _match_representative(self, lead: Lead, actor: str) -> None:
        db = self.db
        result = assign_representative(db, lead.territory, lead.product_category, "", lead.id)
        if result["assigned"]:
            rep = result["representative"]
            lead.representative_id = rep.id
            lead.representative_name = rep.name
            lead.manager_id = rep.manager_id
            lead.assignment_confidence = result["confidence"]
            db.commit()
            lead_service.change_status(db, lead, "Assigned", actor="pipeline")
            lead_service.log_activity(db, lead.id, "LeadAssigned", f"Assigned to {rep.name} (confidence={result['confidence']})")

            if rep.phone:
                send_notification(
                    db,
                    lead_id=lead.id,
                    recipient=rep.phone,
                    recipient_role="sales_representative",
                    template="LeadAssigned",
                    context={"lead_number": lead.lead_number, "company": lead.company, "product": lead.product},
                )
            if rep.manager_phone:
                send_notification(
                    db,
                    lead_id=lead.id,
                    recipient=rep.manager_phone,
                    recipient_role="sales_manager",
                    template="LeadUpdated",
                    context={"lead_number": lead.lead_number, "company": lead.company, "detail": f"assigned to {rep.name}"},
                )
        else:
            lead_service.log_activity(db, lead.id, "UnassignedQueue", "No confident representative match found; routed to Unassigned Queue")
            notify_context = {
                "lead_number": lead.lead_number,
                "company": lead.company,
                "detail": "no confident representative match; routed to Unassigned Queue",
            }
            # Manager table is rarely seeded in practice — boss_phone (Configuration) is the
            # realistic fallback recipient so this ping doesn't silently go nowhere.
            for manager in db.query(Manager).filter(Manager.phone != "").all():
                send_notification(
                    db, lead_id=lead.id, recipient=manager.phone,
                    recipient_role="sales_manager", template="NeedsAttention", context=notify_context,
                )
            boss_phone = db.query(Configuration).filter(Configuration.key == "boss_phone").first()
            if boss_phone and boss_phone.value:
                send_notification(
                    db, lead_id=lead.id, recipient=boss_phone.value,
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
