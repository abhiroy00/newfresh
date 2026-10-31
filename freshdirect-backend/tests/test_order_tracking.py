import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from pydantic import ValidationError

from app.models.order import OrderStatus
from app.schemas.order import OrderRateRequest
from app.services import order_service as svc


def order(**kw):
    base = dict(status=OrderStatus.PENDING, status_history=None, delivery_otp="0427",
                created_at=datetime(2026, 11, 1, 3, 0, tzinfo=timezone.utc), delivered_at=None, cancelled_at=None)
    base.update(kw)
    return SimpleNamespace(**base)


class TimelineTests(unittest.TestCase):
    def test_record_status_appends_in_order(self):
        o = order()
        svc.record_status(o, OrderStatus.PENDING)
        svc.record_status(o, OrderStatus.CONFIRMED)
        self.assertEqual([h["status"] for h in o.status_history], ["pending", "confirmed"])
        self.assertEqual([t["label"] for t in svc.build_timeline(o)], ["Order Placed", "Order Confirmed"])

    def test_old_orders_get_a_derived_timeline(self):
        o = order(status=OrderStatus.DELIVERED, delivered_at=datetime(2026, 11, 1, 5, 0, tzinfo=timezone.utc))
        tl = svc.build_timeline(o)
        self.assertEqual([t["status"] for t in tl], ["pending", "delivered"])
        self.assertTrue(tl[1]["timestamp"].startswith("2026-11-01T05:00"))

    def test_otp_only_visible_while_on_the_way(self):
        self.assertEqual(svc.visible_delivery_otp(order(status=OrderStatus.OUT_FOR_DELIVERY)), "0427")
        self.assertIsNone(svc.visible_delivery_otp(order(status=OrderStatus.DELIVERED)))
        self.assertIsNone(svc.visible_delivery_otp(order(status=OrderStatus.CANCELLED)))


class RatingTests(unittest.IsolatedAsyncioTestCase):
    def test_rating_must_be_1_to_5(self):
        for bad in (0, 6):
            with self.assertRaises(ValidationError):
                OrderRateRequest(rating=bad)
        self.assertEqual(OrderRateRequest(rating=5, comment="Fast!").rating, 5)

    async def test_only_delivered_orders_can_be_rated(self):
        db = SimpleNamespace(flush=AsyncMock())
        with patch.object(svc, "get_order", AsyncMock(return_value=order(status=OrderStatus.OUT_FOR_DELIVERY))):
            with self.assertRaises(HTTPException):
                await svc.rate_order("o", "u", 5, None, db)
        delivered = order(status=OrderStatus.DELIVERED)
        with patch.object(svc, "get_order", AsyncMock(return_value=delivered)):
            await svc.rate_order("o", "u", 4, "  Good packing  ", db)
        self.assertEqual((delivered.rating, delivered.rating_comment), (4, "Good packing"))


if __name__ == "__main__":
    unittest.main()
