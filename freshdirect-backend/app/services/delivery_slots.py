"""Scheduled delivery slots.

Rule: orders placed before 8 PM IST are delivered tomorrow; orders placed at
or after 8 PM are delivered the day after tomorrow. The customer picks an
hourly slot between 9 AM and 8 PM. The backend owns this rule so the app,
the storefront and order creation can never disagree.
"""
from datetime import date, datetime, time, timedelta, timezone
from typing import Optional

from fastapi import HTTPException

IST = timezone(timedelta(hours=5, minutes=30))
CUTOFF_HOUR = 20  # 8 PM IST
SLOT_HOURS = range(9, 21)  # 9 AM … 8 PM, hourly


def _now_ist(now: Optional[datetime] = None) -> datetime:
    return (now or datetime.now(timezone.utc)).astimezone(IST)


def delivery_date(now: Optional[datetime] = None) -> date:
    n = _now_ist(now)
    return n.date() + timedelta(days=1 if n.hour < CUTOFF_HOUR else 2)


def _slot_value(hour: int) -> str:
    return f"{hour:02d}:00"


def _slot_label(hour: int) -> str:
    h12 = hour % 12 or 12
    return f"{h12}:00 {'AM' if hour < 12 else 'PM'}"


def available_slots(now: Optional[datetime] = None) -> dict:
    d = delivery_date(now)
    is_tomorrow = d == _now_ist(now).date() + timedelta(days=1)
    return {
        "date": d.isoformat(),
        "date_label": f"{'Tomorrow' if is_tomorrow else 'Day after tomorrow'}, {d.strftime('%a %d %b')}",
        "cutoff_label": "8:00 PM",
        "slots": [{"value": _slot_value(h), "label": _slot_label(h)} for h in SLOT_HOURS],
    }


def resolve_slot(slot: Optional[str], requested_date: Optional[str] = None,
                 now: Optional[datetime] = None) -> datetime:
    """Turn the customer's chosen slot into the order's delivery datetime (UTC).

    `slot` is "HH:00"; when omitted (older app/web builds) the first slot is
    used. If the client sends the date it showed and the 8 PM cutoff passed
    in between, reject with 409 so the customer re-confirms the new date
    instead of being silently pushed a day later.
    """
    d = delivery_date(now)
    if requested_date and requested_date != d.isoformat():
        raise HTTPException(
            status_code=409,
            detail=f"Delivery date has changed to {d.strftime('%a %d %b')} (orders after 8 PM are delivered "
                   "the day after tomorrow). Please choose your slot again.",
        )
    if slot is None:
        hour = SLOT_HOURS[0]
    else:
        valid = {_slot_value(h): h for h in SLOT_HOURS}
        if slot not in valid:
            raise HTTPException(status_code=400, detail="Invalid delivery slot. Please choose a time between 9 AM and 8 PM.")
        hour = valid[slot]
    return datetime.combine(d, time(hour=hour), tzinfo=IST).astimezone(timezone.utc)
