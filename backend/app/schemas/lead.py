from datetime import datetime

from pydantic import BaseModel


class LeadOut(BaseModel):
    id: str
    lead_number: str
    company: str
    contact_name: str
    phone: str
    email: str
    product: str
    quantity: int
    status: str
    record_state: str
    representative_id: str
    representative_name: str
    industry: str
    customer_type: str
    product_category: str
    lead_score: float
    deal_size_estimate: float
    buying_probability: float
    risk_score: float
    priority: str = ""
    remarks: str = ""
    source: str = ""
    territory: str = ""
    external_system: str = ""
    is_duplicate: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LeadStatusUpdate(BaseModel):
    status: str
    remarks: str = ""


class LeadListResponse(BaseModel):
    total: int
    items: list[LeadOut]


class NextBestActionOut(BaseModel):
    action: str
    reasoning: str
    urgency: str
