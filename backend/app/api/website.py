"""Trade enquiries from the TFS website -> the lead pipeline.

Server-to-server: the website's own API route calls this after validating the form, its honeypot
and its rate limit. The shared token is checked before the body is even parsed, and the endpoint
is closed (503) until a token is configured.
"""
import hmac
import logging

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.models.lead import Lead
from app.orchestrator.orchestrator import PipelineOrchestrator
from app.schemas.webhook import WebsiteEnquiry
from app.services.website_enquiry import compose_lead_message, to_lead_fields

router = APIRouter(prefix="/api/webhooks", tags=["website"])
logger = logging.getLogger("website.enquiry")


def require_website_token(authorization: str | None = Header(default=None)) -> None:
    expected = get_settings().website_enquiry_token
    if not expected:
        raise HTTPException(status_code=503, detail="Website enquiries are not configured")
    supplied = (authorization or "").removeprefix("Bearer ").strip()
    if not hmac.compare_digest(supplied.encode(), expected.encode()):
        raise HTTPException(status_code=403, detail="Invalid token")


@router.post("/website", dependencies=[Depends(require_website_token)])
def receive_website_enquiry(enquiry: WebsiteEnquiry, db: Session = Depends(get_db)):
    execution = PipelineOrchestrator(db).run_lead_ingestion(
        compose_lead_message(enquiry),
        enquiry.phone or enquiry.email,
        actor="website-enquiry",
        channel="website",
        structured_fields=to_lead_fields(enquiry),
    )
    lead = db.get(Lead, execution.lead_id) if execution.lead_id else None
    # No visitor details in the log line.
    logger.info("Website enquiry -> execution %s (%s)", execution.id, execution.status)
    return {
        "execution_id": execution.id,
        "status": execution.status,
        "lead_number": lead.lead_number if lead else None,
    }
