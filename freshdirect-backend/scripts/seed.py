"""Seed database with demo categories and products."""
import asyncio
import os
import sys
import uuid
sys.path.append(".")

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import pwd_context
from app.models.product import Category, Product
from app.models.user import User
from app.services.auth_service import generate_user_code
from slugify import slugify

ADMIN_EMAIL = os.environ.get("SEED_ADMIN_EMAIL", "admin@example.com")
ADMIN_PASSWORD = os.environ.get("SEED_ADMIN_PASSWORD", "ChangeMe123!")
ADMIN_PHONE = os.environ.get("SEED_ADMIN_PHONE", "+910000000000")

CATEGORIES = [
    {"name": "Fresh Vegetables", "emoji": "🥦", "color": "#28c38a", "sort_order": 1},
    {"name": "Fresh Fruits", "emoji": "🍎", "color": "#fd761a", "sort_order": 2},
    {"name": "Dairy & Eggs", "emoji": "🥛", "color": "#005322", "sort_order": 3},
    {"name": "Bakery", "emoji": "🍞", "color": "#9d4300", "sort_order": 4},
    {"name": "Organic", "emoji": "🌿", "color": "#006e2f", "sort_order": 5},
    {"name": "Beverages", "emoji": "🧃", "color": "#0b1c30", "sort_order": 6},
]

PRODUCTS = [
    # Vegetables
    {"name": "Organic Roma Tomatoes", "category": "Fresh Vegetables", "price": 49, "original_price": 65, "unit": "500g", "stock": 100, "is_organic": True, "is_featured": True, "badge": "Bestseller", "badge_color": "green", "primary_image_url": "https://lh3.googleusercontent.com/aida-public/AB6AXuCuMDSXPcM8SVlPpnJAtl_V0kX"},
    {"name": "Baby Spinach", "category": "Fresh Vegetables", "price": 35, "unit": "200g", "stock": 80, "is_organic": True},
    {"name": "Broccoli", "category": "Fresh Vegetables", "price": 55, "unit": "1 head", "stock": 60},
    {"name": "Carrots", "category": "Fresh Vegetables", "price": 30, "unit": "500g", "stock": 150},
    {"name": "Bell Pepper (Mixed)", "category": "Fresh Vegetables", "price": 79, "unit": "3 pcs", "stock": 70, "badge": "New", "badge_color": "orange"},
    # Fruits
    {"name": "Alphonso Mangoes", "category": "Fresh Fruits", "price": 199, "original_price": 249, "unit": "1 kg", "stock": 50, "is_featured": True, "badge": "Season Special", "badge_color": "orange"},
    {"name": "Strawberries", "category": "Fresh Fruits", "price": 129, "unit": "250g", "stock": 40},
    {"name": "Banana", "category": "Fresh Fruits", "price": 29, "unit": "6 pcs", "stock": 200},
    {"name": "Green Apple", "category": "Fresh Fruits", "price": 89, "unit": "4 pcs", "stock": 90},
    {"name": "Watermelon", "category": "Fresh Fruits", "price": 149, "unit": "1 piece (~3kg)", "stock": 30},
    # Dairy
    {"name": "Full Cream Milk", "category": "Dairy & Eggs", "price": 28, "unit": "500ml", "stock": 300, "is_featured": True},
    {"name": "Farm Fresh Eggs", "category": "Dairy & Eggs", "price": 79, "unit": "6 pcs", "stock": 200},
    {"name": "Greek Yogurt", "category": "Dairy & Eggs", "price": 59, "unit": "200g", "stock": 120},
    {"name": "Paneer", "category": "Dairy & Eggs", "price": 89, "unit": "200g", "stock": 80},
    # Bakery
    {"name": "Whole Wheat Bread", "category": "Bakery", "price": 45, "unit": "400g loaf", "stock": 60},
    {"name": "Sourdough Bread", "category": "Bakery", "price": 120, "unit": "1 loaf", "stock": 30, "badge": "Artisan", "badge_color": "purple"},
    # Organic
    {"name": "Organic Chia Seeds", "category": "Organic", "price": 149, "unit": "200g", "stock": 90, "is_organic": True},
    {"name": "Cold Pressed Coconut Oil", "category": "Organic", "price": 299, "original_price": 349, "unit": "500ml", "stock": 50, "is_organic": True, "is_featured": True},
    # Beverages
    {"name": "Fresh Orange Juice", "category": "Beverages", "price": 89, "unit": "1 litre", "stock": 70},
    {"name": "Coconut Water", "category": "Beverages", "price": 45, "unit": "300ml", "stock": 100},
]


async def seed():
    async with AsyncSessionLocal() as db:
        # Categories
        cat_map = {}
        for cat_data in CATEGORIES:
            cat = Category(
                name=cat_data["name"],
                slug=slugify(cat_data["name"]),
                emoji=cat_data["emoji"],
                color=cat_data["color"],
                sort_order=cat_data["sort_order"],
            )
            db.add(cat)
            await db.flush()
            cat_map[cat_data["name"]] = cat.id
            print(f"  Category: {cat.name}")

        # Products
        for p in PRODUCTS:
            product = Product(
                name=p["name"],
                slug=slugify(p["name"]),
                category_id=cat_map.get(p["category"]),
                price=p["price"],
                original_price=p.get("original_price"),
                unit=p["unit"],
                stock=p["stock"],
                is_organic=p.get("is_organic", False),
                is_featured=p.get("is_featured", False),
                badge=p.get("badge"),
                badge_color=p.get("badge_color"),
                primary_image_url=p.get("primary_image_url"),
            )
            db.add(product)
            print(f"  Product: {product.name} @ ₹{product.price}")

        await db.commit()
        print(f"\n✅ Seeded {len(CATEGORIES)} categories + {len(PRODUCTS)} products")

        # Admin user — idempotent, so re-running seed.py never duplicates it
        existing = (
            await db.execute(select(User).where(User.email == ADMIN_EMAIL))
        ).scalar_one_or_none()
        if existing:
            print(f"ℹ️  Admin user already exists: {ADMIN_EMAIL}")
        else:
            admin = User(
                id=str(uuid.uuid4()),
                phone=ADMIN_PHONE,
                name="Admin",
                email=ADMIN_EMAIL,
                is_admin=True,
                password_hash=pwd_context.hash(ADMIN_PASSWORD),
                user_code=await generate_user_code(db),
            )
            db.add(admin)
            await db.commit()
            print(f"✅ Created admin user: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(seed())
