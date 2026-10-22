from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class WhatsAppInboundMessage(BaseModel):
    """Simplified inbound WhatsApp message shape (mirrors Meta webhook essentials)."""

    from_phone: str
    message: str
    sender_name: str = ""


class WebsiteEnquiryItem(BaseModel):
    """One line of the website's enquiry basket."""

    model_config = ConfigDict(populate_by_name=True)

    slug: str = Field(pattern=r"^[a-z0-9-]{1,80}$")
    name: str = Field(min_length=1, max_length=120)
    pack_size: str = Field(default="", max_length=20, alias="packSize")
    quantity: int = Field(ge=1, le=100_000)


class WebsiteEnquiry(BaseModel):
    """The trade-enquiry form on the TFS website, posted server-to-server.

    Mirrors the zod schema in the website's `src/app/api/enquiry/route.ts`. Every field comes from
    an anonymous visitor, so nothing here is trusted beyond its shape.
    """

    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(min_length=2, max_length=120)
    company: str = Field(min_length=2, max_length=160)
    # No colons: "leadid:L-1@x.co" would read as a lead reference if the raw record is ever re-parsed.
    email: str = Field(max_length=200, pattern=r"^[^@\s:]+@[^@\s:]+\.[^@\s:]+$")
    phone: str = Field(default="", max_length=40)
    country: str = Field(default="", max_length=80)
    business_type: Literal["wholesale", "retail", "hospitality", "catering", "supplier", "other"] = Field(
        alias="businessType"
    )
    interest: str = Field(default="", max_length=80)
    message: str = Field(min_length=10, max_length=4000)
    items: list[WebsiteEnquiryItem] = Field(default_factory=list, max_length=50)
