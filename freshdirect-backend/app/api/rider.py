"""Rider-facing API — view and update assigned orders."""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.v1.deps import get_current_rider
from app.models.user import User
from app.models.order import Order, OrderStatus

router = APIRouter(prefix="/api/v1/rider")


@router.get("/orders")
async def rider_orders(
    db: AsyncSession = Depends(get_db),
    current_rider: User = Depends(get_current_rider),
):
    """All orders assigned to the currently logged-in rider."""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.user))
        .where(Order.rider_id == current_rider.id)
        .order_by(Order.created_at.desc())
    )
    orders = result.scalars().all()

    items = []
    for o in orders:
        address = None
        if o.delivery_address_snapshot:
            try:
                address = json.loads(o.delivery_address_snapshot)
            except Exception:
                address = None

        items.append({
            "id": o.id,
            "order_number": o.order_number,
            "status": o.status.value if hasattr(o.status, "value") else o.status,
            "total": o.total,
            "delivery_fee": o.delivery_fee,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "estimated_delivery_at": o.estimated_delivery_at.isoformat() if o.estimated_delivery_at else None,
            "customer": {
                "name": o.user.name if o.user else None,
                "phone": o.user.phone if o.user else None,
            },
            "address": address,
            "items": [
                {
                    "product_name": i.product_name,
                    "product_image_url": i.product_image_url,
                    "quantity": i.quantity,
                    "unit": i.product_unit,
                    "unit_price": i.unit_price,
                    "total_price": i.total_price,
                }
                for i in o.items
            ],
        })

    return {"items": items, "total": len(items)}


@router.get("/orders/{order_id}")
async def rider_order_detail(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    current_rider: User = Depends(get_current_rider),
):
    """Single order detail — only if assigned to this rider."""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.user))
        .where(Order.id == order_id, Order.rider_id == current_rider.id)
    )
    o = result.scalar_one_or_none()
    if not o:
        raise HTTPException(404, "Order not found or not assigned to you")

    address = None
    if o.delivery_address_snapshot:
        try:
            address = json.loads(o.delivery_address_snapshot)
        except Exception:
            address = None

    return {
        "id": o.id,
        "order_number": o.order_number,
        "status": o.status.value if hasattr(o.status, "value") else o.status,
        "total": o.total,
        "delivery_fee": o.delivery_fee,
        "notes": o.notes,
        "created_at": o.created_at.isoformat() if o.created_at else None,
        "estimated_delivery_at": o.estimated_delivery_at.isoformat() if o.estimated_delivery_at else None,
        "customer": {
            "name": o.user.name if o.user else None,
            "phone": o.user.phone if o.user else None,
        },
        "address": address,
        "items": [
            {
                "product_name": i.product_name,
                "product_image_url": i.product_image_url,
                "quantity": i.quantity,
                "unit": i.product_unit,
                "unit_price": i.unit_price,
                "total_price": i.total_price,
            }
            for i in o.items
        ],
    }


@router.patch("/orders/{order_id}/status")
async def rider_update_status(
    order_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_rider: User = Depends(get_current_rider),
):
    """Rider can only set status to out_for_delivery or delivered."""
    allowed = {OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED}
    new_status = payload.get("status")

    try:
        status_enum = OrderStatus(new_status)
    except ValueError:
        raise HTTPException(400, f"Invalid status: {new_status}")

    if status_enum not in allowed:
        raise HTTPException(403, "Riders can only set out_for_delivery or delivered")

    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.rider_id == current_rider.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found or not assigned to you")

    order.status = status_enum
    if status_enum == OrderStatus.DELIVERED:
        from datetime import datetime, timezone
        order.delivered_at = datetime.now(timezone.utc)

    await db.flush()
    return {"success": True, "status": order.status.value}
