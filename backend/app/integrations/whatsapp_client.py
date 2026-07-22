"""WhatsApp integration via WaSenderAPI (wasenderapi.com).

Sends real messages via the WaSenderAPI REST API when WASENDER_API_KEY is configured;
otherwise logs the message to the console/notifications table as a local mock,
so the full pipeline runs without a WhatsApp session at all.
"""
import hmac
import logging

import httpx

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger("whatsapp")

WASENDER_API_URL = "https://www.wasenderapi.com/api/send-message"


def verify_webhook_signature(signature_header: str | None) -> bool:
    """Validates WaSenderAPI's X-Webhook-Signature header against WASENDER_WEBHOOK_SECRET.

    WaSenderAPI sends the configured Webhook Secret verbatim in this header (no HMAC),
    so this is a direct constant-time comparison rather than a digest check.

    Returns True (and logs a warning) when WASENDER_WEBHOOK_SECRET is not configured, so
    local development without one still works — set it before going to production.
    """
    if not settings.wasender_webhook_secret:
        logger.warning("WASENDER_WEBHOOK_SECRET not set; skipping webhook signature verification")
        return True
    if not signature_header:
        return False

    return hmac.compare_digest(signature_header, settings.wasender_webhook_secret)


def send_message(to_phone: str, message: str) -> dict:
    if not settings.use_real_whatsapp:
        logger.info("[MOCK WHATSAPP] to=%s message=%s", to_phone, message)
        return {"status": "mocked", "to": to_phone, "message": message}

    headers = {"Authorization": f"Bearer {settings.wasender_api_key}"}
    payload = {"to": to_phone, "text": message}
    try:
        response = httpx.post(WASENDER_API_URL, headers=headers, json=payload, timeout=10)
        response.raise_for_status()
        return {"status": "sent", "response": response.json()}
    except httpx.HTTPError as exc:
        logger.error("WhatsApp send failed: %s", exc)
        return {"status": "failed", "error": str(exc)}
