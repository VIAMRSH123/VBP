"""Reminder & Escalation Engine — Blueprint Part 2 / Part 6 Scheduler.

24h without activity -> reminder to representative + manager.
48h -> second reminder.
72h -> escalate to Sales Operations / Administrator.
"""
import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.lead import Lead
from app.models.notification import ReminderQueue
from app.models.representative import Representative
from app.services.notification_service import send_notification
from app.services.lead_service import log_activity

logger = logging.getLogger("reminder_worker")

TERMINAL_STATUSES = ("Won", "Lost", "Archived")
STAGE_THRESHOLD_HOURS = {1: 24, 2: 48, 3: 72}
SALES_OPS_FALLBACK_PHONE = "+97444009999"  # Sales Operations escalation contact (Configuration override supported)


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


def stage_for_age(iso_ts: str) -> int:
    """The reminder stage a lead has already aged into: 0 below 24h, 1 from 24h, 2 from 48h, 3 from 72h."""
    hours = _hours_since(iso_ts)
    return max((stage for stage, threshold in STAGE_THRESHOLD_HOURS.items() if hours >= threshold), default=0)


def _sales_ops_phone(db: Session) -> str:
    from app.models.config import Configuration

    row = db.query(Configuration).filter(Configuration.key == "sales_ops_phone").first()
    return row.value if row and row.value else SALES_OPS_FALLBACK_PHONE


def run_reminder_check(db: Session) -> dict:
    """Idempotent hourly job: escalates leads through reminder stages 1 -> 2 -> 3."""
    leads = db.query(Lead).filter(Lead.active_flag == True, Lead.status.notin_(TERMINAL_STATUSES)).all()  # noqa: E712

    sent = {"stage1": 0, "stage2": 0, "stage3_escalated": 0}

    for lead in leads:
        hours = _hours_since(lead.last_activity_at)
        next_stage = lead.reminder_stage + 1
        if next_stage > 3:
            continue
        threshold = STAGE_THRESHOLD_HOURS[next_stage]
        if hours < threshold:
            continue

        rep = db.get(Representative, lead.representative_id) if lead.representative_id else None

        if next_stage in (1, 2):
            template = "FollowUpDue"
            if rep and rep.phone:
                send_notification(
                    db, lead_id=lead.id, recipient=rep.phone, recipient_role="sales_representative",
                    template=template, context={"lead_number": lead.lead_number, "company": lead.company, "hours": round(hours)},
                )
            if rep and rep.manager_phone:
                send_notification(
                    db, lead_id=lead.id, recipient=rep.manager_phone, recipient_role="sales_manager",
                    template=template, context={"lead_number": lead.lead_number, "company": lead.company, "hours": round(hours)},
                )
            log_activity(db, lead.id, "ReminderSent", f"Stage {next_stage} reminder sent ({round(hours)}h inactive)")
            sent["stage1" if next_stage == 1 else "stage2"] += 1
        else:
            ops_phone = _sales_ops_phone(db)
            send_notification(
                db, lead_id=lead.id, recipient=ops_phone, recipient_role="sales_operations",
                template="SLABreach", context={"lead_number": lead.lead_number, "company": lead.company},
            )
            log_activity(db, lead.id, "ReminderEscalated", f"Escalated to Sales Operations ({round(hours)}h inactive)")
            sent["stage3_escalated"] += 1

        lead.reminder_stage = next_stage
        db.add(
            ReminderQueue(
                lead_id=lead.id, stage=next_stage, due_at=lead.last_activity_at,
                processed=True, processed_at=datetime.now(timezone.utc).isoformat(),
            )
        )
        db.commit()

    logger.info("Reminder check complete: %s", sent)
    return sent
