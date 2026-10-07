from sqlalchemy import Boolean, Float, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import TimestampMixin, new_uuid


class BronzeSapRaw(Base, TimestampMixin):
    """Bronze layer: the latest raw SAP payload per record, with a content hash so unchanged rows are skipped."""

    __tablename__ = "bronze_sap_raw"
    __table_args__ = (UniqueConstraint("external_system", "entity", "entity_key", name="uq_bronze_sap_record"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    external_system: Mapped[str] = mapped_column(String(30), default="sap_b1")
    entity: Mapped[str] = mapped_column(String(60))
    entity_key: Mapped[str] = mapped_column(String(80))
    payload: Mapped[str] = mapped_column(Text)
    content_hash: Mapped[str] = mapped_column(String(64), default="")
    source_update_date: Mapped[str] = mapped_column(String(40), default="")
    sync_run_id: Mapped[str] = mapped_column(String(36), default="")
    processed: Mapped[bool] = mapped_column(Boolean, default=False)
    lead_id: Mapped[str] = mapped_column(String(36), default="")


class SapSyncRun(Base, TimestampMixin):
    __tablename__ = "sap_sync_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    external_system: Mapped[str] = mapped_column(String(30), default="sap_b1")
    mode: Mapped[str] = mapped_column(String(20), default="incremental")  # backfill | incremental
    scope: Mapped[str] = mapped_column(String(20), default="all")  # all | stock
    status: Mapped[str] = mapped_column(String(20), default="running")  # running|success|partial|failed
    started_at: Mapped[str] = mapped_column(String(40), default="")
    ended_at: Mapped[str] = mapped_column(String(40), default="")
    counts: Mapped[str] = mapped_column(Text, default="{}")  # JSON per entity
    error_details: Mapped[str] = mapped_column(Text, default="")
    notifications_suppressed: Mapped[int] = mapped_column(Integer, default=0)
    triggered_by: Mapped[str] = mapped_column(String(120), default="scheduler")


class SapSyncState(Base, TimestampMixin):
    """Per-entity incremental cursor."""

    __tablename__ = "sap_sync_state"
    __table_args__ = (UniqueConstraint("external_system", "entity", name="uq_sap_sync_state"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    external_system: Mapped[str] = mapped_column(String(30), default="sap_b1")
    entity: Mapped[str] = mapped_column(String(60))
    cursor_date: Mapped[str] = mapped_column(String(20), default="")  # YYYY-MM-DD
    last_full_sync_at: Mapped[str] = mapped_column(String(40), default="")
    last_reconcile_at: Mapped[str] = mapped_column(String(40), default="")


class SapDocument(Base, TimestampMixin):
    """Quotations and orders, kept to link leads to real documents and deal values."""

    __tablename__ = "sap_documents"
    __table_args__ = (UniqueConstraint("external_system", "doc_type", "doc_entry", name="uq_sap_document"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    external_system: Mapped[str] = mapped_column(String(30), default="sap_b1")
    doc_type: Mapped[str] = mapped_column(String(20))  # quotation | order
    doc_entry: Mapped[int] = mapped_column(Integer)
    doc_num: Mapped[int] = mapped_column(Integer, default=0)
    card_code: Mapped[str] = mapped_column(String(40), default="", index=True)
    doc_date: Mapped[str] = mapped_column(String(20), default="")
    doc_due_date: Mapped[str] = mapped_column(String(20), default="")
    doc_total: Mapped[float] = mapped_column(Float, default=0.0)
    vat_sum: Mapped[float] = mapped_column(Float, default=0.0)
    currency: Mapped[str] = mapped_column(String(10), default="")
    doc_status: Mapped[str] = mapped_column(String(20), default="")
    cancelled: Mapped[bool] = mapped_column(Boolean, default=False)
    sales_person_code: Mapped[int] = mapped_column(Integer, default=-1)
    opportunity_no: Mapped[int] = mapped_column(Integer, default=0, index=True)
    top_item_code: Mapped[str] = mapped_column(String(60), default="")
    top_item_name: Mapped[str] = mapped_column(String(200), default="")
    top_item_group: Mapped[str] = mapped_column(String(120), default="")
    quantity_total: Mapped[float] = mapped_column(Float, default=0.0)
    update_date: Mapped[str] = mapped_column(String(20), default="")


class SapLookup(Base, TimestampMixin):
    """SAP master codes resolved to names: territories, industries, item groups, sales stages."""

    __tablename__ = "sap_lookup"
    __table_args__ = (UniqueConstraint("external_system", "kind", "code", name="uq_sap_lookup"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    external_system: Mapped[str] = mapped_column(String(30), default="sap_b1")
    kind: Mapped[str] = mapped_column(String(30))  # territory | industry | item_group | sales_stage
    code: Mapped[str] = mapped_column(String(40))
    name: Mapped[str] = mapped_column(String(200), default="")
    extra: Mapped[str] = mapped_column(String(200), default="")  # e.g. a stage's closing percentage
