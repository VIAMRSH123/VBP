from sqlalchemy.orm import Session

from app.integrations import whatsapp_client
from app.models.notification import Notification

TEMPLATES = {
    "LeadAssigned": "New lead {lead_number} ({company}) has been assigned to you. Product: {product}.",
    "LeadUpdated": "Lead {lead_number} ({company}) was updated: {detail}.",
    "FollowUpDue": "Reminder: lead {lead_number} ({company}) has had no activity for {hours}h. Please follow up.",
    "NeedsAttention": "Lead {lead_number} ({company}) needs attention: {detail}.",
    "SLABreach": "SLA breach: lead {lead_number} ({company}) has been inactive for 72h+. Escalated to Sales Operations.",
    "Won": "Lead {lead_number} ({company}) marked as WON. Great work!",
    "Lost": "Lead {lead_number} ({company}) marked as LOST. Reason: {detail}.",
    "DailySummary": "Daily summary: {detail}",
    "SapSyncSummary": "SAP sync: {detail}",
    "WeeklySummary": "Weekly summary: {detail}",
}


def send_notification(
    db: Session,
    *,
    lead_id: str,
    recipient: str,
    recipient_role: str,
    template: str,
    context: dict,
) -> Notification:
    body = TEMPLATES.get(template, "{detail}").format(**{**context, "detail": context.get("detail", "")})
    result = whatsapp_client.send_message(recipient, body)

    notification = Notification(
        lead_id=lead_id,
        recipient=recipient,
        recipient_role=recipient_role,
        channel="whatsapp",
        template=template,
        message=body,
        status="sent" if result.get("status") in ("sent", "mocked") else "failed",
        delivered=result.get("status") in ("sent", "mocked"),
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification
