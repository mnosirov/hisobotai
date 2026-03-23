import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Base
from dotenv import load_dotenv

load_dotenv()

# Database Configuration
# Using /tmp for Vercel Serverless environment compatibility
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:////tmp/hisobot.db")

# Neon adds channel_binding=require which triggers errors in some psycopg2 versions
if DATABASE_URL and "channel_binding=require" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("&channel_binding=require", "").replace("?channel_binding=require", "")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    init_db()  # Ensures tables exist on every request for Vercel Serverless
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
