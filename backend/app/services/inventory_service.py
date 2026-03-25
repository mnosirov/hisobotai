from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, List
from app.models.models import Product, InventoryLog
from app.services.ai_service import AIService

class InventoryService:
    def __init__(self, db: AsyncSession, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id

    async def get_all_products(self) -> List[Product]:
        query = select(Product).where(Product.tenant_id == self.tenant_id)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def add_or_update_product(self, product_data: Dict, source: str) -> Product:
        name = product_data.get("name", "Noma'lum")
        category = product_data.get("category", "Umumiy")
        quantity = float(product_data.get("quantity") or 0.0)
        unit = product_data.get("unit") or "dona"
        price = float(product_data.get("price") or 0.0)
        sell_price = float(product_data.get("sell_price") or 0.0)

        # Exact case-insensitive search to avoid fuzzy match accidents
        query = select(Product).where(
            Product.tenant_id == self.tenant_id,
            Product.name.ilike(name)
        )
        result = await self.db.execute(query)
        product = result.scalar_one_or_none()

        if product:
            product.stock += quantity
            if category and category != "Umumiy":
                product.category = category
            if price > 0:
                product.last_purchase_price = price
            if sell_price > 0:
                product.sell_price = sell_price
        else:
            if sell_price == 0:
                sell_price = price * 1.2  # Default 20% margin
            product = Product(
                tenant_id=self.tenant_id,
                name=name,
                category=category,
                unit=unit,
                stock=quantity,
                last_purchase_price=price,
                sell_price=sell_price
            )
            self.db.add(product)
            await self.db.flush()

        log = InventoryLog(
            tenant_id=self.tenant_id,
            product_id=product.id,
            change_amount=quantity,
            source=source
        )
        self.db.add(log)
        await self.db.commit()
        await self.db.refresh(product)
        return product

    async def analyze_invoice_upload(self, image_path: str) -> List[Dict]:
        """AI orqali fakturadan ma'lumotlarni o'qiydi, lekin bazaga saqlamaydi."""
        raw_items = await AIService.extract_invoice_data(image_path)
        analyzed_items = []
        
        for item in raw_items:
            name = item.get("name", "Noma'lum")
            category = item.get("category", "Umumiy")
            quantity = float(item.get("quantity") or 0.0)
            unit = item.get("unit") or "dona"
            price = float(item.get("price") or 0.0)
            
            # Mavjud mahsulotni qidirish
            query = select(Product).where(
                Product.tenant_id == self.tenant_id,
                Product.name.ilike(f"%{name}%")
            )
            result = await self.db.execute(query)
            product = result.scalar_one_or_none()
            
            analyzed_items.append({
                "product_id": product.id if product else None,
                "name": product.name if product else name,
                "category": product.category if product else category,
                "quantity": quantity,
                "unit": product.unit if product else unit,
                "price": price,
                "is_new": product is None
            })
        return analyzed_items

    async def commit_invoice_upload(self, items: List[Dict]) -> List[Product]:
        """Foydalanuvchi tasdiqlagan faktura ma'lumotlarini bazaga saqlaydi."""
        processed_products = []
        for item in items:
            product = await self.add_or_update_product(item, source="Faktura (AI)")
            processed_products.append(product)
        return processed_products

