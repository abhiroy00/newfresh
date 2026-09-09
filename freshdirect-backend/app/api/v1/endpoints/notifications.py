from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.services.notification_service import register_fcm_token

router = APIRouter(prefix="/notifications", tags=["Notifications"])

class FCMTokenRequest(BaseModel):
    token: str
    device_type: str = "android"  # ios or android

@router.post("/register-token")
async def api_register_token(
    payload: FCMTokenRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await register_fcm_token(current_user.id, payload.token, payload.device_type, db)
    return {"success": True, "message": "FCM token registered"}
