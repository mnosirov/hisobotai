import asyncio
import os
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from datetime import datetime, timedelta, timezone
import json

# Setup Database connection using the .env URL
raw_url = "postgresql://neondb_owner:npg_xIiZrUpP97uB@ep-bold-queen-an9rt9p9-pooler.c-6.us-east-1.aws.neon.tech/neondb"
DATABASE_URL = raw_url.replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(DATABASE_URL, connect_args={"ssl": "require"})
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession)

async def find_sale():
    async with AsyncSessionLocal() as db:
        # 1. Find User Azizbek
        from app.models.models import User, Sale, Product
        
        user_res = await db.execute(sa.select(User).where(User.username == 'Azizbek'))
        user = user_res.scalar_one_or_none()
        if not user:
            print("User Azizbek not found")
            return
        
        print(f"Found User Azizbek with ID {user.id}")

        # 2. Find Sales today (March 30)
        # Search for sales where items_json contains 'Naushnik P9'
        query = sa.select(Sale).where(Sale.tenant_id == user.id).order_by(Sale.created_at.desc()).limit(10)
        res = await db.execute(query)
        sales = res.scalars().all()
        
        for s in sales:
            tk_time = s.created_at + timedelta(hours=5)
            print(f"Sale ID: {s.id}, TK Time: {tk_time.strftime('%H:%M:%S')}, Items: {s.items_json}")
            
            # Check if it matches 19:58 and Naushnik P9
            if tk_time.hour == 19 and tk_time.minute == 58:
                items = s.items_json
                if isinstance(items, str): items = json.loads(items)
                for item in items:
                    if "Naushnik P9" in str(item.get("product", "")):
                        print(f"!!! MATCH FOUND !!! Sale ID: {s.id}")
                        return s.id
        return None

if __name__ == "__main__":
    import sys
    sys.path.append(os.path.join(os.getcwd(), 'backend'))
    loop = asyncio.get_event_loop()
    sale_id = loop.run_until_complete(find_sale())
    if sale_id:
        print(f"TARGET_SALE_ID={sale_id}")
