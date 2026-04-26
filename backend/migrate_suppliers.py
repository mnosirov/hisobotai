import asyncio
import sys
import os

# Backend papkasini yo'lga qo'shish
sys.path.append(os.getcwd())

from app.core.database import engine
from app.models.models import Base

async def migrate():
    print("Migratsiya boshlandi...")
    async with engine.begin() as conn:
        # Bu buyruq faqat yo'q jadvallarni yaratadi, borlariga tegmaydi
        await conn.run_sync(Base.metadata.create_all)
    print("Jadvallar muvaffaqiyatli yaratildi!")

if __name__ == "__main__":
    asyncio.run(migrate())
