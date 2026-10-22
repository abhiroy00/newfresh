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
    beat_schedule={
        "daily-no-order-reminder": {
            "task": "send_daily_no_order_reminder",
            "schedule": crontab(hour=20, minute=0),  # 8 PM IST daily
        },
    },
)
