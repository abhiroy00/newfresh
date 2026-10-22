import asyncio
from datetime import datetime, timedelta, timezone
from app.worker import celery_app

IST = timezone(timedelta(hours=5, minutes=30))


@celery_app.task(name="send_order_push")
def send_order_push(user_id: str, order_number: str, status: str):
    """Send push notification when order status changes."""
    messages = {
        "confirmed": ("Order Confirmed! 🎉", f"Your order #{order_number} is confirmed and being packed."),
        "out_for_delivery": ("Out for Delivery 🚴", f"Your order #{order_number} is on its way!"),
        "delivered": ("Delivered! ✅", f"Order #{order_number} delivered. Enjoy your groceries!"),
        "cancelled": ("Order Cancelled", f"Order #{order_number} has been cancelled."),
    }
    title, body = messages.get(status, ("Order Update", f"Order #{order_number} status: {status}"))

    async def _send():
        from app.core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            from app.services.notification_service import send_push_notification
            await send_push_notification(user_id, title, body, {"order_number": order_number, "status": status}, db)

    asyncio.run(_send())


@celery_app.task(name="send_daily_no_order_reminder")
def send_daily_no_order_reminder():
    """Nudge users who haven't placed an order yet today (IST). Runs once a day via Celery beat."""
    asyncio.run(_send_daily_no_order_reminder())


async def _send_daily_no_order_reminder():
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.models.user import User
    from app.models.order import Order
    from app.services.notification_service import send_push_notification

    today_start_ist = datetime.now(IST).replace(hour=0, minute=0, second=0, microsecond=0)
    today_start_utc = today_start_ist.astimezone(timezone.utc)

    title = "Aaj ka order abhi tak nahi hua 🛒"
    body = "Aapne aaj tak koi order nahi kiya. Fresh groceries ghar baithe mangwayein — abhi order karein!"

    async with AsyncSessionLocal() as db:
        ordered_today = select(Order.user_id).where(Order.created_at >= today_start_utc).distinct()
        result = await db.execute(
            select(User.id).where(
                User.is_active,
                ~User.is_admin,
                ~User.is_rider,
                User.id.not_in(ordered_today),
            )
        )
        user_ids = [row[0] for row in result.all()]

        for user_id in user_ids:
            await send_push_notification(user_id, title, body, {"type": "daily_no_order_reminder"}, db)
