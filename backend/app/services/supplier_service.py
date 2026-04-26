from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Dict, Optional
from app.models.models import Supplier, SupplierDebt
from app.schemas import schemas

class SupplierService:
    def __init__(self, db: AsyncSession, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id

    async def get_suppliers(self) -> List[Supplier]:
        query = select(Supplier).where(Supplier.tenant_id == self.tenant_id)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def create_supplier(self, supplier_data: schemas.SupplierCreate) -> Supplier:
        supplier = Supplier(
            tenant_id=self.tenant_id,
            name=supplier_data.name,
            phone=supplier_data.phone,
            address=supplier_data.address
        )
        self.db.add(supplier)
        await self.db.commit()
        await self.db.refresh(supplier)
        return supplier

    async def get_debts(self) -> List[SupplierDebt]:
        query = select(SupplierDebt).where(SupplierDebt.tenant_id == self.tenant_id).order_by(SupplierDebt.created_at.desc())
        result = await self.db.execute(query)
        return result.scalars().all()

    async def pay_debt(self, debt_id: int, amount: float) -> Optional[SupplierDebt]:
        query = select(SupplierDebt).where(SupplierDebt.id == debt_id, SupplierDebt.tenant_id == self.tenant_id)
        result = await self.db.execute(query)
        debt = result.scalar_one_or_none()
        
        if debt:
            debt.remaining_amount -= amount
            if debt.remaining_amount < 0:
                debt.remaining_amount = 0
            await self.db.commit()
            await self.db.refresh(debt)
        return debt

    async def get_total_debt(self) -> float:
        query = select(func.sum(SupplierDebt.remaining_amount)).where(SupplierDebt.tenant_id == self.tenant_id)
        result = await self.db.execute(query)
        return result.scalar() or 0.0
