import re
from typing import Optional
from pydantic import BaseModel, field_validator


class SendOTPRequest(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip().replace(" ", "")
        # Accept +91XXXXXXXXXX or 10-digit Indian number
        if re.match(r"^\+91[6-9]\d{9}$", v) or re.match(r"^[6-9]\d{9}$", v):
            # Normalise to +91 format
            if not v.startswith("+"):
                v = "+91" + v
            return v
        raise ValueError("Invalid Indian phone number")


class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip().replace(" ", "")
        if not v.startswith("+91"):
            v = "+91" + v
        return v

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^\d{6}$", v):
            raise ValueError("OTP must be exactly 6 digits")
        return v


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = None
