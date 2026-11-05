"""Read-only deploy check; does not send customer notifications or expose tokens."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text  # noqa: E402
from app.core.database import engine  # noqa: E402
from app.core.redis_client import get_redis, close_redis  # noqa: E402
from app.worker import celery_app  # noqa: E402

REQUIRED_TASKS = {
    "send_order_push", "notify_order_arriving",
    "send_arriving_soon_notifications", "send_daily_no_order_reminder",
}


async def check_dependencies():
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        await (await get_redis()).ping()
    finally:
        await close_redis()
        await engine.dispose()


def main():
    asyncio.run(check_dependencies())
    inspector = celery_app.control.inspect(timeout=10)
    registered = inspector.registered() or {}
    if not any(REQUIRED_TASKS.issubset(set(tasks)) for tasks in registered.values()):
        raise RuntimeError("No responding Celery worker has all notification tasks registered")
    print("PASS: database, API Redis, Celery broker and notification task registration")
    print("Device receipt and scheduler execution must be verified separately in production")


if __name__ == "__main__":
    main()
