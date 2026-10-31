from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.schemas.wishlist import WishlistItemOut
from app.services.wishlist_service import list_wishlist, add_to_wishlist, remove_from_wishlist
from app.services.product_service import attach_like_counts, count_likes

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])

@router.get("")
async def api_list_wishlist(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    items = await list_wishlist(current_user.id, db)
    await attach_like_counts([i.product for i in items if i.product is not None], db)
    return {"success": True, "data": [WishlistItemOut.model_validate(i) for i in items]}

@router.post("/{product_id}", status_code=201)
async def api_add_to_wishlist(product_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    item = await add_to_wishlist(current_user.id, product_id, db)
    # A wishlist entry is a "like"; return the fresh count so clients can sync.
    await attach_like_counts([item.product], db)
    return {"success": True, "data": WishlistItemOut.model_validate(item)}

@router.delete("/{product_id}")
async def api_remove_from_wishlist(product_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await remove_from_wishlist(current_user.id, product_id, db)
    # Additive `data.like_count` so clients can sync the heart's figure.
    like_count = await count_likes(product_id, db)
    return {"success": True, "message": "Removed from wishlist", "data": {"like_count": like_count}}
