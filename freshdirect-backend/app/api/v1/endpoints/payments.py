import logging

from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.config import settings
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.schemas.payment import PaymentCreateOrder, PaymentVerify
from app.services.payment_service import create_razorpay_order, verify_payment
from app.core.security import verify_razorpay_webhook_signature

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.post("/create-order")
async def api_create_payment_order(
    payload: PaymentCreateOrder,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await create_razorpay_order(payload.order_id, current_user.id, db)
    return {"success": True, "data": data}

@router.post("/verify")
async def api_verify_payment(
    payload: PaymentVerify,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    order = await verify_payment(
        payload.razorpay_order_id, payload.razorpay_payment_id,
        payload.razorpay_signature, payload.order_id, current_user.id, db,
    )
    return {"success": True, "message": "Payment verified", "data": {"order_id": order.id, "status": order.status}}

@router.post("/webhook")
async def api_payment_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    # Without a secret every signature check fails, so Razorpay would see a wall
    # of 400s, retry, and eventually disable the webhook — with nothing in the
    # logs explaining why. Say so out loud instead.
    if not settings.RAZORPAY_WEBHOOK_SECRET:
        logger.error(
            "Received a Razorpay webhook but RAZORPAY_WEBHOOK_SECRET is not set — "
            "cannot verify the signature. Set it to the same value configured in "
            "the Razorpay Dashboard webhook."
        )
        raise HTTPException(status_code=503, detail="Webhook not configured")

    if not verify_razorpay_webhook_signature(body, signature):
        logger.warning(
            "Rejected Razorpay webhook: signature mismatch (secret in .env does "
            "not match the Dashboard, or the request was not from Razorpay)."
        )
        raise HTTPException(status_code=400, detail="Invalid webhook signature")
    import json
    event = json.loads(body)
    if event.get("event") == "payment.captured":
        payment = event["payload"]["payment"]["entity"]
        rzp_order_id = payment.get("order_id")
        rzp_payment_id = payment.get("id")
        if rzp_order_id:
            from sqlalchemy import select
            from app.models.order import Order, OrderStatus, PaymentStatus
            result = await db.execute(select(Order).where(Order.razorpay_order_id == rzp_order_id))
            order = result.scalar_one_or_none()
            if order and order.payment_status != PaymentStatus.PAID:
                order.payment_status = PaymentStatus.PAID
                order.status = OrderStatus.CONFIRMED
                order.razorpay_payment_id = rzp_payment_id
                await db.flush()
    return {"status": "ok"}
