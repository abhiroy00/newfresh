from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.schemas.cart import CartItemCreate, CartItemUpdate
from app.services.cart_service import get_cart, add_item, update_item, remove_item, clear_cart

router = APIRouter(prefix="/cart", tags=["Cart"])

@router.get("")
async def api_get_cart(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return {"success": True, "data": await get_cart(current_user.id, db)}

@router.post("/items", status_code=201)
async def api_add_item(payload: CartItemCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return {"success": True, "data": await add_item(current_user.id, payload.product_id, payload.quantity, db)}

@router.put("/items/{item_id}")
async def api_update_item(item_id: str, payload: CartItemUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return {"success": True, "data": await update_item(current_user.id, item_id, payload.quantity, db)}

@router.delete("/items/{item_id}")
async def api_remove_item(item_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return {"success": True, "data": await remove_item(current_user.id, item_id, db)}

@router.delete("")
async def api_clear_cart(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await clear_cart(current_user.id, db)
    return {"success": True, "message": "Cart cleared"}
