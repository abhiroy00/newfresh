from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

from app.models.cart import Cart, CartItem
from app.models.product import Product
from app.core.config import settings


async def get_or_create_cart(user_id: str, db: AsyncSession) -> Cart:
    result = await db.execute(
        select(Cart)
        .options(selectinload(Cart.items).selectinload(CartItem.product).selectinload(Product.category))
        .where(Cart.user_id == user_id)
    )
    cart = result.scalar_one_or_none()
    if not cart:
        cart = Cart(user_id=user_id)
        db.add(cart)
        await db.flush()
        # Async-safe load of the (empty) items relationship. Assigning
        # `cart.items = []` here would trigger a sync lazy-load on the now
        # persistent object and raise MissingGreenlet under asyncio.
        await db.refresh(cart, attribute_names=["items"])
    return cart


def _calculate_totals(cart: Cart) -> dict:
    subtotal = sum(item.price_at_add * item.quantity for item in cart.items)
    delivery_fee = 0.0 if subtotal >= settings.FREE_DELIVERY_THRESHOLD else settings.DELIVERY_FEE
    return {"subtotal": subtotal, "delivery_fee": delivery_fee, "total": subtotal + delivery_fee}


def _serialize_item(item: CartItem) -> dict:
    # Only touch already-loaded scalar columns. Returning ORM objects to
    # FastAPI causes infinite recursion via the Cart<->CartItem<->Product
    # back-references, and accessing un-loaded relationships (e.g.
    # product.images) would raise MissingGreenlet in async.
    p = item.product
    return {
        "id": item.id,
        "product_id": item.product_id,
        "quantity": item.quantity,
        "price_at_add": item.price_at_add,
        "item_total": round(item.price_at_add * item.quantity, 2),
        "product": {
            "id": p.id,
            "name": p.name,
            "unit": p.unit,
            "price": p.price,
            "primary_image_url": p.primary_image_url,
        } if p is not None else None,
    }


async def get_cart(user_id: str, db: AsyncSession) -> dict:
    cart = await get_or_create_cart(user_id, db)
    totals = _calculate_totals(cart)
    return {
        **totals,
        "id": cart.id,
        "items": [_serialize_item(i) for i in cart.items],
        "item_count": len(cart.items),
    }


async def add_item(user_id: str, product_id: str, quantity: int, db: AsyncSession) -> dict:
    # Validate product
    result = await db.execute(select(Product).where(Product.id == product_id, Product.is_active))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.stock < quantity:
        raise HTTPException(status_code=400, detail=f"Only {product.stock} units available")

    cart = await get_or_create_cart(user_id, db)

    # Check if item already in cart
    existing = next((i for i in cart.items if i.product_id == product_id), None)
    if existing:
        new_qty = existing.quantity + quantity
        if product.stock < new_qty:
            raise HTTPException(status_code=400, detail=f"Only {product.stock} units available")
        existing.quantity = new_qty
    else:
        item = CartItem(
            cart_id=cart.id,
            product_id=product_id,
            quantity=quantity,
            price_at_add=product.price,
        )
        db.add(item)
        cart.items.append(item)

    await db.flush()
    return await get_cart(user_id, db)


async def update_item(user_id: str, item_id: str, quantity: int, db: AsyncSession) -> dict:
    cart = await get_or_create_cart(user_id, db)
    item = next((i for i in cart.items if i.id == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    result = await db.execute(select(Product).where(Product.id == item.product_id))
    product = result.scalar_one_or_none()
    if product and product.stock < quantity:
        raise HTTPException(status_code=400, detail=f"Only {product.stock} units available")

    item.quantity = quantity
    await db.flush()
    return await get_cart(user_id, db)


async def remove_item(user_id: str, item_id: str, db: AsyncSession) -> dict:
    cart = await get_or_create_cart(user_id, db)
    item = next((i for i in cart.items if i.id == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    await db.delete(item)
    cart.items = [i for i in cart.items if i.id != item_id]
    await db.flush()
    return await get_cart(user_id, db)


async def clear_cart(user_id: str, db: AsyncSession) -> None:
    cart = await get_or_create_cart(user_id, db)
    for item in cart.items:
        await db.delete(item)
    cart.items = []
    await db.flush()
