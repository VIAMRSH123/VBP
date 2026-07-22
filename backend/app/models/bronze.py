from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import TimestampMixin, new_uuid


class BronzeWhatsAppRaw(Base, TimestampMixin):
    """Bronze layer: unmodified raw WhatsApp webhook payloads, per Medallion Architecture."""

    __tablename__ = "bronze_whatsapp_raw"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    sender_phone: Mapped[str] = mapped_column(String(40), default="")
    raw_payload: Mapped[str] = mapped_column(Text)
    processed: Mapped[bool] = mapped_column(default=False)
    lead_id: Mapped[str] = mapped_column(String(36), default="")


class BronzeCsvUpload(Base, TimestampMixin):
    """Bronze layer: raw CSV upload bytes/text before validation into representatives table."""

    __tablename__ = "bronze_csv_uploads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    filename: Mapped[str] = mapped_column(String(300))
    raw_content: Mapped[str] = mapped_column(Text)
    uploaded_by: Mapped[str] = mapped_column(String(120), default="")
