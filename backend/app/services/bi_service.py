from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict
from datetime import datetime, timedelta

class BIService:
    def __init__(self, db: AsyncSession, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id

    async def get_weekly_insights(self) -> List[Dict]:
        return [
            {"day": "Dushanba", "profit": 150000},
            {"day": "Seshanba", "profit": 200000},
            {"day": "Chorshanba", "profit": 180000},
            {"day": "Payshanba", "profit": 210000},
            {"day": "Juma", "profit": 300000},
            {"day": "Shanba", "profit": 400000},
            {"day": "Yakshanba", "profit": 350000}
        ]
