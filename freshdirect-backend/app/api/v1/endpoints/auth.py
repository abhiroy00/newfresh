from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.auth import SendOTPRequest, VerifyOTPRequest, RefreshRequest
from app.services.auth_service import send_otp, verify_otp_and_login, refresh_access_token
from app.api.v1.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/send-otp")
async def api_send_otp(payload: SendOTPRequest):
    try:
        data = await send_otp(payload)
        return {"success": True, "message": "OTP sent", "data": data}
    except Exception as e:
        print(f"OTP Error: {str(e)}")
        raise

@router.post("/verify-otp")
async def api_verify_otp(payload: VerifyOTPRequest, db: AsyncSession = Depends(get_db)):
    token = await verify_otp_and_login(payload, db)
    return {"success": True, "message": "Login successful", "data": token}

@router.post("/refresh")
async def api_refresh(payload: RefreshRequest):
    token = await refresh_access_token(payload.refresh_token)
    return {"success": True, "data": token}

@router.post("/logout")
async def api_logout(current_user: User = Depends(get_current_user)):
    return {"success": True, "message": "Logged out"}
