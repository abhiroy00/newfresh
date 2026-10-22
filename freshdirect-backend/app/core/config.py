from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator
from typing import List
import secrets


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # tolerate unknown keys in .env (e.g. TEST_* creds)
    )

    # App
    APP_NAME: str = "Gmart API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4

    # Security
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    ALGORITHM: str = "HS256"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/Gmart"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    OTP_TTL_SECONDS: int = 300  # 5 minutes
    OTP_MAX_ATTEMPTS: int = 3

    # Twilio Verify (OTP SMS) — Twilio generates/validates the OTP, we never store it
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_VERIFY_SERVICE_SID: str = ""
    OTP_DEMO_MODE: bool = True  # True = any 6-digit code works
    OTP_SEND_LIMIT: int = 3  # max OTP sends per phone per window
    OTP_SEND_WINDOW_SECONDS: int = 600

    # Razorpay
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""
    RAZORPAY_CURRENCY: str = "INR"

    # Cloudinary — accepts either a single CLOUDINARY_URL or three separate vars
    CLOUDINARY_URL: str = ""
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:8081",
        "http://localhost:19006",
        "http://localhost:5173",
        "exp://localhost:8081",
        "https://gmartfresh.com",
        "https://www.gmartfresh.com",
        "https://shop.gmartfresh.com",
        "https://main.d1cr5kgmgeoc49.amplifyapp.com",
    ]

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # Delivery
    FREE_DELIVERY_THRESHOLD: float = 499.0
    DELIVERY_FEE: float = 49.0

    @model_validator(mode="after")
    def _parse_cloudinary_url(self) -> "Settings":
        """Parse CLOUDINARY_URL into individual components if the separate vars aren't set."""
        if self.CLOUDINARY_URL and not self.CLOUDINARY_CLOUD_NAME:
            from urllib.parse import urlparse
            p = urlparse(self.CLOUDINARY_URL)
            self.CLOUDINARY_API_KEY = p.username or ""
            self.CLOUDINARY_API_SECRET = p.password or ""
            self.CLOUDINARY_CLOUD_NAME = p.hostname or ""
        return self


settings = Settings()
