import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from pydantic import ValidationError

from app.schemas.user import FamilyMemberCreate
from app.services import delivery_slots as ds
from app.services.delivery_slots import IST, delivery_mode, scheduled_date


def ist(y, m, d, h, mi=0, s=0):
    return datetime(y, m, d, h, mi, s, tzinfo=IST)


MON = (2026, 11, 2)  # Monday 2 Nov 2026


class DeliveryModeMatrixTests(unittest.TestCase):
    """Every row of the business table: order time → mode and delivery date."""
    CASES = [
        # (hour, minute, second, day_offset_of_order, expected_mode, expected_delivery_date)
        ((0, 0, 0), "scheduled", "2026-11-02"),    # 12:00 AM Mon → same day
        ((2, 0, 0), "scheduled", "2026-11-02"),    # 2:00 AM Mon → same day (never Tue)
        ((6, 0, 0), "scheduled", "2026-11-02"),
        ((8, 30, 0), "scheduled", "2026-11-02"),
        ((8, 59, 59), "scheduled", "2026-11-02"),  # 8:59:59 AM → same day
        ((9, 0, 0), "normal", None),               # 9:00 AM → express
        ((10, 30, 0), "normal", None),
        ((12, 0, 0), "normal", None),
        ((14, 0, 0), "normal", None),
        ((18, 30, 0), "normal", None),
        ((19, 59, 59), "normal", None),            # 7:59:59 PM → still express
        ((20, 0, 0), "scheduled", "2026-11-03"),   # 8:00 PM Mon → Tue
        ((20, 30, 0), "scheduled", "2026-11-03"),
        ((21, 0, 0), "scheduled", "2026-11-03"),
        ((22, 0, 0), "scheduled", "2026-11-03"),
        ((23, 30, 0), "scheduled", "2026-11-03"),
        ((23, 59, 59), "scheduled", "2026-11-03"),
    ]

    def test_matrix(self):
        for (h, m, s), mode, expected_date in self.CASES:
            with self.subTest(time=f"{h:02d}:{m:02d}:{s:02d}"):
                now = ist(*MON, h, m, s)
                self.assertEqual(delivery_mode(now), mode)
                if expected_date:
                    self.assertEqual(scheduled_date(now).isoformat(), expected_date)

    def test_uses_business_timezone_not_utc(self):
        # 14:30 UTC = 20:00 IST → scheduled, although it's afternoon in UTC.
        self.assertEqual(delivery_mode(datetime(2026, 11, 2, 14, 30, tzinfo=timezone.utc)), "scheduled")
        # 03:30 UTC = 09:00 IST → express.
        self.assertEqual(delivery_mode(datetime(2026, 11, 2, 3, 30, tzinfo=timezone.utc)), "normal")

    def test_month_and_year_rollover(self):
        self.assertEqual(scheduled_date(ist(2026, 11, 30, 21)).isoformat(), "2026-12-01")
        self.assertEqual(scheduled_date(ist(2026, 12, 31, 22)).isoformat(), "2027-01-01")


def db_with(booked=None, zones=()):
    """Fake session: first execute → zones (for estimates), booking counts otherwise."""
    async def execute(stmt, *a, **k):
        sql = str(stmt)
        if "delivery_zones" in sql:
            return SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: list(zones)))
        return SimpleNamespace(all=lambda: list((booked or {}).items()))
    return SimpleNamespace(execute=AsyncMock(side_effect=execute),
                           bind=SimpleNamespace(dialect=SimpleNamespace(name="sqlite")))


class OptionsTests(unittest.IsolatedAsyncioTestCase):
    async def test_daytime_shows_express_estimate_and_no_slots(self):
        opts = await ds.delivery_options(db_with(), now=ist(*MON, 12))
        self.assertEqual(opts["mode"], "normal")
        self.assertEqual(opts["slots"], [])
        self.assertIsNone(opts["date"])
        self.assertEqual(opts["estimate_label"], "Estimated delivery in 35–45 minutes")

    async def test_evening_shows_tomorrow_and_12_hourly_slots(self):
        opts = await ds.delivery_options(db_with(), now=ist(*MON, 21))
        self.assertEqual(opts["mode"], "scheduled")
        self.assertEqual(opts["date_label"], "Tomorrow, Tuesday 03 November")
        self.assertEqual([s["label"] for s in opts["slots"]][:3], ["9:00 AM", "10:00 AM", "11:00 AM"])
        self.assertEqual(opts["slots"][-1]["label"], "8:00 PM")
        self.assertEqual(len(opts["slots"]), 12)
        self.assertNotIn("estimate_label", opts)

    async def test_early_morning_shows_today(self):
        opts = await ds.delivery_options(db_with(), now=ist(*MON, 2))
        self.assertEqual(opts["date_label"], "Today, Monday 02 November")

    async def test_full_slot_is_marked_unavailable(self):
        with patch.object(ds.settings, "DELIVERY_SLOT_CAPACITY", 2):
            opts = await ds.delivery_options(db_with(booked={"10:00": 2}), now=ist(*MON, 21))
        self.assertFalse(next(s for s in opts["slots"] if s["value"] == "10:00")["available"])
        self.assertTrue(next(s for s in opts["slots"] if s["value"] == "11:00")["available"])

    async def test_estimate_uses_matching_delivery_zone(self):
        zone = SimpleNamespace(name="Central", estimated_delivery_time_minutes=30,
                               coverage={"pincodes": ["110001"]}, is_active=True)
        addr = SimpleNamespace(pincode="110001", latitude=None, longitude=None)
        far = SimpleNamespace(pincode="560001", latitude=None, longitude=None)
        opts = await ds.delivery_options(db_with(zones=[zone]), address=addr, now=ist(*MON, 12))
        self.assertEqual((opts["estimate_minutes"], opts["estimate_source"]), (30, "zone:Central"))
        opts = await ds.delivery_options(db_with(zones=[zone]), address=far, now=ist(*MON, 12))
        self.assertEqual((opts["estimate_minutes"], opts["estimate_source"]), (45, "default"))

    async def test_estimate_matches_zone_by_coordinates(self):
        zone = SimpleNamespace(name="Radius", estimated_delivery_time_minutes=25, is_active=True,
                               coverage={"coordinates": {"lat": 28.6139, "lng": 77.2090, "radius_km": 5}})
        near = SimpleNamespace(pincode=None, latitude=28.62, longitude=77.21)
        minutes, source = await ds.estimate_delivery_minutes(near, db_with(zones=[zone]))
        self.assertEqual((minutes, source), (25, "zone:Radius"))


class ResolveTests(unittest.IsolatedAsyncioTestCase):
    async def test_daytime_order_needs_no_slot_and_stores_estimate(self):
        d = await ds.resolve_delivery(db_with(), now=ist(*MON, 12))
        self.assertEqual(d["delivery_type"], "normal")
        self.assertEqual(d["estimated_delivery_minutes"], 45)
        self.assertIsNone(d["scheduled_delivery_slot"])
        self.assertEqual((d["estimated_delivery_at"] - d["order_placed_at"]).total_seconds(), 45 * 60)

    async def test_daytime_order_ignores_a_stale_slot(self):
        # Checkout opened at 8:55 AM (slots shown), order placed at 9:02 AM.
        d = await ds.resolve_delivery(db_with(), slot="10:00", requested_date="2026-11-02", now=ist(*MON, 9, 2))
        self.assertEqual(d["delivery_type"], "normal")

    async def test_evening_order_requires_a_slot(self):
        with self.assertRaises(HTTPException) as e:
            await ds.resolve_delivery(db_with(), now=ist(*MON, 20, 5))
        self.assertEqual(e.exception.status_code, 409)  # client reloads options and asks for a slot

    async def test_evening_order_with_slot_is_scheduled_next_day(self):
        d = await ds.resolve_delivery(db_with(), slot="10:00", requested_date="2026-11-03", now=ist(*MON, 21))
        self.assertEqual((d["delivery_type"], d["scheduled_delivery_slot"]), ("scheduled", "10:00"))
        self.assertEqual(d["scheduled_delivery_date"].isoformat(), "2026-11-03")
        self.assertEqual(d["estimated_delivery_at"], ist(2026, 11, 3, 10).astimezone(timezone.utc))
        self.assertIsNone(d["estimated_delivery_minutes"])

    async def test_2am_order_is_scheduled_same_day(self):
        d = await ds.resolve_delivery(db_with(), slot="09:00", requested_date="2026-11-02", now=ist(*MON, 2))
        self.assertEqual(d["scheduled_delivery_date"].isoformat(), "2026-11-02")

    async def test_invalid_slots_rejected(self):
        for bad in ("08:00", "21:00", "10:30", "soon"):
            with self.subTest(slot=bad), self.assertRaises(HTTPException) as e:
                await ds.resolve_delivery(db_with(), slot=bad, now=ist(*MON, 21))
            self.assertEqual(e.exception.status_code, 400)

    async def test_wrong_date_from_stale_checkout_rejected(self):
        with self.assertRaises(HTTPException) as e:
            await ds.resolve_delivery(db_with(), slot="10:00", requested_date="2026-11-02", now=ist(*MON, 21))
        self.assertEqual(e.exception.status_code, 409)

    async def test_full_slot_rejected(self):
        with patch.object(ds.settings, "DELIVERY_SLOT_CAPACITY", 3), self.assertRaises(HTTPException) as e:
            await ds.resolve_delivery(db_with(booked={"10:00": 3}), slot="10:00", now=ist(*MON, 21))
        self.assertEqual(e.exception.status_code, 409)


class FamilyMemberGenderTests(unittest.TestCase):
    def test_gender_accepts_known_values_and_is_optional(self):
        self.assertEqual(FamilyMemberCreate(age=30, weight_kg=70, gender="female").gender, "female")
        self.assertIsNone(FamilyMemberCreate(age=30, weight_kg=70).gender)

    def test_gender_rejects_unknown_values(self):
        with self.assertRaises(ValidationError):
            FamilyMemberCreate(age=30, weight_kg=70, gender="x")


if __name__ == "__main__":
    unittest.main()
