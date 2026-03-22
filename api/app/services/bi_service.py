from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from ..models.models import Product, Sale
from typing import List, Dict

class BIService:
    def __init__(self, db: Session, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id

    def get_weekly_insights(self):
        """Analyzes sales trends and predicts inventory needs."""
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        
        # 1. Fetch sales for last 7 days
        sales = self.db.query(Sale).filter(
            Sale.tenant_id == self.tenant_id,
            Sale.created_at >= seven_days_ago
        ).all()

        # 2. Calculate velocity per product
        product_sales_volume = {} # {product_id: total_qty}
        for s in sales:
            items = s.items_json # List of {product_id, quantity, name}
            for item in items:
                pid = item.get("product_id")
                qty = item.get("quantity", 0)
                product_sales_volume[pid] = product_sales_volume.get(pid, 0) + qty

        # 3. Predict depletion for each product
        recommendations = []
        for pid, total_qty in product_sales_volume.items():
            avg_daily_sale = total_qty / 7
            
            product = self.db.query(Product).filter(Product.id == pid).first()
            if not product or avg_daily_sale == 0:
                continue

            days_remaining = product.stock / avg_daily_sale
            
            if days_remaining <= 3:
                # Urgent restock alert
                msg = (
                    f"Hurmatli tadbirkor, o'tgan haftada '{product.name}' sotilishi oshdi. "
                    f"Zaxirangiz {days_remaining:.1f} kunga yetadi xolos. "
                    f"Zudlik bilan buyurtma berishingizni tavsiya qilamiz."
                )
                recommendations.append({
                    "product_name": product.name,
                    "days_remaining": round(days_remaining, 1),
                    "suggested_qty": round(avg_daily_sale * 7), # Suggested 1 week stock
                    "message": msg
                })

        return recommendations

    def generate_monday_report(self):
        """Logic for Prompt 5: Generate push notification content."""
        best_sellers = self.get_weekly_insights()
        # This can be sent via Telegram Bot API
        return best_sellers
