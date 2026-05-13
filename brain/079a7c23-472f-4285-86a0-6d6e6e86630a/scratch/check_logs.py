
import asyncio
from sqlalchemy.ext.asyncio import create_async_session, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, and_
from app.models.models import InventoryLog, Product
from app.core.db import engine

async def check_logs():
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as db:
        # Check total logs
        q_total = select(InventoryLog)
        res_total = await db.execute(q_total)
        logs = res_total.scalars().all()
        print(f"Total InventoryLogs in DB: {len(logs)}")
        
        for l in logs[:10]:
            print(f"Log ID: {l.id}, Date: {l.created_at}, Tenant: {l.tenant_id}")
            
        # Check April logs
        april_logs = [l for l in logs if l.created_at and l.created_at.month == 4]
        print(f"April logs count: {len(april_logs)}")
        
        # Check May logs
        may_logs = [l for l in logs if l.created_at and l.created_at.month == 5]
        print(f"May logs count: {len(may_logs)}")

if __name__ == "__main__":
    asyncio.run(check_logs())
