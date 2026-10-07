from sqlalchemy import String, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import TimestampMixin, new_uuid


class Manager(Base, TimestampMixin):
    __tablename__ = "managers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(200))
    phone: Mapped[str] = mapped_column(String(40), default="")
    email: Mapped[str] = mapped_column(String(200), default="")
    external_system: Mapped[str] = mapped_column(String(30), default="", server_default="")
    external_id: Mapped[str] = mapped_column(String(80), default="", server_default="")


class Representative(Base, TimestampMixin):
    __tablename__ = "representatives"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    representative_code: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    territory: Mapped[str] = mapped_column(String(120), default="")
    region: Mapped[str] = mapped_column(String(120), default="")
    product_category: Mapped[str] = mapped_column(String(120), default="")
    language: Mapped[str] = mapped_column(String(60), default="English")
    manager_id: Mapped[str] = mapped_column(String(36), default="")
    manager_phone: Mapped[str] = mapped_column(String(40), default="")
    email: Mapped[str] = mapped_column(String(200), default="")
    phone: Mapped[str] = mapped_column(String(40), default="")
    workload: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    # SAP Business One link (SalesEmployeeCode). profile_source says who owns territory/category/
    # language: "csv" (the uploaded roster) or "sap_derived" (inferred from SAP activity).
    external_system: Mapped[str] = mapped_column(String(30), default="", server_default="")
    external_id: Mapped[str] = mapped_column(String(80), default="", server_default="")
    profile_source: Mapped[str] = mapped_column(String(20), default="csv", server_default="csv")


class CsvRepMapping(Base, TimestampMixin):
    """Audit trail of each CSV upload batch used to build the representative lookup table."""

    __tablename__ = "csv_rep_mapping"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    filename: Mapped[str] = mapped_column(String(300), default="")
    row_count: Mapped[int] = mapped_column(Integer, default=0)
    valid_rows: Mapped[int] = mapped_column(Integer, default=0)
    invalid_rows: Mapped[int] = mapped_column(Integer, default=0)
    uploaded_by: Mapped[str] = mapped_column(String(120), default="")
    errors: Mapped[str] = mapped_column(String(2000), default="")
