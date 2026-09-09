from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.redis_client import blacklist_token
from app.core.security import decode_token
from app.schemas.auth import SendOTPRequest, VerifyOTPRequest, RefreshRequest
from app.services.auth_service import send_otp, verify_otp_and_login, refresh_access_token
from app.api.v1.deps import get_current_user, security
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
async def api_logout(
    current_user: User = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials
    payload = decode_token(token)
    jti = payload.get("jti", token[-16:])
    exp = payload.get("exp")
    ttl = max(int(exp - datetime.now(timezone.utc).timestamp()), 1) if exp else 1
    await blacklist_token(jti, ttl)
    return {"success": True, "message": "Logged out"}
