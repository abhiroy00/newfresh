from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.models.order import OrderStatus, PaymentStatus, PaymentMethod


class OrderItemOut(BaseModel):
    id: str
    product_id: Optional[str] = None
    product_name: str
    product_image_url: Optional[str] = None
    product_unit: str
    quantity: int
    unit_price: float
    total_price: float

    model_config = {"from_attributes": True}


class OrderCreate(BaseModel):
    address_id: str
    payment_method: PaymentMethod = PaymentMethod.UPI
    notes: Optional[str] = None


class OrderOut(BaseModel):
    id: str
    order_number: str
    status: OrderStatus
    payment_status: PaymentStatus
    payment_method: Optional[PaymentMethod] = None
    subtotal: float
    delivery_fee: float
    discount: float
    total: float
    notes: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    items: List[OrderItemOut] = []
    estimated_delivery_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    estimated_delivery_at: Optional[datetime] = None
    driver_id: Optional[str] = None


class OrderCancelRequest(BaseModel):
    reason: Optional[str] = "Customer requested cancellation"
