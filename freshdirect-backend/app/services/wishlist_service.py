from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

from app.models.wishlist import WishlistItem
from app.models.product import Product


def _product_query():
    return select(Product).options(selectinload(Product.category), selectinload(Product.images))


async def list_wishlist(user_id: str, db: AsyncSession) -> list[WishlistItem]:
    result = await db.execute(
        select(WishlistItem)
        .options(
            selectinload(WishlistItem.product).selectinload(Product.category),
            selectinload(WishlistItem.product).selectinload(Product.images),
        )
        .where(WishlistItem.user_id == user_id)
        .order_by(WishlistItem.created_at.desc())
    )
    return list(result.scalars().all())


async def add_to_wishlist(user_id: str, product_id: str, db: AsyncSession) -> WishlistItem:
    result = await db.execute(_product_query().where(Product.id == product_id, Product.is_active))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = await db.execute(
        select(WishlistItem).where(WishlistItem.user_id == user_id, WishlistItem.product_id == product_id)
    )
    item = existing.scalar_one_or_none()
    if item:
        item.product = product  # in-memory assignment — avoids a lazy-load on the unloaded relationship
        return item

    item = WishlistItem(user_id=user_id, product_id=product_id, product=product)
    db.add(item)
    await db.flush()
    return item


async def remove_from_wishlist(user_id: str, product_id: str, db: AsyncSession) -> None:
    result = await db.execute(
        select(WishlistItem).where(WishlistItem.user_id == user_id, WishlistItem.product_id == product_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not in wishlist")
    await db.delete(item)
    await db.flush()
