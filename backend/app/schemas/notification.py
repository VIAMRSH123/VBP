from datetime import datetime

from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: str
    lead_id: str
    recipient: str
    recipient_role: str
    channel: str
    template: str
    message: str
    status: str
    delivered: bool
    created_at: datetime

    model_config = {"from_attributes": True}
