from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import pwd_context
from app.api.v1.deps import get_current_user
from app.models.user import User, Address
from app.schemas.user import UserOut, UserUpdate, AddressCreate, AddressOut, AddressUpdate
from app.schemas.auth import SetPasswordRequest

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {"success": True, "data": UserOut.model_validate(current_user)}

@router.patch("/me")
async def update_me(payload: UserUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    updates = payload.model_dump(exclude_unset=True)
    if "email" in updates and updates["email"] != current_user.email:
        existing = await db.execute(select(User).where(User.email == updates["email"]))
        if existing.scalar_one_or_none():
            raise HTTPException(409, "Email already in use")
    for k, v in updates.items():
        setattr(current_user, k, v)
    await db.flush()
    return {"success": True, "data": UserOut.model_validate(current_user)}

@router.post("/me/set-password")
async def set_password(payload: SetPasswordRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    current_user.password_hash = pwd_context.hash(payload.password)
    await db.flush()
    return {"success": True, "data": UserOut.model_validate(current_user)}

@router.get("/addresses")
async def list_addresses(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Address).where(Address.user_id == current_user.id).order_by(Address.is_default.desc()))
    return {"success": True, "data": [AddressOut.model_validate(a) for a in result.scalars().all()]}

@router.post("/addresses", status_code=201)
async def create_address(payload: AddressCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if payload.is_default:
        res = await db.execute(select(Address).where(Address.user_id == current_user.id, Address.is_default))
        for a in res.scalars().all():
            a.is_default = False
    address = Address(**payload.model_dump(), user_id=current_user.id)
    db.add(address)
    await db.flush()
    return {"success": True, "data": AddressOut.model_validate(address)}

@router.patch("/addresses/{address_id}")
async def update_address(address_id: str, payload: AddressUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Address).where(Address.id == address_id, Address.user_id == current_user.id))
    address = res.scalar_one_or_none()
    if not address:
        raise HTTPException(404, "Address not found")
    if payload.is_default:
        ex = await db.execute(select(Address).where(Address.user_id == current_user.id, Address.is_default))
        for a in ex.scalars().all():
            a.is_default = False
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(address, k, v)
    await db.flush()
    return {"success": True, "data": AddressOut.model_validate(address)}

@router.delete("/addresses/{address_id}")
async def delete_address(address_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Address).where(Address.id == address_id, Address.user_id == current_user.id))
    address = res.scalar_one_or_none()
    if not address:
        raise HTTPException(404, "Address not found")
    await db.delete(address)
    return {"success": True, "message": "Deleted"}
