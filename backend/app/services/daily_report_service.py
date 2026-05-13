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
        except ValueError:
            raise ValueError("Noto'g'ri sana formati. YYYY-MM-DD bo'lishi kerak.")

        # 1. Sales Data
        sales_query = select(Sale).where(
            and_(
                Sale.tenant_id == self.tenant_id,
                Sale.is_deleted == 0
            )
        )
        sales_result = await self.db.execute(sales_query)
        all_sales = sales_result.scalars().all()
        sales = [s for s in all_sales if s.created_at and s.created_at.date() == target_date]

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
        expenses_query = select(Expense).where(Expense.tenant_id == self.tenant_id)
        expenses_result = await self.db.execute(expenses_query)
        all_expenses = expenses_result.scalars().all()
        expenses = [e for e in all_expenses if e.created_at and e.created_at.date() == target_date]

        total_expenses = sum(e.amount for e in expenses)
        expenses_list = [{"category": e.category, "amount": e.amount, "notes": e.notes} for e in expenses]

        # DEBUG: Basic verification
        debug_count_query = select(func.count()).where(InventoryLog.tenant_id == self.tenant_id)
        debug_count_result = await self.db.execute(debug_count_query)
        total_logs_count = debug_count_result.scalar()

        # DEBUG: Full system diagnostics
        total_logs_all = (await self.db.execute(select(func.count()).select_from(InventoryLog))).scalar()
        total_prods_all = (await self.db.execute(select(func.count()).select_from(Product))).scalar()
        tenant_logs_count = (await self.db.execute(select(func.count()).where(InventoryLog.tenant_id == self.tenant_id))).scalar()
        
        latest_logs_q = select(InventoryLog, Product.name).join(Product).where(InventoryLog.tenant_id == self.tenant_id).order_by(InventoryLog.id.desc()).limit(5)
        latest_logs_res = await self.db.execute(latest_logs_q)
        latest_logs_data = [{"id": l[0].id, "name": l[1], "amount": l[0].change_amount, "date": str(l[0].created_at)} for l in latest_logs_res.all()]

        # 3. Inventory Kirim Data
        inv_query = select(InventoryLog, Product.name, Product.last_purchase_price).join(
            Product, InventoryLog.product_id == Product.id
        ).where(
            and_(
                InventoryLog.tenant_id == self.tenant_id,
                InventoryLog.change_amount > 0
            )
        )
        inv_result = await self.db.execute(inv_query)
        all_logs = inv_result.all()
        
        # Python-side filtering for logs
        logs = [
            row for row in all_logs 
            if row[0].created_at and row[0].created_at.date() == target_date
        ]
        
        total_purchases = 0
        purchases_list = []
        for log_row in logs:
            log_obj = log_row[0]
            prod_name = log_row[1]
            prod_price = log_row[2]
            
            cost = log_obj.change_amount * prod_price
            total_purchases += cost
            purchases_list.append({
                "id": log_obj.id,
                "name": prod_name,
                "quantity": log_obj.change_amount,
                "cost": cost,
                "source": log_obj.source,
                "time": log_obj.created_at.strftime("%H:%M") if log_obj.created_at else None
            })

        # 4. Debts and Payments
        debts_query = select(SupplierDebt).where(SupplierDebt.tenant_id == self.tenant_id)
        debts_result = await self.db.execute(debts_query)
        all_debts = debts_result.scalars().all()
        new_debts = sum(d.total_amount for d in all_debts if d.created_at and d.created_at.date() == target_date)

        payments_query = select(SupplierPaymentLog).where(SupplierPaymentLog.tenant_id == self.tenant_id)
        payments_result = await self.db.execute(payments_query)
        all_payments = payments_result.scalars().all()
        debt_payments = sum(p.amount for p in all_payments if p.payment_date and p.payment_date.date() == target_date)

        # Net Daily Cash calculation
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
                "debug": {
                    "total_system_logs": total_logs_all,
                    "total_system_prods": total_prods_all,
                    "tenant_logs_total": tenant_logs_count,
                    "tenant_id_used": self.tenant_id,
                    "target_date_searched": str(target_date),
                    "latest_tenant_logs": latest_logs_data
                }
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

    async def get_monthly_report(self, year: int, month: int) -> Dict[str, Any]:
        """Gets a consolidated report for an entire month (YYYY-MM)"""
        # 1. Fetch all relevant data for the tenant
        sales_query = select(Sale).where(and_(Sale.tenant_id == self.tenant_id, Sale.is_deleted == 0))
        expenses_query = select(Expense).where(Expense.tenant_id == self.tenant_id)
        logs_query = select(InventoryLog, Product.name, Product.last_purchase_price).join(
            Product, InventoryLog.product_id == Product.id
        ).where(and_(InventoryLog.tenant_id == self.tenant_id, InventoryLog.change_amount > 0))
        
        debts_query = select(SupplierDebt).where(SupplierDebt.tenant_id == self.tenant_id)
        payments_query = select(SupplierPaymentLog).where(SupplierPaymentLog.tenant_id == self.tenant_id)
        
        # Execute queries
        sales_res = await self.db.execute(sales_query)
        expenses_res = await self.db.execute(expenses_query)
        logs_res = await self.db.execute(logs_query)
        debts_res = await self.db.execute(debts_query)
        payments_res = await self.db.execute(payments_query)
        
        all_sales = sales_res.scalars().all()
        all_expenses = expenses_res.scalars().all()
        all_logs = logs_res.all()
        all_debts = debts_res.scalars().all()
        all_payments = payments_res.scalars().all()
        
        # Filter by Month in Python
        monthly_sales = [s for s in all_sales if s.created_at and s.created_at.year == year and s.created_at.month == month]
        monthly_expenses = [e for e in all_expenses if e.created_at and e.created_at.year == year and e.created_at.month == month]
        monthly_logs = [row for row in all_logs if row[0].created_at and row[0].created_at.year == year and row[0].created_at.month == month]
        monthly_debts = [d for d in all_debts if d.created_at and d.created_at.year == year and d.created_at.month == month]
        monthly_payments = [p for p in all_payments if p.payment_date and p.payment_date.year == year and p.payment_date.month == month]
        
        # Aggregations
        total_revenue = sum(s.total_amount for s in monthly_sales)
        total_profit = sum(s.profit for s in monthly_sales)
        total_expenses = sum(e.amount for e in monthly_expenses)
        total_purchases_cost = sum(row[0].change_amount * row[2] for row in monthly_logs)
        total_new_debts = sum(d.total_amount for d in monthly_debts)
        total_payments_made = sum(p.amount for p in monthly_payments)
        
        # Product-wise sales aggregation
        sold_items_dict = {}
        for s in monthly_sales:
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
        
        # Expense category aggregation
        expenses_by_cat = {}
        for e in monthly_expenses:
            cat = e.category or "Boshqa"
            expenses_by_cat[cat] = expenses_by_cat.get(cat, 0) + e.amount
        
        expenses_summary = [{"category": k, "amount": v} for k, v in expenses_by_cat.items()]

        return {
            "year": year,
            "month": month,
            "summary": {
                "total_revenue": total_revenue,
                "total_profit": total_profit,
                "total_expenses": total_expenses,
                "total_purchases_cost": total_purchases_cost,
                "total_new_debts": total_new_debts,
                "total_payments_made": total_payments_made,
                "net_profit": total_profit - total_expenses,
                "net_cash_flow": total_revenue - total_expenses - total_payments_made,
                "sales_count": len(monthly_sales)
            },
            "sold_items": sold_items_list,
            "expenses_by_category": expenses_summary
        }

    async def get_monthly_summary_only(self) -> Dict[str, Any]:
        """Lightweight summary for current month dashboard cards using UTC boundaries"""
        # Get current Tashkent time
        now_uz = datetime.utcnow() + timedelta(hours=5)
        year, month = now_uz.year, now_uz.month
        
        # Tashkent month boundaries
        start_uz = datetime(year, month, 1)
        if month == 12:
            end_uz = datetime(year + 1, 1, 1)
        else:
            end_uz = datetime(year, month + 1, 1)
            
        # Convert boundaries back to UTC
        start_utc = start_uz - timedelta(hours=5)
        end_utc = end_uz - timedelta(hours=5)
        
        q_sales = select(func.sum(Sale.total_amount), func.sum(Sale.profit)).where(
            and_(
                Sale.tenant_id == self.tenant_id,
                Sale.is_deleted == 0,
                Sale.created_at >= start_utc,
                Sale.created_at < end_utc
            )
        )
        res_sales = await self.db.execute(q_sales)
        row = res_sales.first()
        rev = row[0] if row and row[0] is not None else 0
        prof = row[1] if row and row[1] is not None else 0
        
        q_exp = select(func.sum(Expense.amount)).where(
            and_(
                Expense.tenant_id == self.tenant_id,
                Expense.created_at >= start_utc,
                Expense.created_at < end_utc
            )
        )
        res_exp = await self.db.execute(q_exp)
        total_exp = res_exp.scalar() or 0
        
        return {
            "monthly_revenue": int(rev),
            "monthly_profit": int(prof),
            "monthly_expenses": int(total_exp)
        }
