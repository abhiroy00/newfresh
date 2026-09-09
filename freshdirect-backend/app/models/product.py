import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import String, Boolean, ForeignKey, DateTime, Text, Float, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.cart import CartItem
    from app.models.order import OrderItem


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)
    emoji: Mapped[str | None] = mapped_column(String(10), nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str | None] = mapped_column(String(30), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    products: Mapped[list["Product"]] = relationship("Product", back_populates="category")
    services: Mapped[list["Service"]] = relationship("Service", back_populates="category")

    def __repr__(self) -> str:
        return f"<Category id={self.id} name={self.name}>"


class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    category_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(300), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    original_price: Mapped[float | None] = mapped_column(Float, nullable=True)  # for strike-through
    unit: Mapped[str] = mapped_column(String(50), nullable=False, default="1 piece")
    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_organic: Mapped[bool] = mapped_column(Boolean, default=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    badge: Mapped[str | None] = mapped_column(String(50), nullable=True)
    badge_color: Mapped[str | None] = mapped_column(String(30), nullable=True)
    primary_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # PHASE 2: Extended fields for fruit/specialty products
    origin: Mapped[str | None] = mapped_column(String(100), nullable=True)  # e.g. "Kashmir", "Konkan"
    health_benefits: Mapped[str | None] = mapped_column(Text, nullable=True)  # Rich text description
    minerals: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # {"iron": "2.1mg", "calcium": "13mg"...}
    vitamins: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # {"vitamin_a": "81IU", "vitamin_c": "8.7mg"...}
    storage_tips: Mapped[list | None] = mapped_column(JSON, nullable=True)  # ["Store in refrigerator at 4°C", "Best before 5 days"]
    preparation_tips: Mapped[list | None] = mapped_column(JSON, nullable=True)  # ["Wash thoroughly", "Peel before use"]

    # PHASE 2: Price scheduling & history
    scheduled_price: Mapped[float | None] = mapped_column(Float, nullable=True)  # Future price
    scheduled_price_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)  # When to apply
    price_history: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)  # [{"old_price": 100, "new_price": 120, "changed_at": "2024-01-01", "changed_by": "admin_id"}]

    # PHASE 3: Stock management
    low_stock_threshold: Mapped[int] = mapped_column(Integer, default=10)  # Alert threshold

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    category: Mapped["Category"] = relationship("Category", back_populates="products")
    images: Mapped[list["ProductImage"]] = relationship(
        "ProductImage", back_populates="product", cascade="all, delete-orphan"
    )
    cart_items: Mapped[list["CartItem"]] = relationship("CartItem", back_populates="product")
    order_items: Mapped[list["OrderItem"]] = relationship("OrderItem", back_populates="product")

    def __repr__(self) -> str:
        return f"<Product id={self.id} name={self.name} price={self.price}>"


class ProductImage(Base):
    __tablename__ = "product_images"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    product_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    url: Mapped[str] = mapped_column(Text, nullable=False)
    cloudinary_public_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    product: Mapped["Product"] = relationship("Product", back_populates="images")


class Carousel(Base):
    """Carousel/banner management for home page"""
    __tablename__ = "carousels"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    subtitle: Mapped[str | None] = mapped_column(String(255), nullable=True)
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    link_type: Mapped[str] = mapped_column(String(20), default="category")  # "category", "product", "external"
    link_value: Mapped[str | None] = mapped_column(String(255), nullable=True)  # category_id, product_id, or URL
    button_text: Mapped[str | None] = mapped_column(String(50), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<Carousel id={self.id} title={self.title}>"


class Service(Base):
    """PHASE 2: Services like laundry, cleaning, etc."""
    __tablename__ = "services"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    category_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(300), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    pricing_unit: Mapped[str] = mapped_column(String(50), nullable=False)  # "per_garment", "per_kg", "per_hour"
    base_price: Mapped[float] = mapped_column(Float, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    available_slots: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)  # [{"day": "Monday", "slots": ["09:00-12:00", "14:00-17:00"]}]
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    category: Mapped["Category | None"] = relationship("Category", back_populates="services")

    def __repr__(self) -> str:
        return f"<Service id={self.id} name={self.name}>"
