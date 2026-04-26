from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, List, Optional
import os
import uuid
from PIL import Image
from app.models.models import Product, InventoryLog, SupplierDebt
from app.services.ai_service import AIService

class InventoryService:
    def __init__(self, db: AsyncSession, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id

    async def get_all_products(self) -> List[Product]:
        query = select(Product).where(Product.tenant_id == self.tenant_id)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def add_or_update_product(self, product_data: Dict, source: str, image_url: Optional[str] = None, supplier_id: Optional[int] = None, is_debt: bool = False) -> Product:
        from app.services.subscription_service import TIER_LIMITS
        from fastapi import HTTPException
        
        name = product_data.get("name", "Noma'lum")
        category = product_data.get("category", "Umumiy")
        quantity = float(product_data.get("quantity") or 0.0)
        unit = product_data.get("unit") or "dona"
        price = float(product_data.get("price") or 0.0)
        sell_price = float(product_data.get("sell_price") or 0.0)
        color = product_data.get("color")
        condition = product_data.get("condition")

        # Exact case-insensitive search
        query = select(Product).where(
            Product.tenant_id == self.tenant_id,
            Product.name.ilike(name)
        )
        result = await self.db.execute(query)
        product = result.scalar_one_or_none()

        if not product:
            # Check limits for NEW product
            # We need the user object to see the tier. 
            # I'll fetch the user from DB or update the service to hold it.
            from app.models.models import User
            user_res = await self.db.get(User, self.tenant_id)
            if user_res and user_res.is_admin != 1:
                tier = user_res.subscription_tier or "free"
                max_p = TIER_LIMITS.get(tier, TIER_LIMITS["free"])["max_products"]
                
                # Count current products
                from sqlalchemy import func
                count_q = select(func.count(Product.id)).where(Product.tenant_id == self.tenant_id)
                count_res = await self.db.execute(count_q)
                current_count = count_res.scalar() or 0
                
                if current_count >= max_p:
                    raise HTTPException(
                        status_code=403, 
                        detail=f"Sizning tarifingizda mahsulotlar limiti ({max_p}) tugagan. Iltimos, tarifni yangilang."
                    )
        
        if product:
            product.stock += quantity
            if category and category != "Umumiy":
                product.category = category
            if price > 0:
                product.last_purchase_price = price
            if sell_price > 0:
                product.sell_price = sell_price
            if color:
                product.color = color
            if condition:
                product.condition = condition
            if image_url:
                product.image_url = image_url
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
                sell_price=sell_price,
                color=color,
                condition=condition,
                image_url=image_url
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
        
        # Handle Supplier Debt
        if is_debt and supplier_id:
            total_cost = quantity * price
            if total_cost > 0:
                debt = SupplierDebt(
                    tenant_id=self.tenant_id,
                    supplier_id=supplier_id,
                    product_id=product.id,
                    total_amount=total_cost,
                    remaining_amount=total_cost,
                    notes=f"Qarzga olingan: {product.name} ({quantity} {unit})"
                )
                self.db.add(debt)

        await self.db.commit()
        await self.db.refresh(product)
        return product

    @staticmethod
    def process_product_image(image_bytes: bytes, filename: str) -> str:
        """Katta rasmlarni kichraytirib, formatini to'g'irlab beradi (Pillow)."""
        upload_dir = "static/uploads/products"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Unique filename
    def process_product_image(self, image_bytes: bytes, filename: str) -> str:
        """Cloudinary xizmatiga rasmni yuklaydi va URL qaytaradi."""
        from io import BytesIO
        import cloudinary.uploader
        
        # Pillow processing: 500px max, optimized
        img = Image.open(BytesIO(image_bytes))
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        max_size = (500, 500)
        resample_filter = getattr(Image, 'Resampling', Image).LANCZOS
        img.thumbnail(max_size, resample=resample_filter)
        
        # Save processed image to a buffer
        buffer = BytesIO()
        img.save(buffer, format="JPEG", quality=85)
        buffer.seek(0)
        
        try:
            # Check if cloudinary is configured
            if not os.getenv("CLOUDINARY_CLOUD_NAME") or "placeholder" in os.getenv("CLOUDINARY_CLOUD_NAME", ""):
                print("DEBUG: Cloudinary keys not set, falling back to local storage")
                os.makedirs("static/uploads/products", exist_ok=True)
                new_filename = f"{uuid.uuid4()}.jpg"
                with open(f"static/uploads/products/{new_filename}", "wb") as f:
                    f.write(buffer.getvalue())
                return f"/static/uploads/products/{new_filename}"
            
            # Upload to Cloudinary
            print(f"DEBUG: Attempting Cloudinary upload for {filename}")
            upload_result = cloudinary.uploader.upload(
                buffer,
                folder="hisobotai_products",
                public_id=f"prod_{uuid.uuid4().hex[:8]}",
                resource_type="image"
            )
            secure_url = upload_result.get("secure_url")
            print(f"DEBUG: Cloudinary upload success: {secure_url}")
            return secure_url
        except Exception as e:
            print(f"ERROR: Cloudinary upload failed: {e}")
            import traceback
            traceback.print_exc()
            return ""
    async def analyze_voice_upload(self, audio_path: str) -> List[Dict]:
        """AI orqali ovozli xabardan mahsulotlarni o'qiydi."""
        text = await AIService.transcribe_audio(audio_path)
        raw_items = await AIService.parse_voice_intent(text, mode="inventory")
        
        analyzed_items = []
        for item in raw_items:
            name = item.get("name", "Noma'lum")
            category = item.get("category", "Umumiy")
            quantity = float(item.get("quantity") or 0.0)
            unit = item.get("unit") or "dona"
            price = float(item.get("price") or 0.0)
            
            quantity = min(quantity, 999999)
            price = min(price, 999999999)
            
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

    async def update_product(self, product_id: int, data: Dict, image_url: Optional[str] = None) -> Product:
        """Mavjud mahsulot ma'lumotlarini tahrirlaydi."""
        from fastapi import HTTPException
        query = select(Product).where(Product.id == product_id, Product.tenant_id == self.tenant_id)
        result = await self.db.execute(query)
        product = result.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail="Mahsulot topilmadi")

        if "name" in data: product.name = data["name"]
        if "category" in data: product.category = data["category"]
        if "stock" in data: product.stock = float(data["stock"])
        if "unit" in data: product.unit = data["unit"]
        if "last_purchase_price" in data: product.last_purchase_price = float(data["last_purchase_price"])
        if "sell_price" in data: product.sell_price = float(data["sell_price"])
        if "color" in data: product.color = data["color"]
        if "condition" in data: product.condition = data["condition"]
        if image_url: product.image_url = image_url

        await self.db.commit()
        await self.db.refresh(product)
        return product

    async def delete_product(self, product_id: int):
        """Mahsulotni o'chiradi."""
        from fastapi import HTTPException
        query = select(Product).where(Product.id == product_id, Product.tenant_id == self.tenant_id)
        result = await self.db.execute(query)
        product = result.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail="Mahsulot topilmadi")

        await self.db.delete(product)
        await self.db.commit()
        return True

    async def return_product_to_supplier(self, product_id: int):
        """Mahsulotni do'konga qaytaradi va qarzni bekor qiladi."""
        from fastapi import HTTPException
        from app.models.models import SupplierDebt
        
        # 1. Mahsulotni topish
        query = select(Product).where(Product.id == product_id, Product.tenant_id == self.tenant_id)
        result = await self.db.execute(query)
        product = result.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail="Mahsulot topilmadi")

        # 2. Bog'langan qarzni topish va o'chirish
        debt_query = select(SupplierDebt).where(SupplierDebt.product_id == product_id, SupplierDebt.tenant_id == self.tenant_id)
        debt_result = await self.db.execute(debt_query)
        debt = debt_result.scalar_one_or_none()
        
        if debt:
            from app.models.models import SupplierPaymentLog
            
            # 2.1 Agar bu qarz uchun avval to'lov qilingan bo'lsa, u to'lovlarni tarixini o'chiramiz.
            # Bu orqali pul avtomatik ravishda Kassaga qaytadi.
            payment_query = select(SupplierPaymentLog).where(SupplierPaymentLog.debt_id == debt.id)
            payment_result = await self.db.execute(payment_query)
            payments = payment_result.scalars().all()
            for payment in payments:
                await self.db.delete(payment)
                
            await self.db.delete(debt)

        # 3. Tarixga qaydni yozish
        log = InventoryLog(
            tenant_id=self.tenant_id,
            product_id=product_id,
            change_amount=-product.stock,
            source="Do'konga qaytarildi"
        )
        self.db.add(log)

        # 4. Mahsulotni o'chirish
        await self.db.delete(product)
        await self.db.commit()
        return True

    async def bulk_upsert_products(self, items: List[Dict], source: str = "Ommaviy yuklash") -> List[Product]:
        """Bir nechta mahsulotni ommaviy qo'shadi yoki yangilaydi."""
        results = []
        for item in items:
            try:
                # add_or_update_product allaqachon limitlarni tekshiradi va commit qiladi
                product = await self.add_or_update_product(item, source=source)
                results.append(product)
            except Exception as e:
                print(f"Error bulk upserting item {item.get('name')}: {e}")
                continue
        return results

