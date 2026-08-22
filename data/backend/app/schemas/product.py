from pydantic import BaseModel, Field


class Product(BaseModel):
    name: str
    category: str
    price: float = Field(..., ge=0)
    competitor_price: float = Field(..., ge=0)
