import pandas as pd
from io import BytesIO
from typing import List, Dict
from app.models.models import Product

class ExcelService:
    @staticmethod
    def export_products_to_excel(products: List[Product]) -> bytes:
        """Mahsulotlar ro'yxatini Excel fayliga eksport qiladi."""
        data = []
        for p in products:
            data.append({
                "Nomi": p.name,
                "Kategoriya": p.category,
                "Birlik": p.unit,
                "Qoldiq": p.stock,
                "Kelish narxi": p.last_purchase_price,
                "Sotish narxi": p.sell_price,
                "Rangi": p.color or "",
                "Holati": p.condition or "",
                "Yaratilgan vaqti": p.created_at.strftime("%Y-%m-%d %H:%M") if p.created_at else ""
            })
        
        df = pd.DataFrame(data)
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Mahsulotlar')
        
        return output.getvalue()

    @staticmethod
    def parse_products_from_excel(file_bytes: bytes) -> List[Dict]:
        """Excel faylidan mahsulotlar ma'lumotlarini o'qiydi."""
        df = pd.read_excel(BytesIO(file_bytes), engine='openpyxl')
        
        # Sarlavhalarni normallashtirish (kichik harflar va bo'shliqlarsiz)
        # O'zbekcha va inglizcha sarlavhalarni qo'llab-quvvatlaymiz
        column_mapping = {
            "nomi": "name", "name": "name", "mahsulot": "name",
            "kategoriya": "category", "category": "category",
            "birlik": "unit", "unit": "unit", "o'lchov": "unit",
            "qoldiq": "quantity", "stock": "quantity", "miqdor": "quantity",
            "kelish narxi": "price", "buy_price": "price", "last_purchase_price": "price",
            "sotish narxi": "sell_price", "sell_price": "sell_price", "narxi": "sell_price",
            "rangi": "color", "color": "color", "rang": "color",
            "holati": "condition", "condition": "condition", "holat": "condition"
        }
        
        products = []
        for _, row in df.iterrows():
            product_data = {}
            for col_name, value in row.items():
                norm_name = str(col_name).lower().strip()
                if norm_name in column_mapping:
                    key = column_mapping[norm_name]
                    # NaN qiymatlarni None ga aylantirish
                    if pd.isna(value):
                        product_data[key] = None
                    else:
                        product_data[key] = value
            
            if product_data.get("name"):
                products.append(product_data)
        
        return products
