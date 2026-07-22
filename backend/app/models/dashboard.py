from sqlalchemy import String, Float
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import TimestampMixin, new_uuid


class DashboardMetric(Base, TimestampMixin):
    """Gold-layer KPI aggregate snapshot, refreshed by the scheduler / pipeline."""

    __tablename__ = "dashboard_metrics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    metric_key: Mapped[str] = mapped_column(String(120), index=True)
    dimension: Mapped[str] = mapped_column(String(120), default="")  # e.g. representative, region, product
    metric_value: Mapped[float] = mapped_column(Float, default=0.0)
    period: Mapped[str] = mapped_column(String(40), default="all_time")  # daily, weekly, monthly, all_time
