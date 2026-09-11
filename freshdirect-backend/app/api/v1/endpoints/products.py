from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import datetime, timezone
from app.core.database import get_db
from app.api.v1.deps import get_current_admin
from app.models.user import User
from app.models.product import Carousel
from app.schemas.product import ProductCreate, ProductUpdate, CategoryCreate, ProductOut
from app.services.product_service import (
    list_categories, list_products, get_product,
    create_product, update_product, delete_product,
    get_category, create_category, update_category, delete_category
)

router = APIRouter(tags=["Products"])

@router.get("/carousel")
async def api_list_carousel(db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Carousel)
        .where(
            Carousel.is_active,
            (Carousel.starts_at.is_(None)) | (Carousel.starts_at <= now),
            (Carousel.ends_at.is_(None)) | (Carousel.ends_at >= now),
        )
        .order_by(Carousel.display_order.asc())
    )
    items = result.scalars().all()
    return {
        "success": True,
        "data": [
            {
                "id": c.id,
                "title": c.title,
                "subtitle": c.subtitle,
                "image_url": c.image_url,
                "link_type": c.link_type,
                "link_value": c.link_value,
                "button_text": c.button_text,
                "display_order": c.display_order,
            }
            for c in items
        ],
    }

@router.get("/categories")
async def api_list_categories(db: AsyncSession = Depends(get_db)):
    cats = await list_categories(db)
    return {"success": True, "data": cats}

@router.post("/categories", status_code=201)
async def api_create_category(payload: CategoryCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)):
    cat = await create_category(payload, db)
    return {"success": True, "data": {"id": cat.id, "name": cat.name, "slug": cat.slug}}

@router.get("/admin/categories/{category_id}")
async def api_get_category(category_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)):
    category = await get_category(category_id, db)
    return {
        "success": True,
        "data": {
            "id": category.id,
            "name": category.name,
            "slug": category.slug,
            "emoji": category.emoji,
            "image_url": category.image_url,
            "color": category.color,
            "is_active": category.is_active,
            "sort_order": category.sort_order,
        }
    }

@router.patch("/admin/categories/{category_id}")
async def api_update_category(category_id: str, payload: dict, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)):
    category = await update_category(category_id, payload, db)
    return {
        "success": True,
        "data": {
            "id": category.id,
            "name": category.name,
            "slug": category.slug,
            "emoji": category.emoji,
            "image_url": category.image_url,
            "color": category.color,
            "is_active": category.is_active,
            "sort_order": category.sort_order,
        }
    }

@router.delete("/admin/categories/{category_id}")
async def api_delete_category(category_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)):
    await delete_category(category_id, db)
    return {"success": True, "message": "Category deleted"}

@router.post("/admin/categories/{category_id}/image", status_code=201)
async def api_upload_category_image(category_id: str, file: UploadFile = File(...), db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)):
    import cloudinary
    import cloudinary.uploader
    from app.core.config import settings
    from app.models.product import Category
    from sqlalchemy import select

    # Verify category exists
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Category not found")

    # Upload to Cloudinary
    from fastapi import HTTPException
    cloudinary.config(cloud_name=settings.CLOUDINARY_CLOUD_NAME, api_key=settings.CLOUDINARY_API_KEY, api_secret=settings.CLOUDINARY_API_SECRET)
    try:
        res = cloudinary.uploader.upload(await file.read(), folder="Gmart/categories")
    except cloudinary.exceptions.Error as e:
        raise HTTPException(status_code=502, detail=f"Image upload failed: {e}")

    # Update category with image URL
    category.image_url = res["secure_url"]
    await db.flush()

    return {"success": True, "url": res["secure_url"]}

@router.get("/products")
async def api_list_products(
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    category_id: Optional[str] = None, search: Optional[str] = None,
    is_featured: Optional[bool] = None, is_organic: Optional[bool] = None,
    sort: str = "created_at_desc", db: AsyncSession = Depends(get_db),
):
    result = await list_products(db, page=page, per_page=per_page, category_id=category_id,
        search=search, is_featured=is_featured, is_organic=is_organic, sort=sort)
    # Ensure data is properly serialized
    serialized_data = [ProductOut.model_validate(p, from_attributes=True) for p in result["data"]]
    return {"success": True, "data": serialized_data, "total": result["total"], "page": result["page"], "per_page": result["per_page"], "pages": result["pages"]}

@router.get("/products/{product_id}")
async def api_get_product(product_id: str, db: AsyncSession = Depends(get_db)):
    product = await get_product(product_id, db)
    return {"success": True, "data": ProductOut.model_validate(product, from_attributes=True)}

@router.post("/admin/products", status_code=201)
async def api_create_product(payload: ProductCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)):
    return {"success": True, "data": await create_product(payload, db)}

@router.patch("/admin/products/{product_id}")
async def api_update_product(product_id: str, payload: ProductUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)):
    return {"success": True, "data": await update_product(product_id, payload, db)}

@router.delete("/admin/products/{product_id}")
async def api_delete_product(product_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)):
    await delete_product(product_id, db)
    return {"success": True, "message": "Deleted"}

@router.post("/products/{product_id}/images")
async def api_upload_image(product_id: str, file: UploadFile = File(...), db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)):
    import cloudinary
    import cloudinary.uploader
    from fastapi import HTTPException
    from app.core.config import settings
    from app.models.product import ProductImage
    cloudinary.config(cloud_name=settings.CLOUDINARY_CLOUD_NAME, api_key=settings.CLOUDINARY_API_KEY, api_secret=settings.CLOUDINARY_API_SECRET)
    try:
        res = cloudinary.uploader.upload(await file.read(), folder="Gmart/products")
    except cloudinary.exceptions.Error as e:
        raise HTTPException(status_code=502, detail=f"Image upload failed: {e}")
    img = ProductImage(product_id=product_id, url=res["secure_url"], cloudinary_public_id=res["public_id"])
    db.add(img)
    await db.flush()
    return {"success": True, "id": img.id, "url": res["secure_url"]}

@router.post("/products/{product_id}/images/url", status_code=201)
async def api_add_image_url(product_id: str, payload: dict, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)):
    """Add a gallery image by CDN URL (no upload)."""
    from fastapi import HTTPException
    from app.models.product import ProductImage
    url = (payload.get("url") or "").strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="A valid image URL is required")
    img = ProductImage(product_id=product_id, url=url)
    db.add(img)
    await db.flush()
    return {"success": True, "id": img.id, "url": img.url}

@router.delete("/products/{product_id}/images/{image_id}")
async def api_delete_image(product_id: str, image_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)):
    from fastapi import HTTPException
    from app.models.product import ProductImage
    result = await db.execute(
        select(ProductImage).where(ProductImage.id == image_id, ProductImage.product_id == product_id)
    )
    img = result.scalar_one_or_none()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    if img.cloudinary_public_id:
        try:
            import cloudinary
            import cloudinary.uploader
            from app.core.config import settings
            cloudinary.config(cloud_name=settings.CLOUDINARY_CLOUD_NAME, api_key=settings.CLOUDINARY_API_KEY, api_secret=settings.CLOUDINARY_API_SECRET)
            cloudinary.uploader.destroy(img.cloudinary_public_id)
        except Exception:
            pass  # DB row removal matters more than CDN cleanup
    await db.delete(img)
    await db.flush()
    return {"success": True, "message": "Image deleted"}
