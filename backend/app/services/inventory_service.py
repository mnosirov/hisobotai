from sqlalchemy.orm import Session
from ..models.models import Product, InventoryLog
from ..utils.ai_utils import extract_products_from_text, transcribe_audio, process_invoice_vision
from typing import List, Dict

class InventoryService:
    def __init__(self, db: Session, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id

    def add_or_update_product(self, product_data: Dict, source: str):
        """Adds a product to inventory or updates existing stock."""
        name = product_data.get("name")
        quantity = product_data.get("quantity", 0)
        unit = product_data.get("unit", "ta")
        price = product_data.get("price", 0.0)

        # Search for existing product (Basic matching, can be improved with fuzzy search)
        product = self.db.query(Product).filter(
            Product.tenant_id == self.tenant_id,
            Product.name.ilike(f"%{name}%")
        ).first()

        if product:
            # Update existing product stock
            product.stock += quantity
            if price > 0:
                product.last_purchase_price = price
        else:
            # Create a new product automatically
            product = Product(
                tenant_id=self.tenant_id,
                name=name,
                unit=unit,
                stock=quantity,
                last_purchase_price=price,
                sell_price=price * 1.2  # Default margin 20%
            )
            self.db.add(product)
            self.db.flush() # Get product.id

        # Log the operation
        log = InventoryLog(
            tenant_id=self.tenant_id,
            product_id=product.id,
            change_amount=quantity,
            source=source
        )
        self.db.add(log)
        self.db.commit()
        return product

    def handle_voice_inventory(self, audio_path: str):
        """Logic for Prompt 2: Voice-to-Inventory."""
        text = transcribe_audio(audio_path)
        extracted = extract_products_from_text(text)
        
        results = []
        for item in extracted:
            res = self.add_or_update_product(item, source="Ovozli xabar")
            results.append(res)
        return results

    def handle_invoice_ocr(self, image_path: str):
        """Logic for Prompt 2: Invoice-OCR."""
        extracted = process_invoice_vision(image_path)
        
        results = []
        for item in extracted:
            res = self.add_or_update_product(item, source="Faktura")
            results.append(res)
        return results
