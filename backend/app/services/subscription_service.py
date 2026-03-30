from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException, status
from datetime import datetime, timedelta, timezone
from app.models.models import User, Subscription
from app.schemas import schemas

# Tashkent timezone offset (UTC+5)
TASHKENT_OFFSET = timezone(timedelta(hours=5))

def now_tashkent():
    return datetime.now(TASHKENT_OFFSET).replace(tzinfo=None)


class SubscriptionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all_users(self):
        """Admin uchun barcha foydalanuvchilar ro'yxati"""
        query = select(User).order_by(User.id)
        result = await self.db.execute(query)
        users = result.scalars().all()
        
        now = now_tashkent()
        user_list = []
        for u in users:
            is_active = False
            if u.subscription_tier in ("standard", "premium") and u.subscription_end:
                is_active = u.subscription_end > now
            
            user_list.append(schemas.UserAdminResponse(
                id=u.id,
                username=u.username,
                email=u.email,
                is_admin=u.is_admin or 0,
                subscription_tier=u.subscription_tier or "free",
                subscription_start=u.subscription_start,
                subscription_end=u.subscription_end,
                is_active=is_active,
                created_at=u.created_at
            ))
        return user_list

    async def grant_subscription(self, data: schemas.SubscriptionGrant, admin_id: int):
        """Admin obuna beradi"""
        # Foydalanuvchi mavjudligini tekshirish
        query = select(User).where(User.id == data.user_id)
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Foydalanuvchi topilmadi."
            )
        
        if data.end_date <= data.start_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tugash sanasi boshlanish sanasidan keyin bo'lishi kerak."
            )
        
        # Ensure naive datetimes for DB compatibility
        start_date = data.start_date.replace(tzinfo=None) if data.start_date.tzinfo else data.start_date
        end_date = data.end_date.replace(tzinfo=None) if data.end_date.tzinfo else data.end_date

        # User modelini yangilash
        user.subscription_tier = data.tier
        user.subscription_start = start_date
        user.subscription_end = end_date
        
        # To'lov tarixiga yozish
        subscription = Subscription(
            user_id=data.user_id,
            tier=data.tier,
            start_date=start_date,
            end_date=end_date,
            activated_by=admin_id,
            price=data.price
        )
        self.db.add(subscription)
        await self.db.commit()
        await self.db.refresh(user)
        
        return {"status": "success", "message": f"{user.username} uchun {data.tier} obuna ({data.price} UZS) berildi."}

    async def revoke_subscription(self, user_id: int):
        """Obunani bekor qilish"""
        query = select(User).where(User.id == user_id)
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Foydalanuvchi topilmadi."
            )
        
        user.subscription_tier = "free"
        user.subscription_start = None
        user.subscription_end = None
        await self.db.commit()
        
        return {"status": "success", "message": f"{user.username} obunasi bekor qilindi."}

    async def get_subscription_history(self):
        """Barcha to'lov tarixi"""
        query = select(Subscription).order_by(Subscription.created_at.desc())
        result = await self.db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def check_and_expire(user: User, db: AsyncSession):
        """Obuna muddati tekshiruvi — avtomatik expire"""
        if user.subscription_tier in ("standard", "premium") and user.subscription_end:
            now = now_tashkent()
            sub_end = user.subscription_end.replace(tzinfo=None) if user.subscription_end.tzinfo else user.subscription_end
            if sub_end < now:
                user.subscription_tier = "free"
                user.subscription_start = None
                user.subscription_end = None
                await db.commit()

    async def get_system_stats(self) -> schemas.SystemStats:
        """Admin uchun tizim statistikasi"""
        now = now_tashkent()
        
        # Total Users
        q_users = select(sa.func.count(User.id))
        res_users = await self.db.execute(q_users)
        total_users = res_users.scalar() or 0
        
        # Active Subscriptions
        q_active = select(sa.func.count(User.id)).where(
            User.subscription_tier != "free",
            User.subscription_end > now
        )
        res_active = await self.db.execute(q_active)
        active_subscriptions = res_active.scalar() or 0
        
        # Total Revenue
        q_rev = select(sa.func.sum(Subscription.price))
        res_rev = await self.db.execute(q_rev)
        total_revenue = res_rev.scalar() or 0.0
        
        # New users today (last 24h)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        q_today = select(sa.func.count(User.id)).where(User.created_at >= today_start)
        res_today = await self.db.execute(q_today)
        new_users_today = res_today.scalar() or 0
        
        # Growth last 7 days
        growth_7d = []
        import sqlalchemy as sa
        for i in range(6, -1, -1):
            d = now - timedelta(days=i)
            d_start = d.replace(hour=0, minute=0, second=0, microsecond=0)
            d_end = d.replace(hour=23, minute=59, second=59, microsecond=999999)
            
            q_g = select(sa.func.count(User.id)).where(
                User.created_at >= d_start,
                User.created_at <= d_end
            )
            r_g = await self.db.execute(q_g)
            growth_7d.append(schemas.DailyGrowth(
                date=d.strftime("%d-%b"),
                count=r_g.scalar() or 0
            ))
            
        return schemas.SystemStats(
            total_users=total_users,
            active_subscriptions=active_subscriptions,
            total_revenue=total_revenue,
            new_users_today=new_users_today,
            growth_7d=growth_7d
        )
