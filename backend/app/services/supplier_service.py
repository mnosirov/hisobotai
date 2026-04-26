from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Dict, Optional
from app.models.models import Supplier, SupplierDebt, SupplierPaymentLog
from app.schemas import schemas

from sqlalchemy.orm import selectinload

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
        query = select(SupplierDebt).options(selectinload(SupplierDebt.supplier)).where(SupplierDebt.tenant_id == self.tenant_id).order_by(SupplierDebt.created_at.desc())
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
            
            # Create payment log
            payment_log = SupplierPaymentLog(
                tenant_id=self.tenant_id,
                supplier_id=debt.supplier_id,
                debt_id=debt.id,
                amount=amount,
                notes=debt.notes
            )
            self.db.add(payment_log)
            
            await self.db.commit()
            await self.db.refresh(debt)
        return debt

    async def get_payment_history(self) -> List[SupplierPaymentLog]:
        query = select(SupplierPaymentLog).options(selectinload(SupplierPaymentLog.supplier)).where(SupplierPaymentLog.tenant_id == self.tenant_id).order_by(SupplierPaymentLog.payment_date.desc())
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_total_debt(self) -> float:
        query = select(func.sum(SupplierDebt.remaining_amount)).where(SupplierDebt.tenant_id == self.tenant_id)
        result = await self.db.execute(query)
        return result.scalar() or 0.0

    async def get_total_payments(self) -> float:
        query = select(func.sum(SupplierPaymentLog.amount)).where(SupplierPaymentLog.tenant_id == self.tenant_id)
        result = await self.db.execute(query)
        return result.scalar() or 0.0
