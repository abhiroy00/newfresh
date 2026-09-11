"""Extended endpoints for Phase 2 & 3 features"""
import math
from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from typing import Optional
from datetime import datetime, timezone
import csv
import io

from app.core.database import get_db
from app.api.v1.deps import get_current_admin
from app.models.user import User
from app.models.product import Product, Service
from app.models.settings import AppSettings, DeliveryZone
from app.core.redis_client import cache_delete_pattern

router = APIRouter(prefix="/admin", tags=["Extended Features"])


# ============================================================================
# PHASE 2: EXTENDED PRODUCT MANAGEMENT
# ============================================================================

@router.patch("/products/{product_id}/extended")
async def update_product_extended(
    product_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Update extended fields for fruit/specialty products"""

    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if 'origin' in data:
        product.origin = data['origin']
    if 'health_benefits' in data:
        product.health_benefits = data['health_benefits']
    if 'minerals' in data:
        product.minerals = data['minerals']
    if 'vitamins' in data:
        product.vitamins = data['vitamins']
    if 'low_stock_threshold' in data and data['low_stock_threshold'] is not None:
        product.low_stock_threshold = data['low_stock_threshold']

    await db.flush()

    return {
        "success": True,
        "data": {
            "id": product.id,
            "origin": product.origin,
            "health_benefits": product.health_benefits,
            "minerals": product.minerals,
            "vitamins": product.vitamins,
            "low_stock_threshold": product.low_stock_threshold,
        }
    }


@router.post("/products/bulk-price-upload")
async def bulk_price_upload(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Bulk upload prices via CSV: product_id, new_price"""

    content = await file.read()
    text = content.decode('utf-8')

    reader = csv.DictReader(io.StringIO(text))
    updated_count = 0
    errors = []

    for row in reader:
        try:
            product_id = row.get('product_id')
            new_price = float(row.get('new_price'))

            result = await db.execute(select(Product).where(Product.id == product_id))
            product = result.scalar_one_or_none()

            if not product:
                errors.append(f"Product {product_id} not found")
                continue

            # Track price change in history
            if product.price_history is None:
                product.price_history = []

            product.price_history.append({
                "old_price": product.price,
                "new_price": new_price,
                "changed_at": datetime.now(timezone.utc).isoformat(),
                "changed_by": _.id
            })

            product.price = new_price
            updated_count += 1

        except Exception as e:
            errors.append(f"Error processing row {row}: {str(e)}")

    await db.flush()

    return {
        "success": True,
        "data": {
            "updated_count": updated_count,
            "errors": errors,
            "total_rows": updated_count + len(errors)
        }
    }


@router.post("/products/{product_id}/schedule-price")
async def schedule_price_change(
    product_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Schedule a price change for future date"""

    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    new_price = data.get('new_price')
    scheduled_date = data.get('scheduled_date')

    if not new_price or not scheduled_date:
        raise HTTPException(status_code=400, detail="new_price and scheduled_date are required")

    try:
        scheduled_dt = datetime.fromisoformat(scheduled_date + "T00:00:00+00:00")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    if scheduled_dt <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Scheduled date must be in the future")

    product.scheduled_price = new_price
    product.scheduled_price_date = scheduled_dt

    await db.flush()

    return {
        "success": True,
        "data": {
            "id": product.id,
            "current_price": product.price,
            "scheduled_price": new_price,
            "scheduled_date": scheduled_dt.isoformat(),
        }
    }


@router.get("/products/{product_id}/price-history")
async def get_price_history(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Get price change history for a product"""

    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return {
        "success": True,
        "data": {
            "product_id": product.id,
            "current_price": product.price,
            "history": product.price_history or [],
            "scheduled_price": product.scheduled_price,
            "scheduled_date": product.scheduled_price_date.isoformat() if product.scheduled_price_date else None,
        }
    }


@router.get("/products/{product_id}/configure-stock")
async def get_stock_config(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Get stock configuration for a product"""

    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return {
        "success": True,
        "data": {
            "product_id": product.id,
            "current_stock": product.stock,
            "low_stock_threshold": product.low_stock_threshold,
            "is_low_stock": product.stock <= product.low_stock_threshold,
        }
    }


@router.patch("/products/{product_id}/configure-stock")
async def set_stock_threshold(
    product_id: str,
    low_stock_threshold: int = Query(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Configure low-stock alert threshold"""

    if low_stock_threshold < 0:
        raise HTTPException(status_code=400, detail="Threshold must be >= 0")

    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.low_stock_threshold = low_stock_threshold
    await db.flush()

    return {
        "success": True,
        "data": {
            "product_id": product.id,
            "low_stock_threshold": product.low_stock_threshold,
        }
    }


# ============================================================================
# PHASE 2: SERVICES MANAGEMENT
# ============================================================================

@router.get("/services")
async def list_services(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """List all services"""

    query = select(Service)

    if search:
        query = query.where(Service.name.ilike(f"%{search}%"))

    count_result = await db.execute(select(func.count(Service.id)).select_from(Service))
    total = count_result.scalar() or 0

    query = query.order_by(Service.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    services = (await db.execute(query)).scalars().all()

    def _safe_price(v):
        try:
            f = float(v)
            return None if math.isnan(f) or math.isinf(f) else f
        except (TypeError, ValueError):
            return None

    items = [
        {
            "id": s.id,
            "category_id": s.category_id,
            "name": s.name,
            "slug": s.slug,
            "description": s.description,
            "image_url": s.image_url,
            "pricing_unit": s.pricing_unit,
            "base_price": _safe_price(s.base_price),
            "is_active": s.is_active,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in services
    ]

    return {
        "success": True,
        "data": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page
    }


@router.post("/services", status_code=201)
async def create_service(
    name: str = Query(...),
    description: Optional[str] = Query(None),
    pricing_unit: str = Query(...),
    base_price: float = Query(...),
    image_url: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    import logging as _log
    _logger = _log.getLogger(__name__)

    try:
        if math.isnan(base_price) or math.isinf(base_price) or base_price <= 0:
            raise HTTPException(status_code=422, detail="base_price must be a positive number")

        import re as _re
        import unicodedata as _ud
        import uuid as _uuid
        _ascii = _ud.normalize('NFKD', name.strip()).encode('ascii', 'ignore').decode()
        base_slug = _re.sub(r'[-\s]+', '-', _re.sub(r'[^\w\s-]', '', _ascii.lower())).strip('-') or f"service-{_uuid.uuid4().hex[:8]}"
        slug = base_slug
        suffix = 1
        while True:
            row = await db.execute(select(Service).where(Service.slug == slug))
            if row.scalar_one_or_none() is None:
                break
            slug = f"{base_slug}-{suffix}"
            suffix += 1

        service = Service(
            name=name.strip(),
            slug=slug,
            description=description,
            pricing_unit=pricing_unit,
            base_price=base_price,
            image_url=image_url,
            category_id=category_id or None,
        )
        db.add(service)
        await db.flush()
        await cache_delete_pattern("categories:*")

        return {
            "success": True,
            "data": {
                "id": service.id,
                "name": service.name,
                "slug": service.slug,
                "image_url": service.image_url,
            }
        }
    except HTTPException:
        raise
    except IntegrityError as exc:
        _logger.error(f"create_service IntegrityError: {exc!r}")
        raise HTTPException(status_code=409, detail="A service with this name already exists")
    except Exception as exc:
        _logger.error(f"create_service unexpected error: {exc!r}")
        raise HTTPException(status_code=500, detail=str(exc))


@router.patch("/services/{service_id}")
async def update_service(
    service_id: str,
    name: Optional[str] = Query(None),
    description: Optional[str] = Query(None),
    base_price: Optional[float] = Query(None),
    is_active: Optional[bool] = Query(None),
    category_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Update service details"""

    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()

    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    if name is not None:
        service.name = name
    if description is not None:
        service.description = description
    if base_price is not None:
        service.base_price = base_price
    if is_active is not None:
        service.is_active = is_active
    if category_id is not None:
        service.category_id = category_id if category_id != '' else None

    await db.flush()
    await cache_delete_pattern("categories:*")

    return {
        "success": True,
        "data": {"id": service.id, "name": service.name}
    }


@router.delete("/services/{service_id}")
async def delete_service(
    service_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Delete a service"""

    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()

    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    await db.delete(service)
    await db.flush()
    await cache_delete_pattern("categories:*")

    return {"success": True, "message": "Service deleted"}


# ============================================================================
# PHASE 3: PLATFORM SETTINGS
# ============================================================================

@router.get("/settings")
async def get_settings(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Get all platform settings"""

    result = await db.execute(select(AppSettings).limit(1))
    settings = result.scalar_one_or_none()

    if not settings:
        # Create default settings
        settings = AppSettings()
        db.add(settings)
        await db.flush()
    await db.commit()

    return {
        "success": True,
        "data": {
            "id": settings.id,
            "app_name": settings.app_name,
            "app_logo_url": settings.app_logo_url,
            "support_phone": settings.support_phone,
            "support_whatsapp": settings.support_whatsapp,
            "support_email": settings.support_email,
            "default_currency": settings.default_currency,
            "payment_methods_enabled": settings.payment_methods_enabled,
            "gst_config": settings.gst_config,
            "min_order_value": settings.min_order_value,
            "free_delivery_above": settings.free_delivery_above,
            "base_delivery_fee": settings.base_delivery_fee,
            "app_store_link": settings.app_store_link,
            "play_store_link": settings.play_store_link,
        }
    }


@router.patch("/settings/app-config")
async def update_app_config(
    data: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Update app configuration"""

    result = await db.execute(select(AppSettings).limit(1))
    settings = result.scalar_one_or_none()

    if not settings:
        settings = AppSettings()
        db.add(settings)

    if 'app_name' in data and data['app_name']:
        settings.app_name = data['app_name']
    if 'support_phone' in data and data['support_phone']:
        settings.support_phone = data['support_phone']
    if 'support_whatsapp' in data and data['support_whatsapp']:
        settings.support_whatsapp = data['support_whatsapp']
    if 'support_email' in data and data['support_email']:
        settings.support_email = data['support_email']
    if 'app_store_link' in data and data['app_store_link']:
        settings.app_store_link = data['app_store_link']
    if 'play_store_link' in data and data['play_store_link']:
        settings.play_store_link = data['play_store_link']

    await db.flush()
    await db.commit()

    return {
        "success": True,
        "message": "App configuration updated"
    }


@router.patch("/settings/payment-gateway")
async def update_payment_gateway(
    data: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Update payment gateway configuration"""

    result = await db.execute(select(AppSettings).limit(1))
    settings = result.scalar_one_or_none()

    if not settings:
        settings = AppSettings()
        db.add(settings)

    if 'razorpay_key_id' in data and data['razorpay_key_id']:
        settings.razorpay_key_id = data['razorpay_key_id']
    if 'razorpay_key_secret' in data and data['razorpay_key_secret']:
        settings.razorpay_key_secret = data['razorpay_key_secret']
    if 'payment_methods_enabled' in data and data['payment_methods_enabled']:
        settings.payment_methods_enabled = data['payment_methods_enabled']

    await db.flush()
    await db.commit()

    return {
        "success": True,
        "message": "Payment gateway configuration updated"
    }


@router.patch("/settings/tax-config")
async def update_tax_config(
    data: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Update GST tax configuration by category"""

    result = await db.execute(select(AppSettings).limit(1))
    settings = result.scalar_one_or_none()

    if not settings:
        settings = AppSettings()
        db.add(settings)

    settings.gst_config = data.get('gst_config', data)
    await db.flush()
    await db.commit()

    return {
        "success": True,
        "message": "Tax configuration updated",
        "data": settings.gst_config
    }


@router.patch("/settings/delivery-config")
async def update_delivery_config(
    data: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Update delivery configuration"""

    result = await db.execute(select(AppSettings).limit(1))
    settings = result.scalar_one_or_none()

    if not settings:
        settings = AppSettings()
        db.add(settings)

    if 'min_order_value' in data and data['min_order_value'] is not None:
        settings.min_order_value = float(data['min_order_value'])
    if 'free_delivery_above' in data and data['free_delivery_above'] is not None:
        settings.free_delivery_above = float(data['free_delivery_above'])
    if 'base_delivery_fee' in data and data['base_delivery_fee'] is not None:
        settings.base_delivery_fee = float(data['base_delivery_fee'])

    await db.flush()
    await db.commit()

    return {
        "success": True,
        "message": "Delivery configuration updated"
    }


# ============================================================================
# PHASE 3: DELIVERY ZONES
# ============================================================================

@router.get("/delivery-zones")
async def list_delivery_zones(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """List all delivery zones"""

    result = await db.execute(select(DeliveryZone).order_by(DeliveryZone.created_at.desc()))
    zones = result.scalars().all()

    items = [
        {
            "id": z.id,
            "name": z.name,
            "description": z.description,
            "coverage": z.coverage,
            "delivery_fee": z.delivery_fee,
            "free_delivery_above": z.free_delivery_above,
            "estimated_delivery_time_minutes": z.estimated_delivery_time_minutes,
            "is_active": z.is_active,
        }
        for z in zones
    ]

    return {
        "success": True,
        "data": items
    }


@router.post("/delivery-zones", status_code=201)
async def create_delivery_zone(
    data: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Create a new delivery zone"""

    zone = DeliveryZone(
        name=data.get('name'),
        description=data.get('description'),
        coverage=data.get('coverage'),
        delivery_fee=data.get('delivery_fee', 49.0),
        free_delivery_above=data.get('free_delivery_above', 499.0),
        estimated_delivery_time_minutes=data.get('estimated_delivery_time_minutes', 30),
    )

    db.add(zone)
    await db.flush()

    return {
        "success": True,
        "data": {"id": zone.id, "name": zone.name}
    }


@router.patch("/delivery-zones/{zone_id}")
async def update_delivery_zone(
    zone_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Update delivery zone"""

    result = await db.execute(select(DeliveryZone).where(DeliveryZone.id == zone_id))
    zone = result.scalar_one_or_none()

    if not zone:
        raise HTTPException(status_code=404, detail="Delivery zone not found")

    if 'name' in data and data['name']:
        zone.name = data['name']
    if 'coverage' in data and data['coverage']:
        zone.coverage = data['coverage']
    if 'delivery_fee' in data and data['delivery_fee'] is not None:
        zone.delivery_fee = data['delivery_fee']
    if 'is_active' in data and data['is_active'] is not None:
        zone.is_active = data['is_active']

    await db.flush()

    return {
        "success": True,
        "data": {"id": zone.id, "name": zone.name}
    }


@router.delete("/delivery-zones/{zone_id}")
async def delete_delivery_zone(
    zone_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Delete a delivery zone"""

    result = await db.execute(select(DeliveryZone).where(DeliveryZone.id == zone_id))
    zone = result.scalar_one_or_none()

    if not zone:
        raise HTTPException(status_code=404, detail="Delivery zone not found")

    await db.delete(zone)
    await db.flush()

    return {"success": True, "message": "Delivery zone deleted"}
