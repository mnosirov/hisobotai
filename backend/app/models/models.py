from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    telegram_chat_id = Column(String, unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    products = relationship("Product", back_populates="owner", cascade="all, delete-orphan")
    sales = relationship("Sale", back_populates="owner", cascade="all, delete-orphan")
    debts = relationship("Debt", back_populates="owner", cascade="all, delete-orphan")
    inventory_logs = relationship("InventoryLog", back_populates="owner", cascade="all, delete-orphan")

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String, index=True, nullable=False)
    category = Column(String, index=True, nullable=True, default="Umumiy")
    unit = Column(String, nullable=False, default="dona")  # e.g., kg, litr, dona
    stock = Column(Float, nullable=False, default=0.0)
    last_purchase_price = Column(Float, nullable=False, default=0.0)
    sell_price = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="products")
    logs = relationship("InventoryLog", back_populates="product", cascade="all, delete-orphan")

class InventoryLog(Base):
    __tablename__ = "inventory_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    change_amount = Column(Float, nullable=False)
    source = Column(String, nullable=False)  # Example: "invoice", "voice", "manual"
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="inventory_logs")
    product = relationship("Product", back_populates="logs")

class Sale(Base):
    __tablename__ = "sales"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    items_json = Column(JSON, nullable=False)  # List of dicts representing sold items
    total_amount = Column(Float, nullable=False, default=0.0)
    profit = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="sales")

class Debt(Base):
    __tablename__ = "debts"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    customer_name = Column(String, index=True, nullable=False)
    amount = Column(Float, nullable=False)
    due_date = Column(DateTime, nullable=True)
    is_paid = Column(Integer, default=0) # 0 for unpaid, 1 for paid
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="debts")
