from datetime import datetime, timezone

from sqlalchemy import Integer, cast, func
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
    # Numeric max, not string max: "L-99999" sorts above "L-100000" as text.
    prefix_len = len(LEAD_NUMBER_PREFIX)
    numeric = db.query(func.max(cast(func.substr(Lead.lead_number, prefix_len + 1), Integer))).scalar()
    return f"{LEAD_NUMBER_PREFIX}{(numeric or LEAD_NUMBER_START - 1) + 1}"


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


def set_status_from_source(db: Session, lead: Lead, new_status: str, actor: str = "sap-sync", remarks: str = "") -> bool:
    """Applies a status decided by an external system of record (SAP).

    Unlike `change_status` this does not enforce STATUS_TRANSITIONS: SAP is the source of truth and can
    legitimately jump New -> Won. It still writes the history and activity trail, and does not touch
    `last_activity_at` (the caller sets that from the source's own timestamp).
    """
    if new_status == lead.status:
        return False
    db.add(LeadStatusHistory(lead_id=lead.id, from_status=lead.status, to_status=new_status, changed_by=actor, remarks=remarks))
    lead.status = new_status
    db.commit()
    log_activity(db, lead.id, "StatusChanged", f"Status set to {new_status} from SAP", actor)
    return True
