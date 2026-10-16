import hashlib
import hmac
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

from fastapi import HTTPException
from app.core.config import settings
from app.models.order import OrderStatus, PaymentStatus
from app.services import payment_service as service


class CheckoutTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        config = patch.multiple(settings, RAZORPAY_KEY_ID="rzp_test_fixture", RAZORPAY_KEY_SECRET="fixture-secret")
        config.start()
        self.addCleanup(config.stop)
        self.order = SimpleNamespace(
            id="internal", order_number="receipt", total=10,
            razorpay_order_id="order_test", razorpay_payment_id=None,
            payment_status=PaymentStatus.PENDING, status=OrderStatus.PENDING,
        )
        self.db = SimpleNamespace(execute=AsyncMock(), flush=AsyncMock())
        self.db.execute.return_value = Mock()
        self.db.execute.return_value.scalar_one_or_none.return_value = self.order

    def signature(self, order_id="order_test"):
        return hmac.new(settings.RAZORPAY_KEY_SECRET.encode(),
                        f"{order_id}|pay_test".encode(), hashlib.sha256).hexdigest()

    async def test_invalid_signature_does_not_mark_paid(self):
        with self.assertRaises(HTTPException) as error:
            await service.verify_payment("order_test", "pay_test", "invalid", "internal", "user", self.db)
        self.assertEqual(error.exception.status_code, 400)
        self.assertEqual(self.order.payment_status, PaymentStatus.PENDING)
        self.db.flush.assert_not_awaited()

    async def test_signature_cannot_pay_another_order(self):
        with self.assertRaises(HTTPException):
            await service.verify_payment("order_other", "pay_test", self.signature("order_other"), "internal", "user", self.db)
        self.assertEqual(self.order.payment_status, PaymentStatus.PENDING)

    async def test_verification_is_idempotent_and_preserves_delivery_status(self):
        self.order.status = OrderStatus.DELIVERED
        for _ in range(2):
            await service.verify_payment("order_test", "pay_test", self.signature(), "internal", "user", self.db)
        self.assertEqual(self.order.payment_status, PaymentStatus.PAID)
        self.assertEqual(self.order.status, OrderStatus.DELIVERED)
        self.assertEqual(self.db.flush.await_count, 1)

    async def test_retry_reuses_gateway_order(self):
        with patch.object(service, "_create_razorpay_order_sync") as create:
            result = await service.create_razorpay_order("internal", "user", self.db)
        create.assert_not_called()
        self.assertEqual(result["razorpay_order_id"], "order_test")

    async def test_minimum_amount(self):
        self.order.total = 0.99
        with self.assertRaises(HTTPException) as error:
            await service.create_razorpay_order("internal", "user", self.db)
        self.assertEqual(error.exception.status_code, 400)

    async def test_create_order_uses_server_amount(self):
        self.order.razorpay_order_id = None
        with patch.object(service, "_create_razorpay_order_sync", return_value={"id": "order_created"}) as create:
            result = await service.create_razorpay_order("internal", "user", self.db)
        self.assertEqual(create.call_args.args[0], 1000)
        self.assertEqual(result["amount"], 1000)
        self.assertEqual(self.order.razorpay_order_id, "order_created")

    async def test_gateway_errors_are_handled(self):
        self.order.razorpay_order_id = None
        for message, expected in [("Authentication failed", 401), ("Gateway unavailable", 500)]:
            with patch.object(service, "_create_razorpay_order_sync", side_effect=service.razorpay.errors.BadRequestError(message)):
                with self.assertRaises(HTTPException) as error:
                    await service.create_razorpay_order("internal", "user", self.db)
            self.assertEqual(error.exception.status_code, expected)
        self.db.flush.assert_not_awaited()
