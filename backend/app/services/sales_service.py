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
        yesterday = today - timedelta(days=1)
        
        # Today's profit (Add 5 hours for Tashkent)
        query_today = select(func.sum(Sale.profit)).where(
            Sale.tenant_id == self.tenant_id,
            cast(Sale.created_at + timedelta(hours=5), Date) == today
        )
        res_today = await self.db.execute(query_today)
        sales_today = res_today.scalar() or 0.0

        # Yesterday's profit (Add 5 hours for Tashkent)
        query_yesterday = select(func.sum(Sale.profit)).where(
            Sale.tenant_id == self.tenant_id,
            cast(Sale.created_at + timedelta(hours=5), Date) == yesterday
        )
        res_yesterday = await self.db.execute(query_yesterday)
        sales_yesterday = res_yesterday.scalar() or 0.0

        # Calculate growth percentage
        profit_growth = 0.0
        if sales_yesterday > 0:
            profit_growth = ((sales_today - sales_yesterday) / sales_yesterday) * 100
        elif sales_today > 0:
            profit_growth = 100.0  # From 0 to something is 100% growth

        # Total profit
        query_total = select(func.sum(Sale.profit)).where(
            Sale.tenant_id == self.tenant_id
        )
        res_total = await self.db.execute(query_total)
        total_sales = res_total.scalar() or 0.0

        # Low stock items (Ombor nazorati)
        query_low_stock = select(Product).where(
            Product.tenant_id == self.tenant_id,
            Product.stock < 10
        ).limit(5)
        res_low_stock = await self.db.execute(query_low_stock)
        low_stock_items = res_low_stock.scalars().all()
        
        low_stock_data = [{"name": p.name, "stock": p.stock, "unit": p.unit} for p in low_stock_items]

        return {
            "today_profit": sales_today,
            "total_profit": total_sales,
            "profit_growth": round(profit_growth, 1),
            "low_stock_items": low_stock_data
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

    async def get_recent_sales_full(self, limit: int = 15) -> List[str]:
        """AI uchun oxirgi sotuvlar tafsilotlari"""
        query = select(Sale).where(Sale.tenant_id == self.tenant_id).order_by(Sale.created_at.desc()).limit(limit)
        result = await self.db.execute(query)
        sales = result.scalars().all()
        
        history = []
        for s in sales:
            # Tashkent vaqti
            dt = (s.created_at + timedelta(hours=5)).strftime("%H:%M (%d-%b)")
            items = ", ".join([f"{i.get('product')} ({i.get('quantity')} ta)" for i in s.items_json])
            history.append(f"{dt}: {items} - {int(s.total_amount)} UZS")
        return history

    async def analyze_handwritten_sales(self, image_path: str) -> List[Dict]:
        """AI orqali rasmdan ma'lumotlarni o'qiydi, lekin bazaga saqlamaydi."""
        raw_items = await AIService.extract_handwritten_sales(image_path)
        analyzed_items = []
        
        for item in raw_items:
            name = item.get("name", "Noma'lum")
            qty = float(item.get("quantity") or 0.0)
            revenue = float(item.get("total_price") or 0.0)
            
            # Capping: Max 6 digits for quantity, Max 9 digits for revenue
            qty = min(qty, 999999)
            revenue = min(revenue, 999999999)
            
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
        from app.services.subscription_service import TIER_LIMITS
        from fastapi import HTTPException
        from sqlalchemy import func
        from app.models.models import User
        
        # Check current month limits
        user_res = await self.db.get(User, self.tenant_id)
        if user_res and user_res.is_admin != 1:
            tier = user_res.subscription_tier or "free"
            max_s = TIER_LIMITS.get(tier, TIER_LIMITS["free"])["max_monthly_sales"]
            
            # Count sales in current month (Tashkent time)
            today = self.get_tashkent_today()
            first_day = today.replace(day=1)
            
            q_count = select(func.count(Sale.id)).where(
                Sale.tenant_id == self.tenant_id,
                cast(Sale.created_at + timedelta(hours=5), Date) >= first_day
            )
            r_count = await self.db.execute(q_count)
            current_month_sales = r_count.scalar() or 0
            
            if current_month_sales >= max_s:
                raise HTTPException(
                    status_code=403, 
                    detail=f"Sizning oylik sotuvlar limiti ({max_s}) tugagan. Iltimos, tarifni yangilang."
                )

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
                    "product_id": product.id,
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

    async def delete_sale(self, sale_id: int) -> Dict:
        """Sotuvni o'chirish va mahsulot qoldig'ini qaytarish"""
        query = select(Sale).where(Sale.id == sale_id, Sale.tenant_id == self.tenant_id)
        res = await self.db.execute(query)
        sale = res.scalar_one_or_none()
        
        if not sale:
            return {"status": "error", "message": "Sotuv topilmadi."}
            
        # Mahsulotlarni qaytarish
        items = sale.items_json
        if isinstance(items, str):
            import json
            items = json.loads(items)
            
        for item in items:
            p_id = item.get("product_id")
            p_name = item.get("product")
            qty = float(item.get("quantity") or 0.0)
            
            if p_id:
                p_query = select(Product).where(Product.id == p_id, Product.tenant_id == self.tenant_id)
            else:
                p_query = select(Product).where(Product.name == p_name, Product.tenant_id == self.tenant_id)
            
            p_res = await self.db.execute(p_query)
            product = p_res.scalar_one_or_none()
            if product:
                product.stock += qty
                self.db.add(product)
        
        await self.db.delete(sale)
        await self.db.commit()
        return {"status": "success", "message": "Sotuv o'chirildi va ombor yangilandi."}
