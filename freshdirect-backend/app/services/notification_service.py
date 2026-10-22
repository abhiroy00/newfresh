import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.notification import FCMToken
import logging

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


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
    """Send a push notification to all of a user's registered devices via Expo's push service."""
    result = await db.execute(
        select(FCMToken).where(FCMToken.user_id == user_id, FCMToken.is_active)
    )
    tokens = [t.token for t in result.scalars().all()]
    if not tokens:
        return

    messages = [
        {
            "to": token,
            "title": title,
            "body": body,
            "data": data or {},
            "sound": "default",
            "channelId": "default",
        }
        for token in tokens
    ]

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(EXPO_PUSH_URL, json=messages)
            response.raise_for_status()
            receipts = response.json().get("data", [])

        # Deactivate tokens Expo reports as no longer registered
        dead_tokens = [
            token
            for token, receipt in zip(tokens, receipts)
            if isinstance(receipt, dict)
            and receipt.get("status") == "error"
            and receipt.get("details", {}).get("error") == "DeviceNotRegistered"
        ]
        if dead_tokens:
            dead_result = await db.execute(select(FCMToken).where(FCMToken.token.in_(dead_tokens)))
            for t in dead_result.scalars().all():
                t.is_active = False
            await db.commit()

        logger.info(f"Expo push sent to {user_id}: {len(tokens)} token(s)")
    except Exception as e:
        logger.error(f"Push notification failed for user {user_id}: {e}")
