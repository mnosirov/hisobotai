from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from datetime import datetime
from app.models.models import Expense
from app.schemas import schemas

class ExpenseService:
    def __init__(self, db: AsyncSession, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id

    async def get_expenses(self) -> List[Expense]:
        query = select(Expense).where(
            Expense.tenant_id == self.tenant_id,
            Expense.is_deleted == 0
        ).order_by(Expense.created_at.desc())
        result = await self.db.execute(query)
        return result.scalars().all()

    async def create_expense(self, data: schemas.ExpenseCreate) -> Expense:
        expense = Expense(
            tenant_id=self.tenant_id,
            amount=data.amount,
            category=data.category,
            notes=data.notes
        )
        self.db.add(expense)
        await self.db.commit()
        await self.db.refresh(expense)
        return expense

    async def delete_expense(self, expense_id: int) -> bool:
        query = select(Expense).where(Expense.id == expense_id, Expense.tenant_id == self.tenant_id)
        result = await self.db.execute(query)
        expense = result.scalar_one_or_none()
        
        if expense:
            from datetime import timedelta
            from app.models.models import uzb_now
            expense.is_deleted = 1
            expense.deleted_at = uzb_now()
            self.db.add(expense)
            await self.db.commit()
            return True
        return False

    async def get_total_expenses(self) -> float:
        query = select(func.sum(Expense.amount)).where(
            Expense.tenant_id == self.tenant_id,
            Expense.is_deleted == 0
        )
        result = await self.db.execute(query)
        return result.scalar() or 0.0

    async def get_today_expenses(self) -> float:
        from app.models.models import uzb_now
        today = uzb_now().date()
        query = select(func.sum(Expense.amount)).where(
            Expense.tenant_id == self.tenant_id,
            Expense.is_deleted == 0,
            func.date(Expense.created_at) == today
        )
        result = await self.db.execute(query)
        return result.scalar() or 0.0
