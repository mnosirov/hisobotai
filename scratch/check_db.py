import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from dotenv import load_dotenv

# Re-path for local
load_dotenv(dotenv_path="../.env")

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://")

async def check_stock():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        # Check tenant 1
        tenant_id = 1
        
        # 1. Total sum from DB
        q_sum = text("""
            SELECT SUM(stock * last_purchase_price) 
            FROM products 
            WHERE tenant_id = :tid AND is_deleted = 0 AND stock > 0
        """)
        res_sum = await conn.execute(q_sum, {"tid": tenant_id})
        db_sum = res_sum.scalar() or 0
        print(f"DB Total Stock Cost (Stock > 0): {db_sum}")
        
        # 2. Total sum including negative (to see if it was the cause)
        q_sum_all = text("""
            SELECT SUM(stock * last_purchase_price) 
            FROM products 
            WHERE tenant_id = :tid AND is_deleted = 0
        """)
        res_sum_all = await conn.execute(q_sum_all, {"tid": tenant_id})
        db_sum_all = res_sum_all.scalar() or 0
        print(f"DB Total Stock Cost (Including Negative): {db_sum_all}")
        
        # 3. List top 10 expensive stocks
        q_list = text("""
            SELECT name, stock, last_purchase_price, (stock * last_purchase_price) as total
            FROM products 
            WHERE tenant_id = :tid AND is_deleted = 0
            ORDER BY total DESC
            LIMIT 10
        """)
        res_list = await conn.execute(q_list, {"tid": tenant_id})
        print("\nTop 10 Stocks by Value:")
        for row in res_list:
            print(f"{row[0]}: {row[1]} * {row[2]} = {row[3]}")
            
        # 4. Check for negative stocks
        q_neg = text("""
            SELECT name, stock, last_purchase_price
            FROM products 
            WHERE tenant_id = :tid AND is_deleted = 0 AND stock < 0
        """)
        res_neg = await conn.execute(q_neg, {"tid": tenant_id})
        neg_rows = res_neg.fetchall()
        print(f"\nNegative Stock Products: {len(neg_rows)}")
        for row in neg_rows:
            print(f"{row[0]}: {row[1]} * {row[2]} = {row[1]*row[2]}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_stock())
