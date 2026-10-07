from sqlalchemy import Index, String, Integer, Float, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import TimestampMixin, new_uuid


class Customer(Base, TimestampMixin):
    __tablename__ = "customers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    company: Mapped[str] = mapped_column(String(300), index=True)
    contact_name: Mapped[str] = mapped_column(String(200), default="")
    phone: Mapped[str] = mapped_column(String(40), default="", index=True)
    email: Mapped[str] = mapped_column(String(200), default="")
    industry: Mapped[str] = mapped_column(String(120), default="")
    customer_type: Mapped[str] = mapped_column(String(60), default="")  # New / Existing
    territory: Mapped[str] = mapped_column(String(120), default="")

    # SAP Business One link (CardCode). Empty for customers that did not come from SAP.
    external_system: Mapped[str] = mapped_column(String(30), default="", server_default="")
    external_id: Mapped[str] = mapped_column(String(80), default="", server_default="")
    card_type: Mapped[str] = mapped_column(String(20), default="", server_default="")
    order_count: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    last_order_date: Mapped[str] = mapped_column(String(20), default="", server_default="")

    __table_args__ = (
        Index(
            "uq_customers_external",
            "external_system",
            "external_id",
            unique=True,
            sqlite_where=text("external_id != ''"),
        ),
    )


class Product(Base, TimestampMixin):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    category: Mapped[str] = mapped_column(String(120), default="")

    # SAP Business One link (ItemCode / item group).
    external_system: Mapped[str] = mapped_column(String(30), default="", server_default="")
    item_code: Mapped[str] = mapped_column(String(60), default="", server_default="")
    item_group: Mapped[str] = mapped_column(String(120), default="", server_default="")

    __table_args__ = (
        Index(
            "uq_products_external",
            "external_system",
            "item_code",
            unique=True,
            sqlite_where=text("item_code != ''"),
        ),
    )


class Lead(Base, TimestampMixin):
    __tablename__ = "leads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    lead_number: Mapped[str] = mapped_column(String(20), unique=True, index=True)  # e.g. L-10025

    # Raw / source
    source: Mapped[str] = mapped_column(String(40), default="whatsapp")
    raw_message: Mapped[str] = mapped_column(Text, default="")
    sales_rep_phone: Mapped[str] = mapped_column(String(40), default="")

    # Core fields (Part 2 validation rules)
    company: Mapped[str] = mapped_column(String(300), default="")
    contact_name: Mapped[str] = mapped_column(String(200), default="")
    phone: Mapped[str] = mapped_column(String(40), default="")
    email: Mapped[str] = mapped_column(String(200), default="")
    product: Mapped[str] = mapped_column(String(200), default="")
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    remarks: Mapped[str] = mapped_column(Text, default="")

    customer_id: Mapped[str] = mapped_column(String(36), default="")

    # Status / lifecycle (Part 2 Phase 4)
    status: Mapped[str] = mapped_column(String(40), default="New", index=True)
    # New, Assigned, Contacted, Qualified, Quote Requested, Quote Sent,
    # Negotiation, Awaiting Customer, Won, Lost, Archived
    record_state: Mapped[str] = mapped_column(String(20), default="Draft")  # Valid, Draft, Requires Review

    # Assignment (Phase 3)
    representative_id: Mapped[str] = mapped_column(String(36), default="")
    representative_name: Mapped[str] = mapped_column(String(200), default="")
    manager_id: Mapped[str] = mapped_column(String(36), default="")
    assignment_confidence: Mapped[float] = mapped_column(Float, default=0.0)

    # Enrichment (Phase 2)
    industry: Mapped[str] = mapped_column(String(120), default="")
    customer_type: Mapped[str] = mapped_column(String(60), default="")
    product_category: Mapped[str] = mapped_column(String(120), default="")
    territory: Mapped[str] = mapped_column(String(120), default="")
    lead_score: Mapped[float] = mapped_column(Float, default=0.0)  # 0-100
    deal_size_estimate: Mapped[float] = mapped_column(Float, default=0.0)
    buying_probability: Mapped[float] = mapped_column(Float, default=0.0)
    existing_customer_flag: Mapped[bool] = mapped_column(default=False)
    priority_score: Mapped[float] = mapped_column(Float, default=0.0)
    priority: Mapped[str] = mapped_column(String(20), default="Medium")
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    enrichment_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    ai_reasoning: Mapped[str] = mapped_column(Text, default="")

    # Duplicate detection
    is_duplicate: Mapped[bool] = mapped_column(default=False)
    duplicate_of: Mapped[str] = mapped_column(String(36), default="")
    duplicate_confidence: Mapped[float] = mapped_column(Float, default=0.0)

    # SLA / reminders
    last_activity_at: Mapped[str] = mapped_column(String(40), default="")
    reminder_stage: Mapped[int] = mapped_column(Integer, default=0)  # 0=none,1=24h,2=48h,3=72h escalated

    extraction_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    missing_fields: Mapped[str] = mapped_column(Text, default="")  # comma separated

    # External system link. Today only SAP Business One: external_id is "opp:<SequentialNo>" or
    # "bp:<CardCode>"; sap_refs is a JSON blob of related SAP document numbers and the stage.
    external_system: Mapped[str] = mapped_column(String(30), default="", server_default="")
    external_id: Mapped[str] = mapped_column(String(80), default="", server_default="")
    sap_card_code: Mapped[str] = mapped_column(String(40), default="", server_default="")
    sap_refs: Mapped[str] = mapped_column(Text, default="", server_default="")
    sap_hash: Mapped[str] = mapped_column(String(64), default="", server_default="")
    sap_synced_at: Mapped[str] = mapped_column(String(40), default="", server_default="")

    __table_args__ = (
        Index(
            "uq_leads_external",
            "external_system",
            "external_id",
            unique=True,
            sqlite_where=text("external_id != ''"),
        ),
    )
