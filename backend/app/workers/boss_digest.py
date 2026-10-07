"""Boss Digest — daily WhatsApp summary of unassigned and stale leads.

Two buckets, summarized into one message instead of one-off pings:
- Unassigned: leads still at status "New" (no confident representative match found).
- Stale: leads already escalated by the reminder engine's 72h stage (reminder_stage == 3) —
  i.e. no rep activity for 3+ days — see app/workers/reminder_worker.py for that engine.
"""
import logging

from sqlalchemy.orm import Session

from app.models.config import Configuration
from app.models.lead import Lead
from app.services.notification_service import send_notification

logger = logging.getLogger("boss_digest")

TERMINAL_STATUSES = ("Won", "Lost", "Archived")
MAX_DIGEST_LINES = 15  # a SAP backfill can produce hundreds of stale leads; WhatsApp messages can't carry them


def _boss_phone(db: Session) -> str:
    row = db.query(Configuration).filter(Configuration.key == "boss_phone").first()
    return row.value if row and row.value else ""


def _format_lead_line(lead: Lead) -> str:
    return f"{lead.lead_number} — {lead.company} ({lead.product})"


def _format_lines(leads: list[Lead]) -> str:
    lines = [f"  • {_format_lead_line(l)}" for l in leads[:MAX_DIGEST_LINES]]
    if len(leads) > MAX_DIGEST_LINES:
        lines.append(f"  … and {len(leads) - MAX_DIGEST_LINES} more (see the dashboard)")
    return "\n".join(lines)


def _build_digest_text(unassigned: list[Lead], stale: list[Lead]) -> str:
    sections = []
    if unassigned:
        lines = _format_lines(unassigned)
        sections.append(f"🔴 Unassigned ({len(unassigned)}):\n{lines}")
    if stale:
        lines = _format_lines(stale)
        sections.append(f"🟡 No rep response 3+ days ({len(stale)}):\n{lines}")
    return "\n\n".join(sections)


def run_boss_digest(db: Session) -> dict:
    """Sends one consolidated WhatsApp digest to `boss_phone` (Configuration). Returns a summary
    dict; skips sending (and logs why) if there's nothing to report or no phone configured."""
    boss_phone = _boss_phone(db)

    unassigned = (
        db.query(Lead)
        .filter(Lead.active_flag == True, Lead.status == "New")  # noqa: E712
        .order_by(Lead.created_at.desc())
        .all()
    )
    stale = (
        db.query(Lead)
        .filter(Lead.active_flag == True, Lead.status.notin_(TERMINAL_STATUSES), Lead.reminder_stage == 3)  # noqa: E712
        .order_by(Lead.updated_at.desc())
        .all()
    )

    if not unassigned and not stale:
        logger.info("Boss digest: nothing to report, skipping send")
        return {"sent": False, "reason": "nothing to report", "unassigned": 0, "stale": 0}

    if not boss_phone:
        logger.warning("Boss digest: %d unassigned + %d stale leads, but boss_phone is not configured — skipping send", len(unassigned), len(stale))
        return {"sent": False, "reason": "boss_phone not configured", "unassigned": len(unassigned), "stale": len(stale)}

    digest_text = _build_digest_text(unassigned, stale)
    send_notification(
        db, lead_id="", recipient=boss_phone, recipient_role="administrator",
        template="DailySummary", context={"detail": digest_text},
    )
    logger.info("Boss digest sent to %s: %d unassigned, %d stale", boss_phone, len(unassigned), len(stale))
    return {"sent": True, "unassigned": len(unassigned), "stale": len(stale)}
