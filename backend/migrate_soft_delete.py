import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_session_maker, create_async_engine
from dotenv import load_dotenv

# Re-path for local vs container
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
os.chdir(parent_dir)

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Default to local sqlite if not set
    DATABASE_URL = "sqlite+aiosqlite:///hisobot.db"
elif DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://")

engine = create_async_engine(DATABASE_URL)

async def migrate():
    async with engine.begin() as conn:
        try:
            print(f"Migrating DATABASE_URL: {DATABASE_URL}")
            # Try to add is_deleted column to sales
            await conn.execute(text("ALTER TABLE sales ADD COLUMN is_deleted INTEGER DEFAULT 0"))
            print("Migration successful: added 'is_deleted' column to 'sales' table.")
        except Exception as e:
            if "already exists" in str(e) or "duplicate column" in str(e):
                print("Column 'is_deleted' already exists. Skipping.")
            else:
                print(f"Migration error: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
