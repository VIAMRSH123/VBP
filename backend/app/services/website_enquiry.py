"""Website enquiries -> lead fields.

The website already sends structured data, so the normal path hands the pipeline fields directly
(`to_lead_fields`) instead of parsing text. `compose_lead_message` writes the same enquiry as the
key:value text a rep would send on WhatsApp: it is stored as the lead's raw record, and a manual
replay from the dead-letter queue re-parses it — so every visitor-supplied string is cleaned
until it cannot form a key:value pair or trigger a status update.
"""
import re

from app.schemas.webhook import WebsiteEnquiry

# Phrases the extractor treats as commands rather than content.
_NEUTRALISE = (
    (re.compile(r"lead\s*id", re.IGNORECASE), "lead ref"),
    (re.compile(r"status\s*update", re.IGNORECASE), "status note"),
)


def clean(value: str) -> str:
    """One line, no colons, nothing the extractor reads as an instruction."""
    text = re.sub(r"\s+", " ", value).replace(":", " -").strip()
    for pattern, replacement in _NEUTRALISE:
        text = pattern.sub(replacement, text)
    return text


def _basket_lines(enquiry: WebsiteEnquiry) -> list[str]:
    return [
        f"{item.quantity} x {clean(item.name)}" + (f" ({clean(item.pack_size)})" if item.pack_size else "")
        for item in enquiry.items
    ]


def _remarks(enquiry: WebsiteEnquiry) -> str:
    parts = [f"Website enquiry · {enquiry.business_type}"]
    if enquiry.country:
        parts.append(clean(enquiry.country))
    basket = _basket_lines(enquiry)
    if basket:
        parts.append("Basket - " + "; ".join(basket))
    parts.append(clean(enquiry.message))
    return " · ".join(parts)


def _primary_product(enquiry: WebsiteEnquiry) -> tuple[str, int | None]:
    if enquiry.items:
        first = enquiry.items[0]
        return clean(first.name), first.quantity
    return clean(enquiry.interest) or "Not specified", None


def to_lead_fields(enquiry: WebsiteEnquiry) -> dict:
    """The extractor's output shape, built from structured input. Never a status update."""
    product, quantity = _primary_product(enquiry)
    phone = clean(enquiry.phone) or None
    email = enquiry.email.strip()
    return {
        "message_type": "new_lead",
        "lead_id_reference": None,
        "company": clean(enquiry.company),
        "contact_name": clean(enquiry.name),
        "phone": phone,
        "email": email,
        "product": product,
        "quantity": quantity,
        "status": None,
        "remarks": _remarks(enquiry),
        "missing_fields": [],
        "confidence": 1.0,
    }


def compose_lead_message(enquiry: WebsiteEnquiry) -> str:
    """The same enquiry as rep-style key:value text — the stored raw record."""
    fields = to_lead_fields(enquiry)
    lines = [
        f"Company: {fields['company']}",
        f"Contact: {fields['contact_name']}",
    ]
    if fields["phone"]:
        lines.append(f"Phone: {fields['phone']}")
    lines.append(f"Email: {fields['email']}")
    lines.append(f"Product: {fields['product']}")
    if fields["quantity"]:
        lines.append(f"Quantity: {fields['quantity']}")
    lines.append(f"Remarks: {fields['remarks']}")
    return "\n".join(lines)
