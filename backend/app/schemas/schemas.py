from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional, Dict

class ProductBase(BaseModel):
    name: str = Field(..., min_length=1)
    category: Optional[str] = Field(default="Umumiy")
    unit: str = Field(default="dona")
    stock: float = Field(default=0.0)
    last_purchase_price: float = Field(default=0.0)
    sell_price: float = Field(default=0.0)
    image_url: Optional[str] = Field(default=None)

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: int
    tenant_id: int
    image_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class SaleItem(BaseModel):
    product_id: int
    quantity: float
    revenue: float

class SaleCreate(BaseModel):
    items: List[SaleItem]

class SaleResponse(BaseModel):
    id: int
    total_amount: float
    profit: float
    items_json: List[Dict]
    created_at: datetime
    
    class Config:
        from_attributes = True

class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1)

class ChatResponse(BaseModel):
    reply: str

# Authentication Schemas
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3)
    email: str = Field(..., pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_admin: Optional[int] = 0
    subscription_tier: Optional[str] = "free"
    subscription_start: Optional[datetime] = None
    subscription_end: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# --- Admin & Subscription Schemas ---
class SubscriptionGrant(BaseModel):
    user_id: int
    tier: str = Field(..., pattern=r"^(standard|premium)$")
    start_date: datetime
    end_date: datetime

class SubscriptionResponse(BaseModel):
    id: int
    user_id: int
    tier: str
    start_date: datetime
    end_date: datetime
    activated_by: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserAdminResponse(BaseModel):
    id: int
    username: str
    email: str
    is_admin: int
    subscription_tier: str
    subscription_start: Optional[datetime] = None
    subscription_end: Optional[datetime] = None
    is_active: bool = False  # computed: obuna aktiv yoki yo'q
    created_at: datetime
    
    class Config:
        from_attributes = True

