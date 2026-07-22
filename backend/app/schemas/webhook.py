from pydantic import BaseModel


class WhatsAppInboundMessage(BaseModel):
    """Simplified inbound WhatsApp message shape (mirrors Meta webhook essentials)."""

    from_phone: str
    message: str
    sender_name: str = ""
