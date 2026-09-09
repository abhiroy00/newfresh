from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.notification import FCMToken
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

_firebase_initialized = False


def _init_firebase():
    global _firebase_initialized
    if _firebase_initialized:
        return
    try:
        import firebase_admin
        from firebase_admin import credentials
        import os
        if os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
    except Exception as e:
        logger.warning(f"Firebase init failed: {e}")


async def register_fcm_token(user_id: str, token: str, device_type: str, db: AsyncSession) -> None:
    # Deactivate old tokens for this user on same device type
    result = await db.execute(
        select(FCMToken).where(FCMToken.user_id == user_id, FCMToken.device_type == device_type)
    )
    old_tokens = result.scalars().all()
    for t in old_tokens:
        t.is_active = False

    # Upsert new token
    existing = await db.execute(select(FCMToken).where(FCMToken.token == token))
    fcm = existing.scalar_one_or_none()
    if fcm:
        fcm.user_id = user_id
        fcm.is_active = True
        fcm.device_type = device_type
    else:
        db.add(FCMToken(user_id=user_id, token=token, device_type=device_type))
    await db.flush()


async def send_push_notification(user_id: str, title: str, body: str, data: dict = None, db: AsyncSession = None):
    _init_firebase()
    if not _firebase_initialized:
        logger.warning("Firebase not initialized, skipping push notification")
        return

    try:
        from firebase_admin import messaging
        # Get active tokens for user
        result = await db.execute(
            select(FCMToken).where(FCMToken.user_id == user_id, FCMToken.is_active)
        )
        tokens = [t.token for t in result.scalars().all()]
        if not tokens:
            return

        message = messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            data=data or {},
            tokens=tokens,
        )
        response = messaging.send_each_for_multicast(message)
        logger.info(f"Push sent to {user_id}: {response.success_count} success, {response.failure_count} failed")
    except Exception as e:
        logger.error(f"Push notification failed: {e}")
