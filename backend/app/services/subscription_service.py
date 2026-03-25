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
            activated_by=admin_id
        )
        self.db.add(subscription)
        await self.db.commit()
        await self.db.refresh(user)
        
        return {"status": "success", "message": f"{user.username} uchun {data.tier} obuna berildi."}

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
