from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List, Dict, Any
from app.models.models import Product, Sale, Expense, Supplier, SupplierDebt, SupplierPaymentLog, Debt

class TrashService:
    def __init__(self, db: AsyncSession, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id

    async def get_trash_items(self) -> Dict[str, List[Dict[str, Any]]]:
        """Barcha o'chirilgan ma'lumotlarni qaytaradi."""
        trash = {
            "products": [],
            "sales": [],
            "expenses": [],
            "suppliers": [],
            "debts": []
        }

        # Products
        p_query = select(Product).where(Product.tenant_id == self.tenant_id, Product.is_deleted == 1).order_by(Product.deleted_at.desc())
        p_res = await self.db.execute(p_query)
        trash["products"] = [{"id": x.id, "name": x.name, "deleted_at": x.deleted_at, "type": "product"} for x in p_res.scalars().all()]

        # Sales
        s_query = select(Sale).where(Sale.tenant_id == self.tenant_id, Sale.is_deleted == 1).order_by(Sale.deleted_at.desc())
        s_res = await self.db.execute(s_query)
        trash["sales"] = [{
            "id": x.id, 
            "amount": x.total_amount, 
            "deleted_at": x.deleted_at, 
            "type": "sale",
            "items_json": x.items_json
        } for x in s_res.scalars().all()]

        # Expenses
        e_query = select(Expense).where(Expense.tenant_id == self.tenant_id, Expense.is_deleted == 1).order_by(Expense.deleted_at.desc())
        e_res = await self.db.execute(e_query)
        trash["expenses"] = [{"id": x.id, "amount": x.amount, "category": x.category, "deleted_at": x.deleted_at, "type": "expense"} for x in e_res.scalars().all()]

        # Suppliers
        sup_query = select(Supplier).where(Supplier.tenant_id == self.tenant_id, Supplier.is_deleted == 1).order_by(Supplier.deleted_at.desc())
        sup_res = await self.db.execute(sup_query)
        trash["suppliers"] = [{"id": x.id, "name": x.name, "deleted_at": x.deleted_at, "type": "supplier"} for x in sup_res.scalars().all()]

        # Debts (Customer)
        d_query = select(Debt).where(Debt.tenant_id == self.tenant_id, Debt.is_deleted == 1).order_by(Debt.deleted_at.desc())
        d_res = await self.db.execute(d_query)
        trash["debts"] = [{"id": x.id, "customer": x.customer_name, "amount": x.amount, "deleted_at": x.deleted_at, "type": "debt"} for x in d_res.scalars().all()]

        return trash

    async def restore_item(self, item_type: str, item_id: int) -> bool:
        """O'chirilgan elementni qayta tiklaydi."""
        model_map = {
            "product": Product,
            "sale": Sale,
            "expense": Expense,
            "supplier": Supplier,
            "debt": Debt
        }

        if item_type not in model_map:
            return False

        model = model_map[item_type]
        query = select(model).where(model.id == item_id, model.tenant_id == self.tenant_id)
        res = await self.db.execute(query)
        item = res.scalar_one_or_none()

        if item:
            # Special case: if sale is restored, we must subtract stock again
            if item_type == "sale":
                items = item.items_json
                if isinstance(items, str):
                    import json
                    items = json.loads(items)
                
                for sold_item in items:
                    p_id = sold_item.get("product_id")
                    qty = float(sold_item.get("quantity") or 0.0)
                    if p_id:
                        p_query = select(Product).where(Product.id == p_id, Product.tenant_id == self.tenant_id)
                        p_res = await self.db.execute(p_query)
                        product = p_res.scalar_one_or_none()
                        if product:
                            product.stock -= qty
                            self.db.add(product)

            item.is_deleted = 0
            item.deleted_at = None
            
            # Special case: if supplier is restored, restore its debts too?
            # Or let the user do it manually? Usually restoring a parent should restore related things if they were soft-deleted together.
            if item_type == "supplier":
                await self.db.execute(
                    update(SupplierDebt).where(SupplierDebt.supplier_id == item_id, SupplierDebt.tenant_id == self.tenant_id).values(is_deleted=0, deleted_at=None)
                )

            await self.db.commit()
            return True
        return False
