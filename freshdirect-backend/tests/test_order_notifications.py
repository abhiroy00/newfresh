import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from app.models.order import OrderStatus
from app.services import notification_service as ns
from app import tasks


class OrderMessageTests(unittest.TestCase):
    def test_placed_includes_amount_and_ist_slot(self):
        title, body = ns.order_message("placed", "FD-1", total=488.0,
                                       delivery_at="2026-11-02T04:30:00+00:00")  # 10:00 IST
        self.assertEqual(title, "Order placed 🎉")
        self.assertIn("#FD-1 (₹488)", body)
        self.assertIn("Mon 2 Nov, 10:00 AM", body)

    def test_slot_without_timezone_is_read_as_utc(self):
        # A zone-less timestamp from the DB is UTC, not the server's local time.
        _, body = ns.order_message("placed", "FD-1", delivery_at="2026-11-02T04:30:00")
        self.assertIn("Mon 2 Nov, 10:00 AM", body)

    def test_arriving_includes_rider_name_and_phone(self):
        _, body = ns.order_message("arriving", "FD-1", rider_name="Rahul", rider_phone="+919876543210")
        self.assertIn("Rahul", body)
        self.assertIn("+919876543210", body)
        self.assertIn("10–15 minutes", body)

    def test_arriving_without_rider_name_still_reads_well(self):
        _, body = ns.order_message("arriving", "FD-1")
        self.assertTrue(body.startswith("Our delivery partner"))

    def test_delivered(self):
        title, body = ns.order_message("delivered", "FD-1")
        self.assertEqual(title, "Order delivered ✅")
        self.assertIn("delivered successfully", body)


class DispatchTests(unittest.TestCase):
    def order(self, status):
        return SimpleNamespace(id="o1", user_id="u1", order_number="FD-1", total=100.0,
                               estimated_delivery_at=None, status=status)

    def test_status_changes_route_to_the_right_notification(self):
        with patch.object(ns, "_enqueue") as enq:
            ns.notify_status_change(self.order(OrderStatus.OUT_FOR_DELIVERY), OrderStatus.CONFIRMED)
            ns.notify_status_change(self.order(OrderStatus.DELIVERED), OrderStatus.OUT_FOR_DELIVERY)
            ns.notify_status_change(self.order(OrderStatus.PACKING), OrderStatus.CONFIRMED)  # no push
            ns.notify_status_change(self.order(OrderStatus.DELIVERED), OrderStatus.DELIVERED)  # unchanged
        calls = [c.args for c in enq.call_args_list]
        self.assertEqual(calls[0], ("notify_order_arriving", ["o1"]))
        self.assertEqual(calls[1][0], "send_order_push")
        self.assertEqual(calls[1][1][2], "delivered")
        self.assertEqual(len(calls), 2)

    def test_notification_failures_never_raise(self):
        broken = SimpleNamespace(id="o1")  # missing fields
        ns.queue_order_event("placed", broken)  # must not raise
        with patch("app.worker.celery_app.send_task", side_effect=ConnectionError("redis down")):
            ns.queue_order_event("placed", self.order(OrderStatus.PENDING))  # must not raise


class ArrivingOnceTests(unittest.IsolatedAsyncioTestCase):
    def db_for(self, order, rowcount):
        rider = SimpleNamespace(name="Rahul", phone="+919876543210")
        db = SimpleNamespace(execute=AsyncMock(return_value=SimpleNamespace(rowcount=rowcount)),
                             commit=AsyncMock())
        db.get = AsyncMock(side_effect=lambda model, _id: order if model.__name__ == "Order" else rider)
        return db

    def order(self, **kw):
        base = dict(id="o1", user_id="u1", order_number="FD-1", rider_id="r1",
                    arriving_notified_at=None, status=OrderStatus.OUT_FOR_DELIVERY)
        base.update(kw)
        return SimpleNamespace(**base)

    async def test_sends_with_rider_details_when_claimed(self):
        with patch("app.services.notification_service.send_push_notification", AsyncMock()) as send:
            sent = await tasks._notify_arriving("o1", self.db_for(self.order(), rowcount=1))
        self.assertTrue(sent)
        title, body = send.await_args.args[1], send.await_args.args[2]
        self.assertEqual(title, "Arriving soon 🚴")
        self.assertIn("Rahul", body)

    async def test_second_trigger_does_not_send_again(self):
        with patch("app.services.notification_service.send_push_notification", AsyncMock()) as send:
            sent = await tasks._notify_arriving("o1", self.db_for(self.order(), rowcount=0))
        self.assertFalse(sent)
        send.assert_not_awaited()

    async def test_skips_without_rider_or_after_delivery(self):
        with patch("app.services.notification_service.send_push_notification", AsyncMock()) as send:
            self.assertFalse(await tasks._notify_arriving("o1", self.db_for(self.order(rider_id=None), 1)))
            self.assertFalse(await tasks._notify_arriving(
                "o1", self.db_for(self.order(status=OrderStatus.DELIVERED), 1)))
            self.assertFalse(await tasks._notify_arriving(
                "o1", self.db_for(self.order(arriving_notified_at=datetime.now(timezone.utc)), 1)))
        send.assert_not_awaited()


if __name__ == "__main__":
    unittest.main()
