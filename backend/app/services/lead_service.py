from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.activity import LeadActivity, LeadStatusHistory
from app.models.lead import Lead

LEAD_NUMBER_PREFIX = "L-"
LEAD_NUMBER_START = 10000

STATUS_TRANSITIONS: dict[str, list[str]] = {
    "New": ["Assigned", "Archived"],
    "Assigned": ["Contacted", "Archived"],
    "Contacted": ["Qualified", "Lost", "Archived"],
    "Qualified": ["Quote Requested", "Lost", "Archived"],
    "Quote Requested": ["Quote Sent", "Lost", "Archived"],
    "Quote Sent": ["Negotiation", "Won", "Lost", "Archived"],
    "Negotiation": ["Awaiting Customer", "Won", "Lost", "Archived"],
    "Awaiting Customer": ["Negotiation", "Won", "Lost", "Archived"],
    "Won": ["Archived"],
    "Lost": ["Archived"],
    "Archived": [],
}


def next_lead_number(db: Session) -> str:
    max_number = db.query(func.max(Lead.lead_number)).scalar()
    if not max_number:
        return f"{LEAD_NUMBER_PREFIX}{LEAD_NUMBER_START}"
    numeric = int(max_number.replace(LEAD_NUMBER_PREFIX, ""))
    return f"{LEAD_NUMBER_PREFIX}{numeric + 1}"


def log_activity(db: Session, lead_id: str, activity_type: str, description: str, actor: str = "system") -> None:
    db.add(LeadActivity(lead_id=lead_id, activity_type=activity_type, description=description, actor=actor))
    db.commit()


def touch_last_activity(db: Session, lead: Lead) -> None:
    lead.last_activity_at = datetime.now(timezone.utc).isoformat()
    lead.reminder_stage = 0
    db.commit()


def change_status(db: Session, lead: Lead, new_status: str, actor: str = "system", remarks: str = "") -> bool:
    allowed = STATUS_TRANSITIONS.get(lead.status, [])
    if new_status != lead.status and new_status not in allowed:
        return False

    db.add(
        LeadStatusHistory(
            lead_id=lead.id, from_status=lead.status, to_status=new_status, changed_by=actor, remarks=remarks
        )
    )
    lead.status = new_status
    db.commit()
    log_activity(db, lead.id, "StatusChanged", f"Status changed to {new_status} by {actor}", actor)
    touch_last_activity(db, lead)
    return True
