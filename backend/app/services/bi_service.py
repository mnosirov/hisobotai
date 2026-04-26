from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict
from datetime import datetime, timedelta

class BIService:
    def __init__(self, db: AsyncSession, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id

    async def get_business_summary(self) -> Dict:
        """AI va BI uchun biznesning umumiy holatini hisoblaydi."""
        from app.models.models import Product, Sale
        from sqlalchemy import func
        
        # 1. Omborxonadagi jami mahsulotlar qiymati
        # Tan narxi (Xarid narxi bo'yicha)
        q_stock_cost = select(func.sum(Product.stock * Product.last_purchase_price)).where(Product.tenant_id == self.tenant_id)
        res_stock_cost = await self.db.execute(q_stock_cost)
        total_stock_cost = res_stock_cost.scalar() or 0.0

        # Sotish qiymati (Sotish narxi bo'yicha)
        q_stock_sell = select(func.sum(Product.stock * Product.sell_price)).where(Product.tenant_id == self.tenant_id)
        res_stock_sell = await self.db.execute(q_stock_sell)
        total_stock_sell = res_stock_sell.scalar() or 0.0
        
        # 2. Jami mahsulotlar soni (turlar bo'yicha)
        q_count = select(func.count(Product.id)).where(Product.tenant_id == self.tenant_id)
        res_count = await self.db.execute(q_count)
        total_products = res_count.scalar() or 0
        
        # 3. Eng ko'p sotilgan mahsulotlar (oxirgi 30 kunda)
        # SQLite/Postgres JSON tahlili murakkab bo'lgani uchun oxirgi 50 ta sotuvdan hisoblaymiz
        q_sales = select(Sale).where(Sale.tenant_id == self.tenant_id, Sale.is_deleted == 0).order_by(Sale.created_at.desc()).limit(50)
        res_sales = await self.db.execute(q_sales)
        recent_sales = res_sales.scalars().all()
        
        product_stats = {}
        for sale in recent_sales:
            items = sale.items_json
            if isinstance(items, str):
                import json
                items = json.loads(items)
            for item in items:
                p_name = item.get("product", "Noma'lum")
                product_stats[p_name] = product_stats.get(p_name, 0) + item.get("quantity", 0)
        
        top_products = sorted(product_stats.items(), key=lambda x: x[1], reverse=True)[:5]
        
        # 4. Sotilgan mahsulotlar jami summasi
        q_sales_total = select(func.sum(Sale.total_amount)).where(Sale.tenant_id == self.tenant_id, Sale.is_deleted == 0)
        res_sales_total = await self.db.execute(q_sales_total)
        total_sales_revenue = res_sales_total.scalar() or 0.0

        return {
            "total_stock_cost": int(total_stock_cost),
            "total_stock_sell": int(total_stock_sell),
            "total_sales_revenue": int(total_sales_revenue),
            "total_product_types": total_products,
            "top_selling_products": [f"{name} ({qty} ta)" for name, qty in top_products]
        }

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
