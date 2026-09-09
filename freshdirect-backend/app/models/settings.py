import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, JSON, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class AppSettings(Base):
    """PHASE 3: Platform configuration settings"""
    __tablename__ = "app_settings"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # App Configuration
    app_name: Mapped[str] = mapped_column(String(100), default="Gmart")
    app_logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    support_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    support_whatsapp: Mapped[str | None] = mapped_column(String(20), nullable=True)
    support_email: Mapped[str | None] = mapped_column(String(100), nullable=True)
    default_currency: Mapped[str] = mapped_column(String(3), default="INR")

    # Payment Gateway Configuration
    razorpay_key_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    razorpay_key_secret: Mapped[str | None] = mapped_column(String(255), nullable=True)
    payment_methods_enabled: Mapped[dict] = mapped_column(
        JSON,
        default={"upi": True, "card": True, "netbanking": True, "cod": False}
    )

    # Tax Configuration (GST rates by category)
    gst_config: Mapped[dict] = mapped_column(
        JSON,
        default={
            "groceries": 5,
            "organic": 0,
            "bakery": 5,
            "dairy": 0,
            "fruits": 0,
            "vegetables": 0,
            "default": 5,
        }
    )

    # Delivery Configuration
    min_order_value: Mapped[float] = mapped_column(Float, default=199.0)
    free_delivery_above: Mapped[float] = mapped_column(Float, default=499.0)
    base_delivery_fee: Mapped[float] = mapped_column(Float, default=49.0)

    # App Store Links
    app_store_link: Mapped[str | None] = mapped_column(Text, nullable=True)
    play_store_link: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<AppSettings app={self.app_name}>"


class DeliveryZone(Base):
    """PHASE 3: Configurable delivery zones"""
    __tablename__ = "delivery_zones"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Geographic boundaries (for simplicity, storing as JSON)
    # Format: {"pincodes": ["560001", "560002"], "coordinates": {"lat": 13.0, "lng": 77.6, "radius_km": 5}}
    coverage: Mapped[dict] = mapped_column(JSON, nullable=False)

    delivery_fee: Mapped[float] = mapped_column(Float, default=49.0)
    free_delivery_above: Mapped[float] = mapped_column(Float, default=499.0)
    estimated_delivery_time_minutes: Mapped[int] = mapped_column(default=30)
    is_active: Mapped[bool] = mapped_column(default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    def __repr__(self) -> str:
        return f"<DeliveryZone id={self.id} name={self.name}>"
