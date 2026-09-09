import asyncio
from app.worker import celery_app


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
