from sqlalchemy import Float, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import TimestampMixin, new_uuid


class Warehouse(Base, TimestampMixin):
    __tablename__ = "warehouses"
    __table_args__ = (UniqueConstraint("external_system", "code", name="uq_warehouse_code"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    external_system: Mapped[str] = mapped_column(String(30), default="sap_b1")
    code: Mapped[str] = mapped_column(String(40))
    name: Mapped[str] = mapped_column(String(200), default="")
    city: Mapped[str] = mapped_column(String(120), default="")
    capacity: Mapped[float | None] = mapped_column(Float, nullable=True)  # from an SAP user-defined field


class StockLevel(Base, TimestampMixin):
    """Latest stock snapshot per warehouse and item (SAP `ItemWarehouseInfoCollection`)."""

    __tablename__ = "stock_levels"
    __table_args__ = (UniqueConstraint("external_system", "warehouse_code", "item_code", name="uq_stock_level"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    external_system: Mapped[str] = mapped_column(String(30), default="sap_b1")
    warehouse_code: Mapped[str] = mapped_column(String(40), index=True)
    item_code: Mapped[str] = mapped_column(String(60))
    item_name: Mapped[str] = mapped_column(String(200), default="")
    item_group: Mapped[str] = mapped_column(String(120), default="")
    in_stock: Mapped[float] = mapped_column(Float, default=0.0)
    committed: Mapped[float] = mapped_column(Float, default=0.0)
    ordered: Mapped[float] = mapped_column(Float, default=0.0)
    min_stock: Mapped[float] = mapped_column(Float, default=0.0)
    synced_at: Mapped[str] = mapped_column(String(40), default="")


class StockMovement(Base, TimestampMixin):
    """Delivery notes (out) and goods-receipt POs (in), one row per document line."""

    __tablename__ = "stock_movements"
    __table_args__ = (
        UniqueConstraint("external_system", "doc_type", "doc_entry", "line_num", name="uq_stock_movement"),
        Index("ix_stock_movements_date", "doc_date"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    external_system: Mapped[str] = mapped_column(String(30), default="sap_b1")
    doc_type: Mapped[str] = mapped_column(String(20))  # delivery | goods_receipt
    doc_entry: Mapped[int] = mapped_column(Integer)
    line_num: Mapped[int] = mapped_column(Integer, default=0)
    doc_num: Mapped[int] = mapped_column(Integer, default=0)
    doc_date: Mapped[str] = mapped_column(String(20), default="")  # YYYY-MM-DD
    warehouse_code: Mapped[str] = mapped_column(String(40), index=True)
    item_code: Mapped[str] = mapped_column(String(60), default="")
    item_name: Mapped[str] = mapped_column(String(200), default="")
    quantity: Mapped[float] = mapped_column(Float, default=0.0)
    direction: Mapped[str] = mapped_column(String(4))  # in | out
    counterparty: Mapped[str] = mapped_column(String(200), default="")
