"""Delivery mode, scheduled slots and express estimates.

Business rule (Asia/Kolkata, evaluated on the SERVER clock at order time):

    09:00 ≤ now < 20:00  → "normal" (express): no slot; delivered in an
                            estimated number of minutes based on the address.
    now ≥ 20:00          → "scheduled" for the NEXT calendar day.
    now < 09:00          → "scheduled" for the SAME calendar day (it's already
                            the delivery day — never push a 2 AM order to the
                            day after).

Scheduled orders must pick an hourly slot (9:00 AM … 8:00 PM). Hours, slots,
slot capacity and the default estimate come from settings. The backend owns
this rule; clients only render what GET /orders/delivery-slots returns, and
order creation re-derives everything from the server clock.
"""
import math
from datetime import date, datetime, time, timedelta, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

# Asia/Kolkata is UTC+5:30 with no DST; a fixed offset avoids depending on the
# OS tz database (python:3.12-slim images don't ship one).
IST = timezone(timedelta(hours=5, minutes=30))

NORMAL = "normal"
SCHEDULED = "scheduled"


def now_ist(now: Optional[datetime] = None) -> datetime:
    return (now or datetime.now(timezone.utc)).astimezone(IST)


def delivery_mode(now: Optional[datetime] = None) -> str:
    n = now_ist(now)
    return NORMAL if settings.DELIVERY_OPEN_HOUR <= n.hour < settings.DELIVERY_CUTOFF_HOUR else SCHEDULED


def scheduled_date(now: Optional[datetime] = None) -> date:
    """Delivery day for a scheduled order (only meaningful outside express hours)."""
    n = now_ist(now)
    if n.hour >= settings.DELIVERY_CUTOFF_HOUR:
        return n.date() + timedelta(days=1)
    return n.date()  # before opening: later the same day


def slot_hours() -> range:
    return range(settings.DELIVERY_SLOT_START_HOUR, settings.DELIVERY_SLOT_END_HOUR + 1)


def _slot_value(hour: int) -> str:
    return f"{hour:02d}:00"


def _slot_label(hour: int) -> str:
    h12 = hour % 12 or 12
    return f"{h12}:00 {'AM' if hour < 12 else 'PM'}"


def _date_label(d: date, now: Optional[datetime] = None) -> str:
    today = now_ist(now).date()
    prefix = "Today" if d == today else "Tomorrow" if d == today + timedelta(days=1) else d.strftime("%A")
    return f"{prefix}, {d.strftime('%A %d %B')}"


# ── Express estimate (location-based) ────────────────────────────────────────

def _distance_km(lat1, lng1, lat2, lng2) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _zone_matches(zone, address) -> bool:
    coverage = zone.coverage or {}
    pincodes = {str(p).strip() for p in coverage.get("pincodes") or []}
    if address.pincode and str(address.pincode).strip() in pincodes:
        return True
    c = coverage.get("coordinates") or {}
    if (address.latitude is not None and address.longitude is not None
            and c.get("lat") is not None and c.get("lng") is not None and c.get("radius_km")):
        return _distance_km(address.latitude, address.longitude, c["lat"], c["lng"]) <= float(c["radius_km"])
    return False


async def estimate_delivery_minutes(address, db: AsyncSession) -> tuple[int, str]:
    """Express delivery estimate for an address → (minutes, source).

    Uses the admin-configured delivery zones (matched by pincode, or by
    lat/lng inside a zone's radius) and their estimated_delivery_time_minutes.
    Falls back to DEFAULT_DELIVERY_MINUTES only when no zone matches — no
    invented distance or traffic maths. This is the single place to plug in
    a richer estimator (store distance, rider availability) later.
    """
    if address is not None:
        from app.models.settings import DeliveryZone
        zones = (await db.execute(select(DeliveryZone).where(DeliveryZone.is_active))).scalars().all()
        for zone in zones:
            if zone.estimated_delivery_time_minutes and _zone_matches(zone, address):
                return int(zone.estimated_delivery_time_minutes), f"zone:{zone.name}"
    return settings.DEFAULT_DELIVERY_MINUTES, "default"


def _estimate_range(minutes: int) -> tuple[int, int]:
    return max(10, minutes - settings.DELIVERY_ESTIMATE_SPREAD_MINUTES), minutes


# ── Slot capacity ────────────────────────────────────────────────────────────

async def _booked_per_slot(d: date, db: AsyncSession) -> dict[str, int]:
    from app.models.order import Order, OrderStatus
    rows = await db.execute(
        select(Order.scheduled_delivery_slot, func.count(Order.id))
        .where(
            Order.delivery_type == SCHEDULED,
            Order.scheduled_delivery_date == d,
            Order.status.notin_([OrderStatus.CANCELLED, OrderStatus.REFUNDED]),
        )
        .group_by(Order.scheduled_delivery_slot)
    )
    return dict(rows.all())


async def _lock_slot(d: date, slot: str, db: AsyncSession) -> None:
    """Serialize bookings of one slot so concurrent orders can't overfill it
    (transaction-scoped Postgres advisory lock; no-op on other databases)."""
    if db.bind.dialect.name == "postgresql":
        key = f"slot:{d.isoformat()}:{slot}"
        await db.execute(text("SELECT pg_advisory_xact_lock(hashtext(:k))"), {"k": key})


# ── Public API ───────────────────────────────────────────────────────────────

async def delivery_options(db: AsyncSession, address=None, now: Optional[datetime] = None) -> dict:
    """What checkout should show right now (GET /orders/delivery-slots)."""
    mode = delivery_mode(now)
    if mode == NORMAL:
        minutes, source = await estimate_delivery_minutes(address, db)
        lo, hi = _estimate_range(minutes)
        return {
            "mode": NORMAL,
            "estimate_minutes": minutes,
            "estimate_min": lo,
            "estimate_max": hi,
            "estimate_label": f"Estimated delivery in {lo}–{hi} minutes",
            "estimate_source": source,
            # Legacy keys (older clients render a picker only when slots exist).
            "date": None,
            "date_label": None,
            "slots": [],
        }
    d = scheduled_date(now)
    booked = await _booked_per_slot(d, db)
    return {
        "mode": SCHEDULED,
        "date": d.isoformat(),
        "date_label": _date_label(d, now),
        "cutoff_label": "8:00 PM",
        "slots": [
            {
                "value": _slot_value(h),
                "label": _slot_label(h),
                "available": booked.get(_slot_value(h), 0) < settings.DELIVERY_SLOT_CAPACITY,
            }
            for h in slot_hours()
        ],
    }


async def resolve_delivery(db: AsyncSession, *, address=None, slot: Optional[str] = None,
                           requested_date: Optional[str] = None,
                           now: Optional[datetime] = None) -> dict:
    """Decide and validate the delivery for an order being created.

    Re-derived from the server clock every time (including payment retries,
    which reuse the order created here). Returns the Order column values.
    """
    placed = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    if delivery_mode(placed) == NORMAL:
        # Any slot a client sent (e.g. checkout opened before 9 AM) is ignored:
        # the order was accepted during express hours.
        minutes, _ = await estimate_delivery_minutes(address, db)
        return {
            "delivery_type": NORMAL,
            "estimated_delivery_minutes": minutes,
            "scheduled_delivery_date": None,
            "scheduled_delivery_slot": None,
            "estimated_delivery_at": placed + timedelta(minutes=minutes),
            "order_placed_at": placed,
        }

    d = scheduled_date(placed)
    label = d.strftime("%A %d %B")
    if requested_date and requested_date != d.isoformat():
        # Checkout showed a different delivery day than the server now derives
        # (a stale page) — make the customer re-confirm. Note 11:58 PM and
        # 00:05 AM both resolve to the same morning, so midnight doesn't trip this.
        raise HTTPException(status_code=409, detail=f"Delivery date has changed to {label}. Please choose your delivery slot again.")
    if not slot:
        # 409 (not 400) so clients reload delivery options: typically checkout
        # was opened before 8 PM and the order placed after.
        raise HTTPException(status_code=409, detail=f"Orders placed after 8:00 PM are delivered on {label}. Please choose a delivery slot.")
    valid = {_slot_value(h): h for h in slot_hours()}
    if slot not in valid:
        raise HTTPException(status_code=400, detail="Invalid delivery slot. Please choose one of the available times.")

    await _lock_slot(d, slot, db)
    if (await _booked_per_slot(d, db)).get(slot, 0) >= settings.DELIVERY_SLOT_CAPACITY:
        raise HTTPException(status_code=409, detail=f"The {_slot_label(valid[slot])} slot is full. Please choose another time.")

    return {
        "delivery_type": SCHEDULED,
        "estimated_delivery_minutes": None,
        "scheduled_delivery_date": d,
        "scheduled_delivery_slot": slot,
        "estimated_delivery_at": datetime.combine(d, time(hour=valid[slot]), tzinfo=IST).astimezone(timezone.utc),
        "order_placed_at": placed,
    }
