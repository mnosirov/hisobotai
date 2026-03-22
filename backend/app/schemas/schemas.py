from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional, Dict

# Product Schemas
class ProductBase(BaseModel):
    name: str
    unit: str
    stock: float
    last_purchase_price: float
    sell_price: float

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int
    tenant_id: int
    created_at: datetime

    class Config:
        orm_mode = True

# Inventory Log Schemas
class InventoryLogBase(BaseModel):
    product_id: int
    change_amount: float
    source: str  # Ovozli xabar, Faktura, Qo'lda

class InventoryLogCreate(InventoryLogBase):
    pass

class InventoryLog(InventoryLogBase):
    id: int
    tenant_id: int
    created_at: datetime

    class Config:
        orm_mode = True

# Sale Schemas
class SaleBase(BaseModel):
    items_json: List[Dict]  # [{ "product_id": 1, "quantity": 2, "price": 5000 }]
    total_amount: float
    profit: float

class SaleCreate(SaleBase):
    pass

class Sale(SaleBase):
    id: int
    tenant_id: int
    created_at: datetime

    class Config:
        orm_mode = True

# Debt Schemas
class DebtBase(BaseModel):
    customer_name: str
    amount: float
    due_date: datetime

class DebtCreate(DebtBase):
    pass

class Debt(DebtBase):
    id: int
    tenant_id: int
    created_at: datetime

    class Config:
        orm_mode = True

# User Schemas
class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    products: List[Product] = []
    
    class Config:
        orm_mode = True
