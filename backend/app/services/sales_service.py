from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Date
from typing import Dict, List
from datetime import date, datetime, timedelta, timezone
from app.models.models import Product, Sale
from app.services.ai_service import AIService

class SalesService:
    def __init__(self, db: AsyncSession, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id

    def get_tashkent_today(self) -> date:
        # Tashkent is UTC+5
        return (datetime.now(timezone.utc) + timedelta(hours=5)).date()

    async def get_sales_summary(self) -> Dict:
        today = self.get_tashkent_today()
        
        # Today's profit (Add 5 hours for Tashkent)
        query_today = select(func.sum(Sale.profit)).where(
            Sale.tenant_id == self.tenant_id,
            cast(Sale.created_at + timedelta(hours=5), Date) == today
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

    async def get_todays_sales(self) -> List[Dict]:
        today = self.get_tashkent_today()
        query = select(Sale).where(
            Sale.tenant_id == self.tenant_id,
            cast(Sale.created_at + timedelta(hours=5), Date) == today
        )
        result = await self.db.execute(query)
        sales = result.scalars().all()
        
        all_items = []
        for s in sales:
            all_items.extend(s.items_json)
        return all_items

    async def get_sales_history(self) -> List[Sale]:
        """Barcha sotuvlar tarixini qaytaradi."""
        query = select(Sale).where(Sale.tenant_id == self.tenant_id).order_by(Sale.created_at.desc())
        result = await self.db.execute(query)
        return result.scalars().all()

    async def analyze_handwritten_sales(self, image_path: str) -> List[Dict]:
        """AI orqali rasmdan ma'lumotlarni o'qiydi, lekin bazaga saqlamaydi."""
        raw_items = await AIService.extract_handwritten_sales(image_path)
        analyzed_items = []
        
        for item in raw_items:
            name = item.get("name", "Noma'lum")
            qty = float(item.get("quantity") or 0.0)
            revenue = float(item.get("total_price") or 0.0)
            
            # Mahsulotni qidirish (faqat ma'lumot uchun)
            query = select(Product).where(
                Product.tenant_id == self.tenant_id,
                Product.name.ilike(f"%{name}%")
            )
            result = await self.db.execute(query)
            product = result.scalar_one_or_none()
            
            if product:
                if revenue <= 0:
                    revenue = product.sell_price * qty
                
                analyzed_items.append({
                    "product_id": product.id,
                    "product_name": product.name,
                    "quantity": qty,
                    "revenue": revenue,
                    "found": True
                })
            else:
                analyzed_items.append({
                    "product_name": name,
                    "quantity": qty,
                    "revenue": revenue,
                    "found": False
                })
        return analyzed_items

    async def commit_sales(self, items: List[Dict]) -> Dict:
        """Tasdiqlangan yoki qo'lda kiritilgan sotuvlarni bazaga saqlaydi."""
        total_revenue = 0.0
        total_profit = 0.0
        sold_items_records = []

        for item in items:
            product_id = item.get("product_id")
            qty = float(item.get("quantity") or 0.0)
            revenue = float(item.get("revenue") or 0.0)

            if not product_id:
                continue

            query = select(Product).where(Product.id == product_id, Product.tenant_id == self.tenant_id)
            res = await self.db.execute(query)
            product = res.scalar_one_or_none()

            if product:
                product.stock -= qty
                # Foyda = (Sotish narxi - Kelish narxi) * Miqdor
                profit = revenue - (product.last_purchase_price * qty)
                
                total_revenue += revenue
                total_profit += profit
                
                sold_items_records.append({
                    "product": product.name,
                    "quantity": qty,
                    "revenue": revenue,
                    "profit": profit
                })
                self.db.add(product)

        if not sold_items_records:
            return {"status": "error", "message": "Hech qanday mahsulot saqlanmadi."}

        sale_record = Sale(
            tenant_id=self.tenant_id,
            items_json=sold_items_records,
            total_amount=total_revenue,
            profit=total_profit
        )
        self.db.add(sale_record)
        await self.db.commit()

        return {
            "status": "success",
            "total_amount": total_revenue,
            "profit": total_profit,
            "items": sold_items_records
        }
