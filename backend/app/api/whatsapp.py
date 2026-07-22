import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.auth.deps import CurrentUser, admin_only
from app.db import get_db
from app.integrations.whatsapp_client import verify_webhook_signature
from app.orchestrator.orchestrator import PipelineOrchestrator
from app.schemas.webhook import WhatsAppInboundMessage
from app.services.whatsapp_wasender_parser import extract_inbound_messages

router = APIRouter(prefix="/api/webhooks", tags=["whatsapp"])
logger = logging.getLogger("whatsapp.webhook")


@router.post("/whatsapp")
def receive_whatsapp_message(
    payload: WhatsAppInboundMessage,
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(admin_only),
):
    """Simplified test entry point (Blueprint Part 6 step 1).

    Accepts the flat {from_phone, message} shape used by scripts/whatsapp_simulator.py.
    Admin-only: this route has no signature verification (unlike /wasender), so it must not
    be reachable by anyone but an authenticated administrator running the local test script.
    Real WaSenderAPI traffic goes to /api/webhooks/whatsapp/wasender instead — see that
    route for the actual webhook contract.
    """
    orchestrator = PipelineOrchestrator(db)
    execution = orchestrator.run_lead_ingestion(payload.message, payload.from_phone, actor=f"whatsapp:{payload.from_phone}")
    return {
        "execution_id": execution.id,
        "status": execution.status,
        "current_stage": execution.current_stage,
        "lead_id": execution.lead_id,
        "retry_count": execution.retry_count,
    }


@router.post("/whatsapp/wasender")
async def receive_wasender_webhook(request: Request, db: Session = Depends(get_db)):
    """Real WaSenderAPI webhook — this is the URL you put in the Wasender dashboard's
    Webhook URL field for the session.

    No verification handshake is needed here (unlike Meta's GET challenge) — the webhook
    URL and secret are just configured directly in the Wasender dashboard. Parses the
    actual "messages.received" payload (see app/services/whatsapp_wasender_parser.py),
    then feeds each inbound text message through the same PipelineOrchestrator used by
    the simulator, so extraction/validation/enrichment/assignment all behave identically
    whether the message came from a real phone or a test script.
    """
    signature = request.headers.get("X-Webhook-Signature")
    if not verify_webhook_signature(signature):
        raise HTTPException(status_code=403, detail="Invalid webhook signature")

    payload = await request.json()
    logger.info("Wasender webhook event=%s", payload.get("event"))
    messages = extract_inbound_messages(payload)

    orchestrator = PipelineOrchestrator(db)
    executions = []
    for msg in messages:
        execution = orchestrator.run_lead_ingestion(
            msg["message"], msg["from_phone"], actor=f"whatsapp:{msg['from_phone']}"
        )
        executions.append(execution.id)
        logger.info("Processed inbound WhatsApp message from %s -> execution %s", msg["from_phone"], execution.id)

    # Respond 200 fast regardless of downstream processing outcome, per WaSenderAPI's webhook guidance.
    return {"received": len(messages), "execution_ids": executions}
