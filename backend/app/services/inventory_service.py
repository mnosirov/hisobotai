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
        name = product_data.get("name")
        quantity = product_data.get("quantity", 0)
        unit = product_data.get("unit", "dona")
        price = product_data.get("price", 0.0)
        sell_price = product_data.get("sell_price", 0.0)

        # Basic case-insensitive search
        query = select(Product).where(
            Product.tenant_id == self.tenant_id,
            Product.name.ilike(f"%{name}%")
        )
        result = await self.db.execute(query)
        product = result.scalar_one_or_none()

        if product:
            product.stock += quantity
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

    async def process_invoice_upload(self, image_path: str) -> List[Product]:
        items = await AIService.extract_invoice_data(image_path)
        processed_products = []
        for item in items:
            product = await self.add_or_update_product(item, source="Faktura (AI)")
            processed_products.append(product)
        return processed_products
