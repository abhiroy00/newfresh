from datetime import datetime
from pydantic import BaseModel
from app.schemas.product import ProductOut


class WishlistItemOut(BaseModel):
    id: str
    product_id: str
    created_at: datetime
    product: ProductOut

    model_config = {"from_attributes": True}
