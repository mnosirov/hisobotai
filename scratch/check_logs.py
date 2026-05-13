import asyncio
import os
from sqlalchemy import select
from app.core.db import AsyncSessionLocal
from app.models.models import InventoryLog, Product

async def check_logs():
    async with AsyncSessionLocal() as db:
        query = select(InventoryLog, Product.name).join(Product).order_by(InventoryLog.id.desc()).limit(10)
        result = await db.execute(query)
        logs = result.all()
        
        print("Last 10 Inventory Logs:")
        for log in logs:
            print(f"ID: {log.InventoryLog.id}, Product: {log.name}, Amount: {log.InventoryLog.change_amount}, Source: {log.InventoryLog.source}, Date: {log.InventoryLog.created_at}")

if __name__ == "__main__":
    # Add project root to sys.path
    import sys
    sys.path.append(os.getcwd())
    asyncio.run(check_logs())
