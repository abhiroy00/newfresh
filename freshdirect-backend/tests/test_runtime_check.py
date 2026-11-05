import unittest
from unittest.mock import AsyncMock, Mock, patch

from scripts import check_runtime


class RuntimeCheckTests(unittest.TestCase):
    def run_check(self, registered):
        inspector = Mock()
        inspector.registered.return_value = registered
        with patch.object(check_runtime, "check_dependencies", AsyncMock()), \
                patch.object(check_runtime.celery_app.control, "inspect", return_value=inspector):
            check_runtime.main()

    def test_requires_a_responding_worker(self):
        with self.assertRaises(RuntimeError):
            self.run_check(None)

    def test_rejects_worker_missing_notification_tasks(self):
        with self.assertRaises(RuntimeError):
            self.run_check({"worker": ["send_order_push"]})

    def test_accepts_worker_with_all_notification_tasks(self):
        self.run_check({"worker": list(check_runtime.REQUIRED_TASKS)})
