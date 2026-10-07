"""Pure SAP Business One -> app mapping functions (no database access).

Field names follow the public Service Layer documentation and are read defensively with `.get()`
because user-defined fields and versions differ per installation.
"""
import hashlib
import json
import re
from dataclasses import dataclass, field
from datetime import date, datetime, timezone

PIPELINE_STATUSES = (
    "New",
    "Assigned",
    "Contacted",
    "Qualified",
    "Quote Requested",
    "Quote Sent",
    "Negotiation",
    "Awaiting Customer",
    "Won",
    "Lost",
    "Archived",
)

# Keyword -> app status for an open opportunity's stage name (first match wins, in this order).
DEFAULT_STAGE_KEYWORDS: tuple[tuple[tuple[str, ...], str], ...] = (
    (("negot", "decision", "closing", "contract"), "Negotiation"),
    (("quot", "proposal", "bid", "offer"), "Quote Requested"),
    (("qualif", "need", "discover"), "Qualified"),
    (("contact", "call", "meet", "demo", "visit"), "Contacted"),
    (("lead", "new", "prospect", "enquiry", "inquiry"), "New"),
)


# --- generic helpers -------------------------------------------------------------------------


def content_hash(payload) -> str:
    return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()


def to_float(value, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def parse_sap_date(value) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def sap_timestamp(update_date, update_time=None) -> str:
    """SAP stores date and time separately and without a zone; treat it as UTC like the rest of the app."""
    parsed = parse_sap_date(update_date)
    if parsed is None:
        return ""
    clock = str(update_time or "00:00:00")[:8]
    if not re.fullmatch(r"\d{2}:\d{2}(:\d{2})?", clock):
        clock = "00:00:00"
    if len(clock) == 5:
        clock += ":00"
    return f"{parsed.isoformat()}T{clock}+00:00"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_phone(raw: str | None, default_country_code: str = "91") -> str:
    """SAP phones are free text. Return E.164-ish (`+<cc><number>`), or "" when there is no usable number."""
    if not raw:
        return ""
    text = str(raw).strip()
    digits = re.sub(r"\D", "", text)
    if not digits:
        return ""
    if text.startswith("+"):
        return "+" + digits
    if text.startswith("00"):
        return "+" + digits[2:]
    digits = digits.lstrip("0")  # national trunk prefix, e.g. 040-2355... -> 40-2355...
    if len(digits) == 10:
        return f"+{default_country_code}{digits}"
    if digits.startswith(default_country_code) and len(digits) > 10:
        return "+" + digits
    return f"+{default_country_code}{digits}" if digits else ""


def parse_stage_map(raw: str | None) -> dict[str, str]:
    """`Configuration.sap_stage_map` is JSON like {"Proposal": "Quote Requested", "3": "Qualified"}."""
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    return {str(k).strip().lower(): v for k, v in parsed.items() if v in PIPELINE_STATUSES}


# --- lead derivation -------------------------------------------------------------------------


@dataclass
class SapLinkedDocs:
    """Quotation/order summaries (rows of `sap_documents`) already resolved for one opportunity."""

    quotations: list[dict] = field(default_factory=list)
    orders: list[dict] = field(default_factory=list)

    @property
    def live_orders(self) -> list[dict]:
        return [d for d in self.orders if not d.get("cancelled")]

    @property
    def live_quotations(self) -> list[dict]:
        return [d for d in self.quotations if not d.get("cancelled")]


@dataclass
class SapLeadRecord:
    external_id: str  # "opp:<SequentialNo>" or "bp:<CardCode>"
    status: str
    card_code: str
    sales_person_code: int | None
    fields: dict  # same shape the old extraction produced: company, contact_name, phone, ...
    territory: str = ""
    industry: str = ""
    product_category: str = ""
    deal_value: float = 0.0
    buying_probability: float = 0.0
    is_existing_customer: bool = False
    refs: dict = field(default_factory=dict)
    last_activity_at: str = ""
    created_at: date | None = None
    record_hash: str = ""


def linked_document_numbers(opportunity: dict) -> tuple[list[int], list[int]]:
    """(quotation DocEntries, order DocEntries) referenced from the opportunity's stage lines."""
    quotes: list[int] = []
    orders: list[int] = []
    for line in opportunity.get("SalesOpportunitiesLines") or []:
        number, kind = line.get("DocumentNumber"), str(line.get("DocumentType") or "").lower()
        if number in (None, "", 0):
            continue
        if "quot" in kind:
            quotes.append(int(number))
        elif "order" in kind:
            orders.append(int(number))
    return quotes, orders


def _stage_percent(opportunity: dict, stage_percentages: dict[str, float]) -> float:
    explicit = opportunity.get("ClosingPercentage")
    if explicit not in (None, ""):
        return to_float(explicit)
    lines = opportunity.get("SalesOpportunitiesLines") or []
    if lines:
        return to_float(lines[-1].get("PercentageRate"))
    return stage_percentages.get(str(opportunity.get("CurrentStageNo")), 0.0)


def _status_from_stage(stage_name: str, percent: float, stage_no, stage_map: dict[str, str]) -> str:
    for key in (str(stage_name).strip().lower(), str(stage_no).strip().lower()):
        if key and key in stage_map:
            return stage_map[key]
    lowered = str(stage_name).lower()
    for keywords, status in DEFAULT_STAGE_KEYWORDS:
        if any(word in lowered for word in keywords):
            return status
    if percent <= 10:
        return "New"
    if percent <= 25:
        return "Contacted"
    if percent <= 50:
        return "Qualified"
    return "Negotiation"


def derive_status(
    opportunity: dict,
    docs: SapLinkedDocs,
    *,
    stage_name: str,
    percent: float,
    stage_map: dict[str, str],
    today: date,
    order_means_won: bool = True,
) -> str:
    status = str(opportunity.get("Status") or "")
    if status == "sos_Sold":
        return "Won"
    if status == "sos_Missed":
        return "Lost"
    if status and status != "sos_Open":
        return "Archived"  # closed some other way
    if docs.live_orders and order_means_won:
        return "Won"

    open_quotes = [q for q in docs.live_quotations if q.get("doc_status") != "bost_Close"]
    if open_quotes:
        if percent >= 50:
            return "Negotiation"
        due = parse_sap_date(max(q.get("doc_due_date") or "" for q in open_quotes))
        if due is not None and due < today:
            return "Awaiting Customer"
        return "Quote Sent"

    derived = _status_from_stage(stage_name, percent, opportunity.get("CurrentStageNo"), stage_map)
    if derived == "New" and (opportunity.get("SalesPerson") or -1) > 0:
        return "Assigned"
    return derived


def derive_opportunity_record(
    opportunity: dict,
    partner: dict | None,
    docs: SapLinkedDocs,
    *,
    stage_name: str,
    stage_percentages: dict[str, float],
    stage_map: dict[str, str],
    territory_name: str,
    industry_name: str,
    is_existing_customer: bool,
    today: date,
    default_country_code: str = "91",
    order_means_won: bool = True,
) -> SapLeadRecord:
    partner = partner or {}
    percent = _stage_percent(opportunity, stage_percentages)
    status = derive_status(
        opportunity,
        docs,
        stage_name=stage_name,
        percent=percent,
        stage_map=stage_map,
        today=today,
        order_means_won=order_means_won,
    )

    primary_doc = (docs.live_orders or docs.live_quotations or [None])[-1]
    if status == "Won" and docs.live_orders:
        deal_value = sum(d["doc_total"] - d.get("vat_sum", 0.0) for d in docs.live_orders)
    else:
        deal_value = to_float(opportunity.get("MaxLocalTotal")) or to_float(opportunity.get("WeightedSumLC"))

    product = (primary_doc or {}).get("top_item_name") or opportunity.get("OpportunityName") or ""
    quantity = int((primary_doc or {}).get("quantity_total") or 0) or None
    company = partner.get("company") or opportunity.get("CustomerName") or opportunity.get("CardCode") or ""
    contact = partner.get("contact_name") or opportunity.get("ContactPerson") or ""
    phone = partner.get("phone") or ""
    email = partner.get("email") or ""

    missing = [name for name, value in (("company", company), ("contact_name", contact), ("phone", phone), ("product", product)) if not value]
    fields = {
        "message_type": "new_lead",
        "company": company,
        "contact_name": contact,
        "phone": phone,
        "email": email,
        "product": product,
        "quantity": quantity,
        "remarks": opportunity.get("Remarks") or "",
        "missing_fields": missing,
        "confidence": 1.0,
    }
    refs = {
        "opportunity_no": opportunity.get("SequentialNo"),
        "opportunity_name": opportunity.get("OpportunityName"),
        "stage": stage_name,
        "stage_percent": percent,
        "sap_status": opportunity.get("Status"),
        "quotations": [{"doc_entry": d["doc_entry"], "doc_num": d.get("doc_num")} for d in docs.quotations],
        "orders": [{"doc_entry": d["doc_entry"], "doc_num": d.get("doc_num")} for d in docs.orders],
        "currency": (primary_doc or {}).get("currency") or partner.get("currency") or "",
    }
    sales_person = opportunity.get("SalesPerson")
    record = SapLeadRecord(
        external_id=f"opp:{opportunity['SequentialNo']}",
        status=status,
        card_code=opportunity.get("CardCode") or "",
        sales_person_code=int(sales_person) if sales_person not in (None, "", -1) else None,
        fields=fields,
        territory=territory_name,
        industry=industry_name,
        product_category=(primary_doc or {}).get("top_item_group") or "",
        deal_value=round(deal_value, 2),
        buying_probability=percent,
        is_existing_customer=is_existing_customer,
        refs=refs,
        last_activity_at=sap_timestamp(opportunity.get("UpdateDate"), opportunity.get("UpdateTime")),
        created_at=parse_sap_date(opportunity.get("StartDate")),
    )
    record.record_hash = content_hash(
        {"fields": fields, "status": status, "territory": territory_name, "industry": industry_name, "deal": record.deal_value, "refs": refs, "rep": record.sales_person_code}
    )
    return record


def derive_partner_lead_record(partner_row: dict, partner: dict, *, territory_name: str, industry_name: str) -> SapLeadRecord:
    """A Business Partner of type 'Lead' (cLid) that has no sales opportunity yet."""
    company = partner.get("company") or partner_row.get("CardName") or partner_row.get("CardCode") or ""
    contact = partner.get("contact_name") or ""
    phone = partner.get("phone") or ""
    missing = [name for name, value in (("company", company), ("contact_name", contact), ("phone", phone)) if not value]
    sales_person = partner_row.get("SalesPersonCode")
    code = int(sales_person) if sales_person not in (None, "", -1) else None
    fields = {
        "message_type": "new_lead",
        "company": company,
        "contact_name": contact,
        "phone": phone,
        "email": partner.get("email") or "",
        "product": "",
        "quantity": None,
        "remarks": "",
        "missing_fields": missing,
        "confidence": 1.0,
    }
    record = SapLeadRecord(
        external_id=f"bp:{partner_row['CardCode']}",
        status="Assigned" if code else "New",
        card_code=partner_row["CardCode"],
        sales_person_code=code,
        fields=fields,
        territory=territory_name,
        industry=industry_name,
        refs={"card_code": partner_row["CardCode"], "sap_status": "lead"},
        last_activity_at=sap_timestamp(partner_row.get("UpdateDate")),
    )
    record.record_hash = content_hash({"fields": fields, "status": record.status, "territory": territory_name, "rep": code})
    return record
