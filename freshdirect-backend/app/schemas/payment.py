from pydantic import BaseModel


class PaymentCreateOrder(BaseModel):
    order_id: str  # our internal order ID


class PaymentCreateOrderResponse(BaseModel):
    razorpay_order_id: str
    amount: int  # in paise
    currency: str
    key_id: str
    order_id: str
    order_number: str


class PaymentVerify(BaseModel):
    razorpay_order_id: str = ""
    razorpay_payment_id: str = ""
    razorpay_signature: str = ""
    order_id: str = ""  # our internal order ID


class PaymentWebhook(BaseModel):
    event: str
    payload: dict
