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
    color: Optional[str] = Field(default=None)
    condition: Optional[str] = Field(default=None) # e.g., Yangi, Ishlatilgan
    image_url: Optional[str] = Field(default=None)
    supplier_id: Optional[int] = Field(default=None)

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
    is_deleted: int = 0
    deleted_at: Optional[datetime] = None
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
    is_blocked: Optional[int] = 0
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
    price: float = Field(default=0.0)

class SubscriptionResponse(BaseModel):
    id: int
    user_id: int
    tier: str
    start_date: datetime
    end_date: datetime
    activated_by: Optional[int] = None
    price: float = 0.0
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserAdminResponse(BaseModel):
    id: int
    username: str
    email: str
    is_admin: int
    is_blocked: int
    subscription_tier: str
    subscription_start: Optional[datetime] = None
    subscription_end: Optional[datetime] = None
    is_active: bool = False  # computed: obuna aktiv yoki yo'q
    created_at: datetime
    
    class Config:
        from_attributes = True

class DailyGrowth(BaseModel):
    date: str
    count: int

class SystemStats(BaseModel):
    total_users: int
    active_subscriptions: int
    total_revenue: float
    new_users_today: int
    growth_7d: List[DailyGrowth]

# --- Supplier & Supplier Debt Schemas ---
class SupplierBase(BaseModel):
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierResponse(SupplierBase):
    id: int
    tenant_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class SupplierDebtBase(BaseModel):
    supplier_id: int
    product_id: Optional[int] = None
    total_amount: float
    remaining_amount: float
    notes: Optional[str] = None

class SupplierDebtCreate(SupplierDebtBase):
    pass

class SupplierDebtResponse(SupplierDebtBase):
    id: int
    tenant_id: int
    created_at: datetime
    supplier: Optional[SupplierResponse] = None

    class Config:
        from_attributes = True

class SupplierPaymentLogResponse(BaseModel):
    id: int
    supplier_id: int
    debt_id: Optional[int] = None
    amount: float
    payment_date: datetime
    notes: Optional[str] = None
    supplier: Optional[SupplierResponse] = None

    class Config:
        from_attributes = True

class ExpenseCreate(BaseModel):
    amount: float
    category: str
    notes: Optional[str] = None

class ExpenseResponse(BaseModel):
    id: int
    amount: float
    category: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

