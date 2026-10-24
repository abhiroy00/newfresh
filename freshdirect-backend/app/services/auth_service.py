import random
import string
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from fastapi.concurrency import run_in_threadpool
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

from app.models.user import User
from app.core.security import generate_otp, create_access_token, create_refresh_token, decode_token, pwd_context
from app.core.redis_client import store_otp, delete_otp, rate_limit_exceeded, blacklist_token, is_token_blacklisted
from app.core.config import settings
from app.schemas.auth import (
    SendOTPRequest, VerifyOTPRequest, TokenResponse, EmailLoginRequest, EmailSignupRequest,
)


async def generate_user_code(db: AsyncSession) -> str:
    """A short, human-readable ID (e.g. G-7464) assigned to every user, distinct
    from their internal UUID — shown in-app and used by support to look users up."""
    while True:
        code = f"G-{''.join(random.choices(string.digits, k=4))}"
        existing = await db.execute(select(User).where(User.user_code == code))
        if not existing.scalar_one_or_none():
            return code


def _issue_token_pair(user_id: str) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(subject=user_id),
        refresh_token=create_refresh_token(subject=user_id),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


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
        user = User(phone=phone, user_code=await generate_user_code(db))
        db.add(user)
        await db.flush()
    elif not user.is_active:
        # Otherwise this issues a token that's rejected on the very next
        # call by get_current_user's is_active check — reject upfront with
        # a clear reason instead of a confusing failure one step later.
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Please contact support.",
        )

    return _issue_token_pair(user.id)


async def login_with_email(payload: EmailLoginRequest, db: AsyncSession) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    # Same generic error whether the email doesn't exist or the password is
    # wrong — don't reveal which, and don't let a passwordless (OTP-only)
    # account be bruteforced via this path.
    invalid = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user or not user.password_hash:
        raise invalid
    if not pwd_context.verify(payload.password, user.password_hash):
        raise invalid
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Please contact support.",
        )

    return _issue_token_pair(user.id)


async def signup_with_email(payload: EmailSignupRequest, db: AsyncSession) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == payload.email))
    existing = result.scalar_one_or_none()
    if existing:
        if existing.password_hash:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
        # An OTP-created account already has this email on file (e.g. set from
        # Account settings) but no password — don't silently attach a password
        # to it here, since that would let anyone who knows the email take over
        # the account without proving phone ownership. They must log in with
        # phone OTP and set a password from their account instead.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email is linked to an existing account. Log in with phone OTP and set a password from My Account instead.",
        )

    # Phone is required (and unique, String(15)) on the model but unknown at
    # email-signup time — a short placeholder keeps the column's constraints
    # satisfied. There's no verified-phone-later flow yet, so SMS-dependent
    # features (rider call button, order SMS updates) won't apply to these
    # accounts until that's built.
    user = User(
        email=payload.email,
        name=payload.name,
        phone=f"e_{uuid.uuid4().hex[:13]}",
        password_hash=pwd_context.hash(payload.password),
        user_code=await generate_user_code(db),
    )
    db.add(user)
    await db.flush()

    return _issue_token_pair(user.id)


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

    jti = payload.get("jti", refresh_token[-16:])
    if await is_token_blacklisted(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked",
        )

    new_access = create_access_token(subject=user_id)
    new_refresh = create_refresh_token(subject=user_id)

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


async def revoke_refresh_token(refresh_token: str) -> None:
    """Blacklist a refresh token on logout so a leaked/cached copy can't
    silently mint new sessions after the user has signed out."""
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            return
        exp = payload.get("exp")
    except Exception:
        return
    jti = payload.get("jti", refresh_token[-16:])
    ttl = max(int(exp - datetime.now(timezone.utc).timestamp()), 1) if exp else 1
    await blacklist_token(jti, ttl)
