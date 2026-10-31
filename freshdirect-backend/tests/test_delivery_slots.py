import unittest
from datetime import datetime, timezone

from fastapi import HTTPException
from pydantic import ValidationError

from app.schemas.user import FamilyMemberCreate
from app.services.delivery_slots import IST, available_slots, delivery_date, resolve_slot


def ist(y, m, d, h, mi=0):
    return datetime(y, m, d, h, mi, tzinfo=IST)


class DeliverySlotTests(unittest.TestCase):
    def test_before_8pm_delivers_tomorrow(self):
        self.assertEqual(delivery_date(ist(2026, 10, 31, 19, 59)).isoformat(), "2026-11-01")

    def test_at_or_after_8pm_delivers_day_after_tomorrow(self):
        self.assertEqual(delivery_date(ist(2026, 10, 31, 20, 0)).isoformat(), "2026-11-02")
        self.assertEqual(delivery_date(ist(2026, 10, 31, 23, 30)).isoformat(), "2026-11-02")

    def test_uses_ist_not_utc(self):
        # 15:00 UTC is 20:30 IST — already past the cutoff.
        now_utc = datetime(2026, 10, 31, 15, 0, tzinfo=timezone.utc)
        self.assertEqual(delivery_date(now_utc).isoformat(), "2026-11-02")

    def test_slots_are_hourly_9am_to_8pm(self):
        info = available_slots(ist(2026, 10, 31, 10))
        labels = [s["label"] for s in info["slots"]]
        self.assertEqual(labels[0], "9:00 AM")
        self.assertEqual(labels[3], "12:00 PM")
        self.assertEqual(labels[-1], "8:00 PM")
        self.assertEqual(len(labels), 12)
        self.assertTrue(info["date_label"].startswith("Tomorrow"))
        self.assertTrue(available_slots(ist(2026, 10, 31, 21))["date_label"].startswith("Day after tomorrow"))

    def test_resolve_slot_returns_utc_datetime_for_ist_slot(self):
        at = resolve_slot("10:00", "2026-11-01", now=ist(2026, 10, 31, 12))
        self.assertEqual(at, ist(2026, 11, 1, 10).astimezone(timezone.utc))

    def test_missing_slot_defaults_to_first_slot(self):
        at = resolve_slot(None, None, now=ist(2026, 10, 31, 12))
        self.assertEqual(at.astimezone(IST).hour, 9)

    def test_invalid_slot_rejected(self):
        for bad in ("08:00", "21:00", "10:30", "soon"):
            with self.assertRaises(HTTPException) as e:
                resolve_slot(bad, None, now=ist(2026, 10, 31, 12))
            self.assertEqual(e.exception.status_code, 400)

    def test_cutoff_passing_mid_checkout_asks_to_reconfirm(self):
        # Client showed tomorrow's date at 19:58; order submitted at 20:01.
        with self.assertRaises(HTTPException) as e:
            resolve_slot("10:00", "2026-11-01", now=ist(2026, 10, 31, 20, 1))
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
