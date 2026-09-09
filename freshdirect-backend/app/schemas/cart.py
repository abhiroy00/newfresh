from typing import List, Optional
from pydantic import BaseModel, field_validator
from app.schemas.product import ProductOut


class CartItemCreate(BaseModel):
    product_id: str
    quantity: int = 1

    @field_validator("quantity")
    @classmethod
    def qty_must_be_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Quantity must be at least 1")
        if v > 99:
            raise ValueError("Maximum 99 units per item")
        return v


class CartItemUpdate(BaseModel):
    quantity: int

    @field_validator("quantity")
    @classmethod
    def qty_must_be_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Quantity must be at least 1")
        if v > 99:
            raise ValueError("Maximum 99 units per item")
        return v


class CartItemOut(BaseModel):
    id: str
    product_id: str
    quantity: int
    price_at_add: float
    item_total: float
    product: Optional[ProductOut] = None

    model_config = {"from_attributes": True}


class CartOut(BaseModel):
    id: str
    items: List[CartItemOut] = []
    subtotal: float
    delivery_fee: float
    total: float
    item_count: int

    model_config = {"from_attributes": True}
