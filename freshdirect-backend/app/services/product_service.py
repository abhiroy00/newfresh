from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from slugify import slugify

from app.models.product import Product, Category, Service
from app.schemas.product import ProductCreate, ProductUpdate, CategoryCreate
from app.core.redis_client import cache_get, cache_set, cache_delete_pattern

PRODUCTS_CACHE_TTL = 300  # 5 min


async def list_categories(db: AsyncSession) -> List[Category]:
    cached = await cache_get("categories:all")
    if cached:
        return cached

    result = await db.execute(
        select(Category)
        .where(Category.is_active)
        .order_by(Category.sort_order, Category.name)
    )
    categories = result.scalars().all()

    # Enrich with product counts
    count_result = await db.execute(
        select(Product.category_id, func.count(Product.id).label("cnt"))
        .where(Product.is_active)
        .group_by(Product.category_id)
    )
    counts = {row.category_id: row.cnt for row in count_result}

    # Enrich with service counts
    svc_count_result = await db.execute(
        select(Service.category_id, func.count(Service.id).label("cnt"))
        .where(Service.is_active)
        .group_by(Service.category_id)
    )
    svc_counts = {row.category_id: row.cnt for row in svc_count_result}

    output = []
    for cat in categories:
        cat_dict = {
            "id": cat.id,
            "name": cat.name,
            "slug": cat.slug,
            "emoji": cat.emoji,
            "image_url": cat.image_url,
            "color": cat.color,
            "product_count": counts.get(cat.id, 0),
            "service_count": svc_counts.get(cat.id, 0),
        }
        output.append(cat_dict)

    await cache_set("categories:all", output, PRODUCTS_CACHE_TTL)
    return output


async def list_products(
    db: AsyncSession,
    page: int = 1,
    per_page: int = 20,
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    is_featured: Optional[bool] = None,
    is_organic: Optional[bool] = None,
    sort: str = "created_at_desc",
) -> dict:
    query = (
        select(Product)
        .options(selectinload(Product.category), selectinload(Product.images))
        .where(Product.is_active)
    )

    if category_id:
        query = query.where(Product.category_id == category_id)
    if is_featured is not None:
        query = query.where(Product.is_featured == is_featured)
    if is_organic is not None:
        query = query.where(Product.is_organic == is_organic)
    if search:
        query = query.where(
            or_(
                Product.name.ilike(f"%{search}%"),
                Product.description.ilike(f"%{search}%"),
            )
        )

    # Sort
    sort_map = {
        "price_asc": Product.price.asc(),
        "price_desc": Product.price.desc(),
        "name_asc": Product.name.asc(),
        "created_at_desc": Product.created_at.desc(),
    }
    query = query.order_by(sort_map.get(sort, Product.created_at.desc()))

    # Total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    products = result.scalars().all()

    output = {
        "data": products,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }

    return output


async def get_product(product_id: str, db: AsyncSession) -> Product:
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.category), selectinload(Product.images))
        .where(Product.id == product_id, Product.is_active)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


async def create_product(payload: ProductCreate, db: AsyncSession) -> Product:
    slug = slugify(payload.name)
    # Ensure unique slug
    base_slug = slug
    counter = 1
    while True:
        existing = await db.execute(select(Product).where(Product.slug == slug))
        if not existing.scalar_one_or_none():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    product = Product(**payload.model_dump(), slug=slug)
    db.add(product)
    await db.flush()
    await cache_delete_pattern("products:*")
    await cache_delete_pattern("categories:*")
    return product


async def update_product(product_id: str, payload: ProductUpdate, db: AsyncSession) -> Product:
    product = await get_product(product_id, db)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, key, value)
    await db.flush()
    await cache_delete_pattern("products:*")
    await cache_delete_pattern("categories:*")
    return product


async def delete_product(product_id: str, db: AsyncSession) -> None:
    product = await get_product(product_id, db)
    product.is_active = False
    await cache_delete_pattern("products:*")
    await cache_delete_pattern("categories:*")


async def get_category(category_id: str, db: AsyncSession) -> Category:
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category


async def create_category(payload: CategoryCreate, db: AsyncSession) -> Category:
    slug = slugify(payload.name)
    # Ensure unique slug
    base_slug = slug
    counter = 1
    while True:
        existing = await db.execute(select(Category).where(Category.slug == slug))
        if not existing.scalar_one_or_none():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    category = Category(**payload.model_dump(), slug=slug)
    db.add(category)
    await db.flush()
    await cache_delete_pattern("categories:*")
    return category


async def update_category(category_id: str, payload: dict, db: AsyncSession) -> Category:
    category = await get_category(category_id, db)

    # If name changed, regenerate slug
    if "name" in payload:
        slug = slugify(payload["name"])
        base_slug = slug
        counter = 1
        while True:
            existing = await db.execute(
                select(Category).where(Category.slug == slug, Category.id != category_id)
            )
            if not existing.scalar_one_or_none():
                break
            slug = f"{base_slug}-{counter}"
            counter += 1
        payload["slug"] = slug

    for key, value in payload.items():
        if value is not None:
            setattr(category, key, value)

    await db.flush()
    await cache_delete_pattern("categories:*")
    return category


async def delete_category(category_id: str, db: AsyncSession) -> None:
    category = await get_category(category_id, db)
    # Soft delete by setting is_active to False
    category.is_active = False
    await cache_delete_pattern("categories:*")
