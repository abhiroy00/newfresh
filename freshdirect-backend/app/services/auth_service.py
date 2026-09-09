from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from fastapi.concurrency import run_in_threadpool
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

from app.models.user import User
from app.core.security import generate_otp, create_access_token, create_refresh_token, decode_token
from app.core.redis_client import store_otp, delete_otp, rate_limit_exceeded
from app.core.config import settings
from app.schemas.auth import SendOTPRequest, VerifyOTPRequest, TokenResponse


def _twilio_verify():
    """Twilio Verify service handle. The Verify product generates, delivers and
    validates the OTP — we never see or store the code ourselves."""
    client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    return client.verify.v2.services(settings.TWILIO_VERIFY_SERVICE_SID)


async def send_otp(payload: SendOTPRequest) -> dict:
    phone = payload.phone

    if settings.OTP_DEMO_MODE:
        # In demo mode: return otp in response (never do this in production!)
        otp = generate_otp()
        await store_otp(phone, otp)
        return {"message": f"OTP sent to {phone}", "demo_otp": otp}

    # Protect our Twilio balance: Twilio has its own limits, this is a cheap first gate.
    if await rate_limit_exceeded(
        f"otp_send:{phone}", settings.OTP_SEND_LIMIT, settings.OTP_SEND_WINDOW_SECONDS
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many OTP requests. Please try again in a few minutes.",
        )

    try:
        verification = await run_in_threadpool(
            lambda: _twilio_verify().verifications.create(to=phone, channel="sms")
        )
    except TwilioRestException as e:
        if e.code == 60203:  # max send attempts reached for this number
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many OTP requests for this number. Please try again later.",
            )
        if e.code in (60200, 21211):  # invalid phone number
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid phone number.",
            )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not send OTP. Please try again.",
        )

    return {"message": f"OTP sent to {phone}", "status": verification.status}


async def verify_otp_and_login(
    payload: VerifyOTPRequest, db: AsyncSession
) -> TokenResponse:
    phone = payload.phone
    otp = payload.otp

    # Demo mode: any 6-digit code works
    if not settings.OTP_DEMO_MODE:
        try:
            check = await run_in_threadpool(
                lambda: _twilio_verify().verification_checks.create(to=phone, code=otp)
            )
        except TwilioRestException as e:
            if e.status == 404:  # verification expired, already approved, or never sent
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="OTP expired or not found. Please request a new one.",
                )
            if e.code == 60202:  # max check attempts reached
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many failed attempts. Please request a new OTP.",
                )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Could not verify OTP. Please try again.",
            )

        if check.status != "approved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP.",
            )
    else:
        await delete_otp(phone)

    # Get or create user
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()

    if not user:
        user = User(phone=phone)
        db.add(user)
        await db.flush()

    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


async def refresh_access_token(refresh_token: str) -> TokenResponse:
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError("Not a refresh token")
        user_id = payload["sub"]
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    new_access = create_access_token(subject=user_id)
    new_refresh = create_refresh_token(subject=user_id)

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
