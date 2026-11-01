"""When to remind a customer to add family details.

Never shown once they have a family member. Otherwise at most once per
FAMILY_REMINDER_MIN_INTERVAL_HOURS, and not for FAMILY_REMINDER_COOLDOWN_DAYS
after they dismiss it or remove their last member. State lives on the user row,
so it follows them across devices. Tune the behaviour via settings.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import FamilyMember, User


def _aware(dt: datetime) -> datetime:
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def next_eligible_at(user: User) -> datetime | None:
    """Earliest time the timers allow a reminder (None = no timer running)."""
    cooldown = timedelta(days=settings.FAMILY_REMINDER_COOLDOWN_DAYS)
    interval = timedelta(hours=settings.FAMILY_REMINDER_MIN_INTERVAL_HOURS)
    limits = []
    if user.family_reminder_last_shown_at:
        limits.append(_aware(user.family_reminder_last_shown_at) + interval)
    if user.family_reminder_last_dismissed_at:
        limits.append(_aware(user.family_reminder_last_dismissed_at) + cooldown)
    if user.family_members_cleared_at:
        limits.append(_aware(user.family_members_cleared_at) + cooldown)
    return max(limits) if limits else None


def is_eligible(user: User, member_count: int, now: datetime | None = None) -> bool:
    if not settings.FAMILY_REMINDER_ENABLED or member_count > 0:
        return False
    now = now or datetime.now(timezone.utc)
    limit = next_eligible_at(user)
    return limit is None or now >= limit


async def family_member_count(user_id: str, db: AsyncSession) -> int:
    result = await db.execute(select(func.count(FamilyMember.id)).where(FamilyMember.user_id == user_id))
    return result.scalar() or 0


def serialize_status(user: User, member_count: int) -> dict:
    shown, dismissed = user.family_reminder_last_shown_at, user.family_reminder_last_dismissed_at
    return {
        "eligible": is_eligible(user, member_count),
        "family_member_count": member_count,
        "last_shown_at": shown.isoformat() if shown else None,
        "last_dismissed_at": dismissed.isoformat() if dismissed else None,
        "impressions": user.family_reminder_impressions or 0,
        "cooldown_days": settings.FAMILY_REMINDER_COOLDOWN_DAYS,
        "min_interval_hours": settings.FAMILY_REMINDER_MIN_INTERVAL_HOURS,
    }


async def claim_impression(user: User, db: AsyncSession) -> bool:
    """Atomically record an impression. True means this caller may show the popup.

    The conditional UPDATE stops two devices opening at once both showing it.
    """
    now = datetime.now(timezone.utc)
    if not is_eligible(user, await family_member_count(user.id, db), now):
        return False
    cutoff = now - timedelta(hours=settings.FAMILY_REMINDER_MIN_INTERVAL_HOURS)
    claimed = await db.execute(
        update(User)
        .where(
            User.id == user.id,
            or_(User.family_reminder_last_shown_at.is_(None), User.family_reminder_last_shown_at <= cutoff),
        )
        .values(
            family_reminder_last_shown_at=now,
            family_reminder_impressions=func.coalesce(User.family_reminder_impressions, 0) + 1,
        )
        .execution_options(synchronize_session=False)
    )
    return claimed.rowcount == 1
