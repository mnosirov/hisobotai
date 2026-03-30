import asyncio
import os
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from datetime import datetime, timedelta, timezone

# Load environment manually if needed or assume it's there
# For this script we will hardcode the URL from .env to be sure
# DATABASE_URL=postgresql://neondb_owner:npg_xIiZrUpP97uB@ep-bold-queen-an9rt9p9-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
raw_url = "postgresql://neondb_owner:npg_xIiZrUpP97uB@ep-bold-queen-an9rt9p9-pooler.c-6.us-east-1.aws.neon.tech/neondb"
DATABASE_URL = raw_url.replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(DATABASE_URL, connect_args={"ssl": "require"})
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession)

async def fix_sale():
    async with AsyncSessionLocal() as db:
        # 1. Find User Azizbek
        from app.models.models import User, Sale, Product
        
        user_res = await db.execute(sa.select(User).where(User.username == 'Azizbek'))
        user = user_res.scalar_one_or_none()
        if not user:
            print("User Azizbek not found")
            return

        # 2. Find Product Naushnik P9
        prod_res = await db.execute(sa.select(Product).where(Product.user_id == user.id, Product.name == 'Naushnik P9'))
        product = prod_res.scalar_one_or_none()
        if not product:
            print("Product Naushnik P9 not found for Azizbek")
            return

        # 3. Find Sale at 19:58 (Tashkent time)
        # GMT+5 means 19:58 Tashkent is 14:58 UTC
        # We'll look for sales today around that time
        sales_res = await db.execute(
            sa.select(Sale).where(
                Sale.user_id == user.id, 
                Sale.product_id == product.id
            ).order_by(Sale.created_at.desc())
        )
        sales = sales_res.scalars().all()
        
        target_sale = None
        for s in sales:
            # Convert UTC to Tashkent for comparison
            tk_time = s.created_at + timedelta(hours=5)
            print(f"Checking Sale: ID={s.id}, Qty={s.quantity}, Time(TK)={tk_time.strftime('%H:%M:%S')}")
            if tk_time.hour == 19 and tk_time.minute == 58:
                target_sale = s
                break
        
        if target_sale:
            print(f"Found target sale: ID {target_sale.id}")
            # Restore quantity
            product.quantity += target_sale.quantity
            print(f"Restoring {target_sale.quantity} units to product {product.name}. New qty: {product.quantity}")
            
            # Delete sale
            await db.delete(target_sale)
            await db.commit()
            print("Sale deleted and inventory updated successfully.")
        else:
            print("No sale found at 19:58 today for Naushnik P9")

if __name__ == "__main__":
    import sys
    # Add backend to path so we can import app.models
    sys.path.append(os.path.join(os.getcwd(), 'backend'))
    asyncio.run(fix_sale())
