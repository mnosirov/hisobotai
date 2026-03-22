from sqlalchemy.orm import Session
from ..models.models import Product, Sale, InventoryLog
from ..utils.ai_utils import analyze_handwritten_sales
from typing import List, Dict, Optional

class SalesService:
    def __init__(self, db: Session, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id

    def process_handwritten_sales(self, image_path: str):
        """Analyze handwritten notes and process them."""
        # Step 1: Extract data from Image
        raw_items = analyze_handwritten_sales(image_path)
        
        final_sale_items = []
        total_sale_amount = 0
        total_profit = 0
        unknown_products = []

        for item in raw_items:
            # Fuzzy match or name match
            name = item.get("name")
            qty = item.get("quantity", 0)
            item_total = item.get("total_price", 0)

            product = self.db.query(Product).filter(
                Product.tenant_id == self.tenant_id,
                Product.name.ilike(f"%{name}%")
            ).first()

            if product:
                # Calculate profit
                purchase_cost = product.last_purchase_price * qty
                profit = item_total - purchase_cost
                
                # Update stock
                product.stock -= qty
                
                final_sale_items.append({
                    "product_id": product.id,
                    "name": product.name,
                    "quantity": qty,
                    "price": item_total / qty if qty > 0 else 0
                })
                total_sale_amount += item_total
                total_profit += profit
            else:
                unknown_products.append(item)

        # Step 2: Record Sale if we have items
        if final_sale_items:
            sale = Sale(
                tenant_id=self.tenant_id,
                items_json=final_sale_items,
                total_amount=total_sale_amount,
                profit=total_profit
            )
            self.db.add(sale)
            self.db.commit()
            
        return {
            "processed_items": final_sale_items,
            "unknown_products": unknown_products,
            "total_amount": total_sale_amount,
            "total_profit": total_profit
        }
