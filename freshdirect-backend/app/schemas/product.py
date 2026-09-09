from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime


class CategoryCreate(BaseModel):
    name: str
    emoji: Optional[str] = None
    image_url: Optional[str] = None
    color: Optional[str] = None
    sort_order: int = 0


class CategoryOut(BaseModel):
    id: str
    name: str
    slug: str
    emoji: Optional[str] = None
    image_url: Optional[str] = None
    color: Optional[str] = None
    product_count: int = 0

    model_config = {"from_attributes": True}


class ProductImageOut(BaseModel):
    id: str
    url: str
    sort_order: int

    model_config = {"from_attributes": True}


class ProductCreate(BaseModel):
    name: str
    category_id: Optional[str] = None
    description: Optional[str] = None
    price: float
    original_price: Optional[float] = None
    unit: str = "1 piece"
    stock: int = 0
    is_organic: bool = False
    is_featured: bool = False
    badge: Optional[str] = None
    badge_color: Optional[str] = None
    primary_image_url: Optional[str] = None
    origin: Optional[str] = None
    health_benefits: Optional[str] = None
    minerals: Optional[dict] = None
    vitamins: Optional[dict] = None
    storage_tips: Optional[list] = None
    preparation_tips: Optional[list] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    original_price: Optional[float] = None
    unit: Optional[str] = None
    stock: Optional[int] = None
    is_organic: Optional[bool] = None
    is_featured: Optional[bool] = None
    badge: Optional[str] = None
    badge_color: Optional[str] = None
    is_active: Optional[bool] = None
    primary_image_url: Optional[str] = None
    origin: Optional[str] = None
    health_benefits: Optional[str] = None
    minerals: Optional[dict] = None
    vitamins: Optional[dict] = None
    storage_tips: Optional[list] = None
    preparation_tips: Optional[list] = None


class ProductOut(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    price: float
    original_price: Optional[float] = None
    unit: str
    stock: int
    is_organic: bool
    is_featured: bool
    badge: Optional[str] = None
    badge_color: Optional[str] = None
    primary_image_url: Optional[str] = None
    origin: Optional[str] = None
    health_benefits: Optional[str] = None
    minerals: Optional[dict] = None
    vitamins: Optional[dict] = None
    storage_tips: Optional[list] = None
    preparation_tips: Optional[list] = None
    category: Optional[CategoryOut] = None
    images: List[ProductImageOut] = []
    created_at: datetime

    model_config = {"from_attributes": True}
