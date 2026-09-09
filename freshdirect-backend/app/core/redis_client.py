import json
from typing import Any, Optional
import redis.asyncio as aioredis
from app.core.config import settings

_redis_client: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_client


async def close_redis():
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None


# ── OTP helpers ──────────────────────────────────────────────

OTP_PREFIX = "otp:"
OTP_ATTEMPTS_PREFIX = "otp_attempts:"
BLACKLIST_PREFIX = "jwt_blacklist:"


async def store_otp(phone: str, otp: str) -> None:
    r = await get_redis()
    await r.setex(f"{OTP_PREFIX}{phone}", settings.OTP_TTL_SECONDS, otp)
    await r.delete(f"{OTP_ATTEMPTS_PREFIX}{phone}")


async def get_otp(phone: str) -> Optional[str]:
    r = await get_redis()
    return await r.get(f"{OTP_PREFIX}{phone}")


async def delete_otp(phone: str) -> None:
    r = await get_redis()
    await r.delete(f"{OTP_PREFIX}{phone}")
    await r.delete(f"{OTP_ATTEMPTS_PREFIX}{phone}")


async def increment_otp_attempts(phone: str) -> int:
    r = await get_redis()
    key = f"{OTP_ATTEMPTS_PREFIX}{phone}"
    attempts = await r.incr(key)
    await r.expire(key, settings.OTP_TTL_SECONDS)
    return attempts


async def rate_limit_exceeded(key: str, limit: int, window: int) -> bool:
    """Fixed-window rate limiter. Returns True when the caller is over the limit."""
    r = await get_redis()
    k = f"ratelimit:{key}"
    count = await r.incr(k)
    if count == 1:
        await r.expire(k, window)
    return count > limit


async def blacklist_token(jti: str, ttl: int) -> None:
    r = await get_redis()
    await r.setex(f"{BLACKLIST_PREFIX}{jti}", ttl, "1")


async def is_token_blacklisted(jti: str) -> bool:
    r = await get_redis()
    return bool(await r.get(f"{BLACKLIST_PREFIX}{jti}"))


# ── Cache helpers ─────────────────────────────────────────────

async def cache_set(key: str, value: Any, ttl: int = 300) -> None:
    r = await get_redis()
    await r.setex(key, ttl, json.dumps(value))


async def cache_get(key: str) -> Optional[Any]:
    r = await get_redis()
    data = await r.get(key)
    return json.loads(data) if data else None


async def cache_delete(key: str) -> None:
    r = await get_redis()
    await r.delete(key)


async def cache_delete_pattern(pattern: str) -> None:
    r = await get_redis()
    keys = await r.keys(pattern)
    if keys:
        await r.delete(*keys)
