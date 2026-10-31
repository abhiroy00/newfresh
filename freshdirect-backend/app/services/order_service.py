import json
import random
import string
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

from app.models.order import Order, OrderItem, OrderStatus
from app.models.user import Address
from app.models.product import Product
from app.schemas.order import OrderCreate
from app.services.cart_service import get_or_create_cart, clear_cart, _purge_unavailable
from app.core.config import settings


def _gen_order_number() -> str:
    # 8 digits = 100M combinations; 4 digits ran out fast and the
    # uniqueness retry loop would spin as orders accumulate
    suffix = ''.join(random.choices(string.digits, k=8))
    return f"FD-{suffix}"


async def create_order(user_id: str, payload: OrderCreate, db: AsyncSession) -> Order:
    # Validate address belongs to user
    addr_result = await db.execute(
        select(Address).where(Address.id == payload.address_id, Address.user_id == user_id)
    )
    address = addr_result.scalar_one_or_none()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    # Get cart
    cart = await get_or_create_cart(user_id, db)

    # Deactivated products must not block the whole order. Remove them and
    # commit *before* raising — get_db rolls back on exceptions, which would
    # otherwise undo the removal and leave the customer stuck on retry.
    removed = await _purge_unavailable(cart, db)
    if removed:
        await db.commit()
        names = ", ".join(f"'{n}'" for n in removed)
        raise HTTPException(
            status_code=400,
            detail=f"{names} {'is' if len(removed) == 1 else 'are'} no longer available and "
                   f"{'has' if len(removed) == 1 else 'have'} been removed from your cart. "
                   "Please review your cart total and place the order again.",
        )

    if not cart.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Validate stock and compute totals
    order_items = []
    subtotal = 0.0
    for item in cart.items:
        prod_result = await db.execute(
            select(Product).where(Product.id == item.product_id, Product.is_active)
        )
        product = prod_result.scalar_one_or_none()
        if not product:
            # Only reachable if a product was deactivated mid-request (the purge
            # above handles the normal case). Name it rather than the raw UUID.
            name = item.product.name if item.product is not None else "An item in your cart"
            raise HTTPException(
                status_code=400,
                detail=f"'{name}' is no longer available. Please remove it from your cart and try again.",
            )
        if product.stock < item.quantity:
            raise HTTPException(status_code=400, detail=f"'{product.name}' only has {product.stock} units left")

        item_total = product.price * item.quantity
        subtotal += item_total
        order_items.append({
            "product": product,
            "quantity": item.quantity,
            "unit_price": product.price,
            "total_price": item_total,
        })

    delivery_fee = 0.0 if subtotal >= settings.FREE_DELIVERY_THRESHOLD else settings.DELIVERY_FEE
    total = subtotal + delivery_fee

    # Address snapshot
    address_snapshot = json.dumps({
        "full_name": address.full_name, "phone": address.phone,
        "line1": address.line1, "line2": address.line2,
        "city": address.city, "state": address.state, "pincode": address.pincode,
        "landmark": address.landmark,
    })

    # Generate unique order number
    while True:
        order_number = _gen_order_number()
        existing = await db.execute(select(Order).where(Order.order_number == order_number))
        if not existing.scalar_one_or_none():
            break

    order = Order(
        order_number=order_number,
        user_id=user_id,
        address_id=payload.address_id,
        delivery_address_snapshot=address_snapshot,
        payment_method=payload.payment_method,
        subtotal=subtotal,
        delivery_fee=delivery_fee,
        total=total,
        notes=payload.notes,
        estimated_delivery_at=datetime.now(timezone.utc) + timedelta(hours=4),
    )
    db.add(order)
    await db.flush()

    # Create order items and decrement stock
    for oi in order_items:
        db.add(OrderItem(
            order_id=order.id,
            product_id=oi["product"].id,
            product_name=oi["product"].name,
            product_image_url=oi["product"].primary_image_url,
            product_unit=oi["product"].unit,
            quantity=oi["quantity"],
            unit_price=oi["unit_price"],
            total_price=oi["total_price"],
        ))
        oi["product"].stock -= oi["quantity"]

    await clear_cart(user_id, db)
    await db.flush()
    return order


async def list_orders(user_id: str, db: AsyncSession, page: int = 1, per_page: int = 10):
    query = (
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.user_id == user_id)
        .order_by(Order.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    result = await db.execute(query)
    return result.scalars().all()


async def get_order(order_id: str, user_id: str, db: AsyncSession) -> Order:
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id, Order.user_id == user_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


async def cancel_order(order_id: str, user_id: str, reason: str, db: AsyncSession) -> Order:
    order = await get_order(order_id, user_id, db)
    if order.status not in [OrderStatus.PENDING, OrderStatus.CONFIRMED]:
        raise HTTPException(status_code=400, detail="Order cannot be cancelled at this stage")
    order.status = OrderStatus.CANCELLED
    order.cancelled_at = datetime.now(timezone.utc)
    order.cancellation_reason = reason
    # Restock items
    for item in order.items:
        if item.product_id:
            prod = await db.get(Product, item.product_id)
            if prod:
                prod.stock += item.quantity
    await db.flush()
    return order
