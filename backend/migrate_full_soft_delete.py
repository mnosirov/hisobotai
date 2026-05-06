import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

# Re-path for local vs container
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if os.path.basename(current_dir) == "backend":
    os.chdir(current_dir)
else:
    os.chdir(os.path.join(current_dir, "backend"))

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "sqlite+aiosqlite:///../hisobot.db"
elif DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://")

engine = create_async_engine(DATABASE_URL)

async def migrate():
    tables = ["products", "sales", "debts", "suppliers", "supplier_debts", "supplier_payment_logs", "expenses"]
    
    async with engine.begin() as conn:
        print(f"Migrating DATABASE_URL: {DATABASE_URL}")
        for table in tables:
            try:
                # Add is_deleted
                await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN is_deleted INTEGER DEFAULT 0"))
                print(f"Added 'is_deleted' to '{table}'")
            except Exception as e:
                if "already exists" in str(e) or "duplicate column" in str(e):
                    print(f"Column 'is_deleted' already exists in '{table}'. Skipping.")
                else:
                    print(f"Error adding 'is_deleted' to '{table}': {e}")

            try:
                # Add deleted_at
                await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN deleted_at TIMESTAMP"))
                print(f"Added 'deleted_at' to '{table}'")
            except Exception as e:
                if "already exists" in str(e) or "duplicate column" in str(e):
                    print(f"Column 'deleted_at' already exists in '{table}'. Skipping.")
                else:
                    print(f"Error adding 'deleted_at' to '{table}': {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
