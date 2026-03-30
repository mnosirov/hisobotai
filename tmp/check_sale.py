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

async def check_sale():
    async with AsyncSessionLocal() as db:
        # 1. Find User Azizbek
        from app.models.models import User, Sale, Product
        
        user_res = await db.execute(sa.select(User).where(User.username == 'Azizbek'))
        user = user_res.scalar_one_or_none()
        if not user:
            print("User Azizbek not found")
            return
        
        print(f"Found User Azizbek with ID {user.id}")

        # 2. Find Sales today
        # Today is March 30
        now_utc = datetime.now(timezone.utc)
        print(f"Current UTC time: {now_utc.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Search for sales where items_json contains 'Naushnik P9'
        query = sa.select(Sale).where(Sale.tenant_id == user.id).order_by(Sale.created_at.desc()).limit(20)
        res = await db.execute(query)
        sales = res.scalars().all()
        
        found = False
        for s in sales:
            tk_time = s.created_at + timedelta(hours=5)
            # Match 19:58
            if tk_time.hour == 19 and tk_time.minute == 58:
                items = s.items_json
                if isinstance(items, str): items = json.loads(items)
                
                for item in items:
                    if "Naushnik P9" in str(item.get("product", "")):
                        print(f"MATCH: Sale ID={s.id}, Qty={item.get('quantity')}, TK Time={tk_time.strftime('%H:%M:%S')}, Item={item.get('product')}")
                        found = True
            else:
                # Still print candidates near that time
                if tk_time.hour == 19 or tk_time.hour == 20:
                    print(f"Candidate: ID={s.id}, Time(TK)={tk_time.strftime('%H:%M:%S')}")

        if not found:
            print("No exact match found for Naushnik P9 at 19:58")

if __name__ == "__main__":
    import sys
    sys.path.append(os.path.join(os.getcwd(), 'backend'))
    asyncio.run(check_sale())
