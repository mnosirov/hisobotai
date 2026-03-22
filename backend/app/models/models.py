from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    
    products = relationship("Product", back_populates="owner")
    sales = relationship("Sale", back_populates="owner")
    debts = relationship("Debt", back_populates="owner")
    inventory_logs = relationship("InventoryLog", back_populates="owner")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id"), index=True)
    name = Column(String, index=True)
    unit = Column(String)  # kg, piece, liter, etc.
    stock = Column(Float, default=0.0)
    last_purchase_price = Column(Float, default=0.0)
    sell_price = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="products")
    logs = relationship("InventoryLog", back_populates="product")

class InventoryLog(Base):
    __tablename__ = "inventory_logs"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id"), index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    change_amount = Column(Float)
    source = Column(String)  # Ovozli xabar, Faktura, Qo'lda
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="inventory_logs")
    product = relationship("Product", back_populates="logs")

class Sale(Base):
    __tablename__ = "sales"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id"), index=True)
    items_json = Column(JSON)  # [{ "product_id": 1, "quantity": 2, "price": 5000 }]
    total_amount = Column(Float)
    profit = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="sales")

class Debt(Base):
    __tablename__ = "debts"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id"), index=True)
    customer_name = Column(String, index=True)
    amount = Column(Float)
    due_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="debts")
