from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Date
from typing import Dict, List
from datetime import date
from app.models.models import Product, Sale
from app.services.ai_service import AIService

class SalesService:
    def __init__(self, db: AsyncSession, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id

    async def get_sales_summary(self) -> Dict:
        today = date.today()
        
        # Today's profit
        query_today = select(func.sum(Sale.profit)).where(
            Sale.tenant_id == self.tenant_id,
            cast(Sale.created_at, Date) == today
        )
        res_today = await self.db.execute(query_today)
        sales_today = res_today.scalar() or 0.0

        # Total profit
        query_total = select(func.sum(Sale.profit)).where(
            Sale.tenant_id == self.tenant_id
        )
        res_total = await self.db.execute(query_total)
        total_sales = res_total.scalar() or 0.0

        return {
            "today_profit": sales_today,
            "total_profit": total_sales
        }

    async def process_handwritten_sales(self, image_path: str) -> Dict:
        items = await AIService.extract_handwritten_sales(image_path)
        total_revenue = 0.0
        total_profit = 0.0
        sold_items = []

        for item in items:
            name = item.get("name", "")
            qty = item.get("quantity", 0)
            revenue = item.get("total_price", 0.0)

            # Match product
            query = select(Product).where(
                Product.tenant_id == self.tenant_id,
                Product.name.ilike(f"%{name}%")
            )
            result = await self.db.execute(query)
            product = result.scalar_one_or_none()

            cost = 0.0
            if product:
                product.stock -= qty
                cost = product.last_purchase_price * qty
                self.db.add(product)

            profit = revenue - cost
            total_revenue += revenue
            total_profit += profit

            sold_items.append({
                "product": name,
                "quantity": qty,
                "revenue": revenue,
                "profit": profit
            })

        sale_record = Sale(
            tenant_id=self.tenant_id,
            items_json=sold_items,
            total_amount=total_revenue,
            profit=total_profit
        )
        self.db.add(sale_record)
        await self.db.commit()

        return {
            "status": "success",
            "total_amount": total_revenue,
            "profit": total_profit,
            "items": sold_items
        }
