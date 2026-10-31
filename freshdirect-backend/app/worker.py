from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "Gmart",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Kolkata",
    enable_utc=True,
    # Nothing reads task results; storing them would pile up a Redis key per
    # run of the every-minute arriving-soon check.
    task_ignore_result=True,
    beat_schedule={
        # "Arriving soon + rider details" push ~15 min before each delivery slot.
        "arriving-soon-notifications": {
            "task": "send_arriving_soon_notifications",
            "schedule": 60.0,  # every minute
        },
        "daily-no-order-reminder": {
            "task": "send_daily_no_order_reminder",
            "schedule": crontab(hour=19, minute=30),  # 7:30 PM IST daily (celery timezone is Asia/Kolkata)
        },
    },
)
