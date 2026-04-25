import asyncio
import os
import sys

# Add the project root to sys.path so we can import app
sys.path.append(os.getcwd())

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL topilmadi.")
    sys.exit(1)

if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
elif DATABASE_URL.startswith("sqlite:///"):
    DATABASE_URL = DATABASE_URL.replace("sqlite:///", "sqlite+aiosqlite:///")

async def migrate():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        print("Checking for Ota-Bola columns...")
        
        # Check if parent_id exists
        try:
            await conn.execute(text("ALTER TABLE products ADD COLUMN parent_id INTEGER REFERENCES products(id) ON DELETE SET NULL;"))
            print("Added parent_id column.")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print("parent_id allaqachon mavjud.")
            else:
                print(f"parent_id qo'shishda xatolik: {e}")

        # Check if conversion_rate exists
        try:
            await conn.execute(text("ALTER TABLE products ADD COLUMN conversion_rate FLOAT DEFAULT 1.0;"))
            print("Added conversion_rate column.")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print("conversion_rate allaqachon mavjud.")
            else:
                print(f"conversion_rate qo'shishda xatolik: {e}")

    await engine.dispose()
    print("Migratsiya yakunlandi.")

if __name__ == "__main__":
    asyncio.run(migrate())
