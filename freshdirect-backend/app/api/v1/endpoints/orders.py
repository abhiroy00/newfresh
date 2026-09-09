import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.api.v1.deps import get_current_user, get_current_admin
from app.models.user import User
from app.schemas.order import OrderCreate, OrderStatusUpdate, OrderCancelRequest
from app.services.order_service import create_order, list_orders, cancel_order
from app.models.order import Order, OrderStatus
from datetime import datetime, timezone

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.post("", status_code=201)
async def api_create_order(payload: OrderCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    order = await create_order(current_user.id, payload, db)

    # Re-fetch with eagerly-loaded items to avoid MissingGreenlet errors when
    # FastAPI JSON-serializes the response in the async context.
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order.id)
    )
    order_loaded = result.scalar_one()

    address = None
    if order_loaded.delivery_address_snapshot:
        try:
            address = json.loads(order_loaded.delivery_address_snapshot)
        except Exception:
            pass

    return {
        "success": True,
        "data": {
            "id": order_loaded.id,
            "order_number": order_loaded.order_number,
            "status": order_loaded.status.value if hasattr(order_loaded.status, "value") else order_loaded.status,
            "payment_status": order_loaded.payment_status.value if hasattr(order_loaded.payment_status, "value") else order_loaded.payment_status,
            "payment_method": order_loaded.payment_method.value if hasattr(order_loaded.payment_method, "value") else order_loaded.payment_method,
            "subtotal": order_loaded.subtotal,
            "delivery_fee": order_loaded.delivery_fee,
            "discount": order_loaded.discount or 0.0,
            "total": order_loaded.total,
            "notes": order_loaded.notes,
            "razorpay_order_id": order_loaded.razorpay_order_id,
            "estimated_delivery_at": order_loaded.estimated_delivery_at.isoformat() if order_loaded.estimated_delivery_at else None,
            "delivered_at": order_loaded.delivered_at.isoformat() if order_loaded.delivered_at else None,
            "cancelled_at": order_loaded.cancelled_at.isoformat() if order_loaded.cancelled_at else None,
            "cancellation_reason": order_loaded.cancellation_reason,
            "created_at": order_loaded.created_at.isoformat() if order_loaded.created_at else None,
            "address": address,
            "items": [
                {
                    "id": i.id,
                    "product_name": i.product_name,
                    "product_image_url": i.product_image_url,
                    "product_unit": i.product_unit,
                    "quantity": i.quantity,
                    "unit_price": i.unit_price,
                    "total_price": i.total_price,
                }
                for i in order_loaded.items
            ],
        },
    }

@router.get("")
async def api_list_orders(page: int = Query(1, ge=1), per_page: int = Query(10, ge=1, le=50), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    orders = await list_orders(current_user.id, db, page=page, per_page=per_page)
    return {"success": True, "data": orders}

@router.get("/{order_id}")
async def api_get_order(order_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id, Order.user_id == current_user.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")

    address = None
    if order.delivery_address_snapshot:
        try:
            address = json.loads(order.delivery_address_snapshot)
        except Exception:
            pass

    rider = None
    if order.rider_id:
        r = await db.execute(select(User).where(User.id == order.rider_id))
        rider_user = r.scalar_one_or_none()
        if rider_user:
            rider = {"id": rider_user.id, "name": rider_user.name, "phone": rider_user.phone}

    return {
        "success": True,
        "data": {
            "id": order.id,
            "order_number": order.order_number,
            "status": order.status.value if hasattr(order.status, "value") else order.status,
            "payment_status": order.payment_status.value if hasattr(order.payment_status, "value") else order.payment_status,
            "payment_method": order.payment_method.value if hasattr(order.payment_method, "value") else order.payment_method,
            "subtotal": order.subtotal,
            "delivery_fee": order.delivery_fee,
            "discount": order.discount,
            "total": order.total,
            "notes": order.notes,
            "estimated_delivery_at": order.estimated_delivery_at.isoformat() if order.estimated_delivery_at else None,
            "delivered_at": order.delivered_at.isoformat() if order.delivered_at else None,
            "cancelled_at": order.cancelled_at.isoformat() if order.cancelled_at else None,
            "cancellation_reason": order.cancellation_reason,
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "address": address,
            "rider": rider,
            "items": [
                {
                    "id": i.id,
                    "product_name": i.product_name,
                    "product_image_url": i.product_image_url,
                    "product_unit": i.product_unit,
                    "quantity": i.quantity,
                    "unit_price": i.unit_price,
                    "total_price": i.total_price,
                }
                for i in order.items
            ],
        },
    }

@router.post("/{order_id}/cancel")
async def api_cancel_order(order_id: str, payload: OrderCancelRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    order = await cancel_order(order_id, current_user.id, payload.reason, db)
    return {"success": True, "data": order}

@router.patch("/{order_id}/status")
async def api_update_order_status(order_id: str, payload: OrderStatusUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    order.status = payload.status
    if payload.estimated_delivery_at:
        order.estimated_delivery_at = payload.estimated_delivery_at
    if payload.status == OrderStatus.DELIVERED:
        order.delivered_at = datetime.now(timezone.utc)
    await db.flush()
    return {"success": True, "data": order}
