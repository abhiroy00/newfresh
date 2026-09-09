import asyncio
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
import razorpay

from app.models.order import Order, OrderStatus, PaymentStatus
from app.core.config import settings
from app.core.security import verify_razorpay_signature

logger = logging.getLogger(__name__)

# Razorpay rejects orders below 1 INR.
MIN_AMOUNT_PAISE = 100

# razorpay 1.4.2 derives each of these straight from Exception — there is no
# shared RazorpayError base to catch, so enumerate them.
RAZORPAY_ERRORS = (
    razorpay.errors.BadRequestError,
    razorpay.errors.GatewayError,
    razorpay.errors.ServerError,
)


def _razorpay_client():
    return razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )


def _create_razorpay_order_sync(amount_paise: int, currency: str, receipt: str, notes: dict) -> dict:
    """Synchronous Razorpay API call — designed to run in a thread executor."""
    client = _razorpay_client()
    return client.order.create({
        "amount": amount_paise,
        "currency": currency,
        "receipt": receipt,
        "notes": notes,
    })


async def create_razorpay_order(order_id: str, user_id: str, db: AsyncSession) -> dict:
    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.user_id == user_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.payment_status == PaymentStatus.PAID:
        raise HTTPException(status_code=400, detail="Order already paid")

    # Fail fast and legibly when the gateway was never configured, instead of
    # burning a network round-trip to get back an opaque "Authentication failed".
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        logger.error(
            "Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET "
            "missing from the environment) — cannot create payment order %s",
            order.id,
        )
        raise HTTPException(
            status_code=503,
            detail="Online payment is temporarily unavailable. Please use Cash on Delivery.",
        )

    amount_paise = int(round(order.total * 100))  # Convert INR to paise
    if amount_paise < MIN_AMOUNT_PAISE:
        raise HTTPException(
            status_code=400,
            detail=f"Order total must be at least INR {MIN_AMOUNT_PAISE / 100:.0f} to pay online.",
        )

    # Offload synchronous Razorpay HTTP call to a thread so it doesn't block
    # the async event loop (and to avoid scary "Sync call in async" stack traces
    # in production servers like uvicorn/gunicorn with multiple workers).
    try:
        rzp_order = await asyncio.to_thread(
            _create_razorpay_order_sync,
            amount_paise,
            settings.RAZORPAY_CURRENCY,
            order.order_number,
            {"order_id": order.id, "user_id": user_id},
        )
    except RAZORPAY_ERRORS as e:
        # Bad credentials, a rejected payload, or Razorpay being down are all
        # upstream faults — surface them as 502 with the real reason logged,
        # rather than an unhandled exception the client sees as a bare 500.
        logger.exception(
            "Razorpay order creation failed for order %s (amount=%s paise): %r",
            order.id, amount_paise, e,
        )
        raise HTTPException(
            status_code=502,
            detail="Could not reach the payment gateway. Please try again or use Cash on Delivery.",
        )
    except Exception as e:
        logger.exception(
            "Unexpected error creating Razorpay order for order %s: %r", order.id, e
        )
        raise HTTPException(
            status_code=502,
            detail="Could not start the payment. Please try again or use Cash on Delivery.",
        )

    order.razorpay_order_id = rzp_order["id"]
    await db.flush()

    return {
        "razorpay_order_id": rzp_order["id"],
        "amount": amount_paise,
        "currency": settings.RAZORPAY_CURRENCY,
        "key_id": settings.RAZORPAY_KEY_ID,
        "order_id": order.id,
        "order_number": order.order_number,
    }


async def verify_payment(
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    order_id: str,
    user_id: str,
    db: AsyncSession,
) -> Order:
    if not verify_razorpay_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.user_id == user_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # The signature must be for THIS order's Razorpay order — otherwise a
    # valid signature from one paid order could mark a different order paid.
    if order.razorpay_order_id != razorpay_order_id:
        raise HTTPException(status_code=400, detail="Payment does not match this order")

    order.razorpay_payment_id = razorpay_payment_id
    order.razorpay_signature = razorpay_signature
    order.payment_status = PaymentStatus.PAID
    order.status = OrderStatus.CONFIRMED
    await db.flush()
    return order
