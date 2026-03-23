from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional, Dict

class ProductBase(BaseModel):
    name: str = Field(..., min_length=1)
    unit: str = Field(default="dona")
    stock: float = Field(default=0.0)
    last_purchase_price: float = Field(default=0.0)
    sell_price: float = Field(default=0.0)

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: int
    tenant_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class SaleCreate(BaseModel):
    items_json: List[Dict]
    total_amount: float
    profit: float

class SaleResponse(SaleCreate):
    id: int
    tenant_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1)

class ChatResponse(BaseModel):
    reply: str
