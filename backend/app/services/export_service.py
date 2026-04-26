import pandas as pd
import io
from fastapi.responses import StreamingResponse
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

class ExportService:
    def __init__(self, db: AsyncSession, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id

    async def export_to_excel(self) -> StreamingResponse:
        from app.services.sales_service import SalesService
        from app.services.bi_service import BIService
        from app.services.supplier_service import SupplierService
        from app.services.expense_service import ExpenseService
        from app.services.inventory_service import InventoryService
        
        # Initialize services
        sales_svc = SalesService(self.db, self.tenant_id)
        bi_svc = BIService(self.db, self.tenant_id)
        supplier_svc = SupplierService(self.db, self.tenant_id)
        expense_svc = ExpenseService(self.db, self.tenant_id)
        inv_svc = InventoryService(self.db, self.tenant_id)

        # 1. Dashboard Summary Data
        sales_summary = await sales_svc.get_sales_summary()
        bi_summary = await bi_svc.get_business_summary()
        total_supplier_debt = await supplier_svc.get_total_debt()
        total_supplier_payments = await supplier_svc.get_total_payments()
        total_expenses = await expense_svc.get_total_expenses()
        total_sales_revenue = bi_summary.get("total_sales_revenue", 0)
        cash_balance = total_sales_revenue - total_supplier_payments - total_expenses
        
        summary_df = pd.DataFrame([{
            "Ko'rsatkich": "Sof Kassa (Qoldiq)", "Qiymat (UZS)": cash_balance
        }, {
            "Ko'rsatkich": "Jami Tushum (Savdo)", "Qiymat (UZS)": total_sales_revenue
        }, {
            "Ko'rsatkich": "Bugungi Foyda", "Qiymat (UZS)": sales_summary.get("today_profit", 0)
        }, {
            "Ko'rsatkich": "Jami Sklad Tan Narxi", "Qiymat (UZS)": bi_summary.get("total_stock_cost", 0)
        }, {
            "Ko'rsatkich": "Jami Sklad Sotish Narxi", "Qiymat (UZS)": bi_summary.get("total_stock_sell", 0)
        }, {
            "Ko'rsatkich": "Do'konlardan jami qarz", "Qiymat (UZS)": total_supplier_debt
        }, {
            "Ko'rsatkich": "Jami Chiqimlar", "Qiymat (UZS)": total_expenses
        }])

        # 2. Inventory Data
        inventory_items = await inv_svc.get_all_products()
        inv_data = []
        for p in inventory_items:
            inv_data.append({
                "Nomi": p.name,
                "Kategoriya": p.category or "-",
                "Miqdori": p.stock,
                "O'lchov": p.unit,
                "Kelish Narxi": p.last_purchase_price,
                "Sotish Narxi": p.sell_price,
                "Qo'shilgan Sana": p.created_at.strftime("%Y-%m-%d %H:%M") if p.created_at else ""
            })
        inv_df = pd.DataFrame(inv_data)

        # 3. Sales Data (Last 500 for export limit)
        sales_items = await sales_svc.get_sales_history(page=1, size=500)
        sales_data = []
        for s in sales_items:
            # Flatten items_json
            items_str = ", ".join([f"{i.get('product')} ({i.get('quantity')})" for i in s.items_json])
            sales_data.append({
                "ID": s.id,
                "Mahsulotlar": items_str,
                "Jami Summa": s.total_amount,
                "Foyda": s.profit,
                "Holati": "O'chirilgan" if s.is_deleted else "Faol",
                "Sana": s.created_at.strftime("%Y-%m-%d %H:%M") if s.created_at else ""
            })
        sales_df = pd.DataFrame(sales_data)

        # 4. Expenses Data
        expenses_items = await expense_svc.get_expenses()
        exp_data = []
        for e in expenses_items:
            exp_data.append({
                "Kategoriya": e.category,
                "Summa": e.amount,
                "Izoh": e.notes or "-",
                "Sana": e.created_at.strftime("%Y-%m-%d %H:%M") if e.created_at else ""
            })
        exp_df = pd.DataFrame(exp_data)
        
        # 5. Supplier Debts Data
        debts_items = await supplier_svc.get_debts()
        debt_data = []
        for d in debts_items:
            debt_data.append({
                "Yetkazib Beruvchi": d.supplier.name if d.supplier else "-",
                "Mahsulot": d.product.name if d.product else "O'chirilgan",
                "Jami Qarz": d.total_amount,
                "Qolgan Qarz": d.remaining_amount,
                "Izoh": d.notes or "-",
                "Sana": d.created_at.strftime("%Y-%m-%d %H:%M") if d.created_at else ""
            })
        debt_df = pd.DataFrame(debt_data)

        # Write to Excel in memory
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            summary_df.to_excel(writer, sheet_name='Xulosa', index=False)
            if not inv_df.empty:
                inv_df.to_excel(writer, sheet_name='Sklad', index=False)
            if not sales_df.empty:
                sales_df.to_excel(writer, sheet_name='Sotuvlar_Tarixi', index=False)
            if not exp_df.empty:
                exp_df.to_excel(writer, sheet_name='Chiqimlar', index=False)
            if not debt_df.empty:
                debt_df.to_excel(writer, sheet_name='Qarzlar', index=False)
                
            # Auto-adjust columns width
            for sheet_name in writer.sheets:
                worksheet = writer.sheets[sheet_name]
                for col in worksheet.columns:
                    max_length = 0
                    column = col[0].column_letter
                    for cell in col:
                        try:
                            if len(str(cell.value)) > max_length:
                                max_length = len(str(cell.value))
                        except:
                            pass
                    adjusted_width = (max_length + 2)
                    worksheet.column_dimensions[column].width = min(adjusted_width, 50) # Max 50 chars wide

        output.seek(0)
        
        filename = f"Hisobot_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
        
        headers = {
            'Content-Disposition': f'attachment; filename="{filename}"'
        }
        
        return StreamingResponse(
            iter([output.getvalue()]), 
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers=headers
        )
