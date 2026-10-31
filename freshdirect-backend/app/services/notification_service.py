from datetime import datetime, timedelta, timezone

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


async def send_push_notification(user_id: str, title: str, body: str, data: dict = None, db: AsyncSession = None,
                                 channel_id: str = "default"):
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
            "channelId": channel_id,
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


# ── Order notifications (Amazon/Zepto-style lifecycle pushes) ────────────────

IST = timezone(timedelta(hours=5, minutes=30))


def _fmt_delivery(iso: str | None) -> str | None:
    if not iso:
        return None
    try:
        d = datetime.fromisoformat(iso).astimezone(IST)
    except ValueError:
        return None
    h = d.hour % 12 or 12
    return f"{d.strftime('%a')} {d.day} {d.strftime('%b')}, {h}:{d.minute:02d} {'AM' if d.hour < 12 else 'PM'}"


def order_message(event: str, order_number: str, *, total: float | None = None,
                  delivery_at: str | None = None, rider_name: str | None = None,
                  rider_phone: str | None = None, **_) -> tuple[str, str]:
    """Title/body for an order lifecycle push. Pure, so it's unit-testable."""
    slot = _fmt_delivery(delivery_at)
    amount = f" (₹{total:g})" if total is not None else ""
    if event == "placed":
        body = f"Your order #{order_number}{amount} has been placed successfully."
        if slot:
            body += f" Delivery: {slot}."
        return "Order placed 🎉", body
    if event == "arriving":
        who = rider_name or "Our delivery partner"
        body = f"{who} is on the way with order #{order_number} and will reach you in about 10–15 minutes."
        if rider_phone:
            body += f" Contact: {rider_phone}"
        return "Arriving soon 🚴", body
    if event == "delivered":
        return "Order delivered ✅", f"Order #{order_number} was delivered successfully. Enjoy your fresh groceries!"
    if event == "cancelled":
        return "Order cancelled", f"Order #{order_number} has been cancelled."
    # Legacy statuses kept for compatibility with older task payloads.
    if event == "confirmed":
        return "Order Confirmed! 🎉", f"Your order #{order_number} is confirmed and being packed."
    if event == "out_for_delivery":
        return "Out for Delivery 🚴", f"Your order #{order_number} is on its way!"
    return "Order Update", f"Order #{order_number} status: {event}"


def _enqueue(task_name: str, args: list) -> None:
    """Queue a Celery task without ever failing the API request that triggered it.

    Notifications are best-effort: if Redis/Celery is down, the order must
    still go through. retry=False so a dead broker fails fast instead of
    blocking the request on publish retries.
    """
    try:
        from app.worker import celery_app
        # Small countdown so the request's transaction has committed first.
        celery_app.send_task(task_name, args=args, countdown=3, retry=False)
    except Exception:
        logger.exception("Could not queue %s for %s", task_name, args[:2])


def queue_order_event(event: str, order, **extra) -> None:
    """Queue a lifecycle push (placed/delivered/cancelled) for an order."""
    try:
        payload = {
            "order_id": order.id,
            "total": order.total,
            "delivery_at": order.estimated_delivery_at.isoformat() if order.estimated_delivery_at else None,
            **extra,
        }
        args = [order.user_id, order.order_number, event, payload]
    except Exception:
        # Never let a notification break the order/payment request.
        logger.exception("Could not build %s notification", event)
        return
    _enqueue("send_order_push", args)


def queue_arriving_check(order_id: str) -> None:
    """Send the "arriving soon + rider details" push now (once per order)."""
    _enqueue("notify_order_arriving", [order_id])


def notify_status_change(order, old_status) -> None:
    """Pushes for a status transition made by admin or rider."""
    from app.models.order import OrderStatus
    new = order.status
    if new == old_status:
        return
    if new == OrderStatus.OUT_FOR_DELIVERY:
        queue_arriving_check(order.id)
    elif new == OrderStatus.DELIVERED:
        queue_order_event("delivered", order)
    elif new == OrderStatus.CANCELLED:
        queue_order_event("cancelled", order)
