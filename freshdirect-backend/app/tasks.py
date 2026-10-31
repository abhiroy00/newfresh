import asyncio
import logging
from datetime import datetime, timedelta, timezone
from app.worker import celery_app

logger = logging.getLogger(__name__)

IST = timezone(timedelta(hours=5, minutes=30))

# "Arriving soon" goes out this long before the delivery slot…
ARRIVING_LEAD = timedelta(minutes=15)
# …but not for slots long past (e.g. an order the admin forgot to close).
ARRIVING_STALE_AFTER = timedelta(hours=2)


def _run(coro):
    """Run async DB work from a sync Celery task.

    Every asyncio.run() creates a new event loop, and asyncpg connections can't
    be reused across loops — so dispose the pool after each run, or the next
    task fails with "attached to a different loop".
    """
    async def wrapper():
        from app.core.database import engine
        try:
            return await coro
        finally:
            await engine.dispose()
    return asyncio.run(wrapper())


@celery_app.task(name="send_order_push")
def send_order_push(user_id: str, order_number: str, status: str, extra: dict | None = None):
    """Order lifecycle push: placed / delivered / cancelled (and legacy statuses)."""
    from app.services.notification_service import order_message
    extra = extra or {}
    title, body = order_message(status, order_number, **extra)

    async def _send():
        from app.core.database import AsyncSessionLocal
        from app.services.notification_service import send_push_notification
        async with AsyncSessionLocal() as db:
            await send_push_notification(
                user_id, title, body,
                {"type": "order", "event": status, "order_id": extra.get("order_id"), "order_number": order_number},
                db, channel_id="orders",
            )

    _run(_send())


async def _notify_arriving(order_id: str, db) -> bool:
    """Send "arriving soon + rider details" once. Returns True if sent."""
    from sqlalchemy import update
    from app.models.order import Order, OrderStatus
    from app.models.user import User
    from app.services.notification_service import order_message, send_push_notification

    order = await db.get(Order, order_id)
    if (not order or not order.rider_id or order.arriving_notified_at is not None
            or order.status in (OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.REFUNDED)):
        return False

    # Claim atomically: the periodic check and the out_for_delivery trigger
    # can race, and the customer must get this exactly once.
    claimed = await db.execute(
        update(Order)
        .where(Order.id == order_id, Order.arriving_notified_at.is_(None))
        .values(arriving_notified_at=datetime.now(timezone.utc))
    )
    await db.commit()
    if claimed.rowcount != 1:
        return False

    rider = await db.get(User, order.rider_id)
    title, body = order_message(
        "arriving", order.order_number,
        rider_name=rider.name if rider else None,
        rider_phone=rider.phone if rider and rider.phone and not rider.phone.startswith("e_") else None,
    )
    await send_push_notification(
        order.user_id, title, body,
        {"type": "order", "event": "arriving", "order_id": order.id, "order_number": order.order_number},
        db, channel_id="orders",
    )
    return True


@celery_app.task(name="notify_order_arriving")
def notify_order_arriving(order_id: str):
    """Immediate "arriving soon" push — fired when a rider goes out for delivery."""
    async def _go():
        from app.core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            await _notify_arriving(order_id, db)
    _run(_go())


@celery_app.task(name="send_arriving_soon_notifications")
def send_arriving_soon_notifications():
    """Every minute: push "arriving soon" for orders whose slot is ≤15 min away."""
    _run(_send_arriving_soon_notifications())


async def _send_arriving_soon_notifications():
    from sqlalchemy import select, or_, and_
    from app.core.database import AsyncSessionLocal
    from app.models.order import Order, OrderStatus, PaymentMethod

    now = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Order.id).where(
                Order.rider_id.is_not(None),
                Order.arriving_notified_at.is_(None),
                Order.estimated_delivery_at.is_not(None),
                Order.estimated_delivery_at <= now + ARRIVING_LEAD,
                Order.estimated_delivery_at >= now - ARRIVING_STALE_AFTER,
                or_(
                    Order.status.in_([OrderStatus.CONFIRMED, OrderStatus.PACKING, OrderStatus.OUT_FOR_DELIVERY]),
                    # COD orders can stay "pending" until the store confirms them.
                    and_(Order.status == OrderStatus.PENDING, Order.payment_method == PaymentMethod.COD),
                ),
            )
        )
        for order_id in result.scalars().all():
            try:
                await _notify_arriving(order_id, db)
            except Exception:
                logger.exception("Arriving-soon push failed for order %s", order_id)


@celery_app.task(name="send_daily_no_order_reminder")
def send_daily_no_order_reminder():
    """Nudge users who haven't placed an order yet today (IST). Runs once a day via Celery beat."""
    _run(_send_daily_no_order_reminder())


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
