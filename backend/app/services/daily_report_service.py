from datetime import datetime, timedelta
from typing import Dict, Any, List
from sqlalchemy import select, func, and_, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.models import Sale, Expense, SupplierDebt, SupplierPaymentLog, Product, InventoryLog

class DailyReportService:
    def __init__(self, db: AsyncSession, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id

    async def get_daily_report(self, date_str: str) -> Dict[str, Any]:
        """Gets a consolidated report for a specific date (YYYY-MM-DD)"""
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            start_dt = datetime.combine(target_date, datetime.min.time())
            end_dt = datetime.combine(target_date, datetime.max.time())
        except ValueError:
            raise ValueError("Noto'g'ri sana formati. YYYY-MM-DD bo'lishi kerak.")

        # 1. Sales Data
        sales_query = select(Sale).where(
            and_(
                Sale.tenant_id == self.tenant_id,
                Sale.is_deleted == 0,
                cast(Sale.created_at, Date) == target_date
            )
        )
        sales_result = await self.db.execute(sales_query)
        sales = sales_result.scalars().all()

        total_sales_revenue = sum(s.total_amount for s in sales)
        total_sales_profit = sum(s.profit for s in sales)
        
        # Aggregate sold items
        sold_items_dict = {}
        for s in sales:
            for item in s.items_json:
                name = item.get("product", "Noma'lum")
                qty = item.get("quantity", 0)
                rev = item.get("revenue", 0)
                prof = item.get("profit", 0)
                
                if name not in sold_items_dict:
                    sold_items_dict[name] = {"quantity": 0, "revenue": 0, "profit": 0}
                sold_items_dict[name]["quantity"] += qty
                sold_items_dict[name]["revenue"] += rev
                sold_items_dict[name]["profit"] += prof

        sold_items_list = [{"name": k, **v} for k, v in sold_items_dict.items()]
        sold_items_list.sort(key=lambda x: x["revenue"], reverse=True)

        # 2. Expenses Data
        expenses_query = select(Expense).where(
            and_(
                Expense.tenant_id == self.tenant_id,
                cast(Expense.created_at, Date) == target_date
            )
        )
        expenses_result = await self.db.execute(expenses_query)
        expenses = expenses_result.scalars().all()

        total_expenses = sum(e.amount for e in expenses)
        expenses_list = [{"category": e.category, "amount": e.amount, "notes": e.notes} for e in expenses]

        # DEBUG: Basic verification
        debug_count_query = select(func.count()).where(InventoryLog.tenant_id == self.tenant_id)
        debug_count_result = await self.db.execute(debug_count_query)
        total_logs_count = debug_count_result.scalar()

        # 3. Inventory Kirim Data
        inv_query = select(InventoryLog, Product.name, Product.last_purchase_price).join(
            Product, InventoryLog.product_id == Product.id
        ).where(
            and_(
                InventoryLog.tenant_id == self.tenant_id,
                InventoryLog.change_amount > 0,
                func.date(InventoryLog.created_at) == target_date
            )
        )
        inv_result = await self.db.execute(inv_query)
        logs = inv_result.all()
        
        total_purchases = 0
        purchases_list = []
        for log_row in logs:
            log_obj = log_row[0]
            prod_name = log_row[1]
            prod_price = log_row[2]
            
            cost = log_obj.change_amount * prod_price
            total_purchases += cost
            purchases_list.append({
                "name": prod_name,
                "quantity": log_obj.change_amount,
                "cost": cost,
                "source": log_obj.source,
                "time": log_obj.created_at.strftime("%H:%M") if log_obj.created_at else None
            })

        # 4. Debts and Payments
        debts_query = select(SupplierDebt).where(
            and_(
                SupplierDebt.tenant_id == self.tenant_id,
                cast(SupplierDebt.created_at, Date) == target_date
            )
        )
        debts_result = await self.db.execute(debts_query)
        new_debts = sum(d.total_amount for d in debts_result.scalars().all())

        payments_query = select(SupplierPaymentLog).where(
            and_(
                SupplierPaymentLog.tenant_id == self.tenant_id,
                cast(SupplierPaymentLog.payment_date, Date) == target_date
            )
        )
        payments_result = await self.db.execute(payments_query)
        debt_payments = sum(p.amount for p in payments_result.scalars().all())

        # Net Daily Cash calculation (Rough estimate for the day)
        # In: Sales revenue
        # Out: Expenses, Debt Payments
        net_cash_flow = total_sales_revenue - total_expenses - debt_payments

        return {
            "date": date_str,
            "summary": {
                "total_sales_revenue": total_sales_revenue,
                "total_sales_profit": total_sales_profit,
                "total_expenses": total_expenses,
                "total_purchases_cost": total_purchases,
                "new_debts_taken": new_debts,
                "debt_payments_made": debt_payments,
                "net_cash_flow": net_cash_flow,
                "sales_count": len(sales),
                "debug_total_logs": total_logs_count,
                "debug_date_logs": len(logs)
            },
            "sold_items": sold_items_list,
            "expenses": expenses_list,
            "purchases": purchases_list,
            "sales_transactions": [
                {
                    "id": s.id,
                    "total_amount": s.total_amount,
                    "profit": s.profit,
                    "items_json": s.items_json,
                    "created_at": s.created_at.isoformat() if s.created_at else ""
                }
                for s in sales
            ]
        }
