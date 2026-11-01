import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import patch

from app.services import family_reminder as fr

NOW = datetime(2026, 11, 2, 12, 0, tzinfo=timezone.utc)


def user(shown=None, dismissed=None, cleared=None):
    ago = lambda v: NOW - v if v is not None else None  # noqa: E731
    return SimpleNamespace(
        family_reminder_last_shown_at=ago(shown),
        family_reminder_last_dismissed_at=ago(dismissed),
        family_members_cleared_at=ago(cleared),
        family_reminder_impressions=0,
    )


class EligibilityTests(unittest.TestCase):
    def test_new_user_without_family_is_eligible(self):
        self.assertTrue(fr.is_eligible(user(), 0, NOW))

    def test_never_eligible_once_a_family_member_exists(self):
        self.assertFalse(fr.is_eligible(user(), 1, NOW))
        self.assertFalse(fr.is_eligible(user(shown=timedelta(days=365)), 3, NOW))

    def test_at_most_once_per_interval(self):
        self.assertFalse(fr.is_eligible(user(shown=timedelta(hours=23)), 0, NOW))
        self.assertTrue(fr.is_eligible(user(shown=timedelta(hours=24)), 0, NOW))

    def test_dismissal_starts_the_cooldown(self):
        self.assertFalse(fr.is_eligible(user(dismissed=timedelta(days=2, hours=23)), 0, NOW))
        self.assertTrue(fr.is_eligible(user(dismissed=timedelta(days=3)), 0, NOW))

    def test_removing_last_member_starts_the_cooldown(self):
        self.assertFalse(fr.is_eligible(user(cleared=timedelta(days=1)), 0, NOW))
        self.assertTrue(fr.is_eligible(user(cleared=timedelta(days=3)), 0, NOW))

    def test_the_latest_timer_wins(self):
        self.assertFalse(fr.is_eligible(user(shown=timedelta(days=10), dismissed=timedelta(days=1)), 0, NOW))

    def test_frequency_is_configurable(self):
        with patch.object(fr.settings, "FAMILY_REMINDER_COOLDOWN_DAYS", 7):
            self.assertFalse(fr.is_eligible(user(dismissed=timedelta(days=5)), 0, NOW))
        with patch.object(fr.settings, "FAMILY_REMINDER_MIN_INTERVAL_HOURS", 1):
            self.assertTrue(fr.is_eligible(user(shown=timedelta(hours=2)), 0, NOW))
        with patch.object(fr.settings, "FAMILY_REMINDER_ENABLED", False):
            self.assertFalse(fr.is_eligible(user(), 0, NOW))

    def test_timestamps_without_a_zone_are_read_as_utc(self):
        u = user()
        u.family_reminder_last_dismissed_at = (NOW - timedelta(days=4)).replace(tzinfo=None)
        self.assertTrue(fr.is_eligible(u, 0, NOW))


if __name__ == "__main__":
    unittest.main()
