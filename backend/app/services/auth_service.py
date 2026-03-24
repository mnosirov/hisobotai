from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.models import User
from app.core.security import get_password_hash, verify_password, create_access_token
from app.schemas import schemas

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register_user(self, user_data: schemas.UserCreate) -> User:
        # Check if user already exists
        query = select(User).where((User.email == user_data.email) | (User.username == user_data.username))
        result = await self.db.execute(query)
        if result.first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bunday email yoki foydalanuvchi nomi allaqachon mavjud."
            )
        
        new_user = User(
            username=user_data.username,
            email=user_data.email,
            hashed_password=get_password_hash(user_data.password)
        )
        self.db.add(new_user)
        await self.db.commit()
        await self.db.refresh(new_user)
        return new_user

    async def authenticate_user(self, login_data: schemas.UserLogin) -> dict:
        query = select(User).where(User.email == login_data.email)
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()
        
        if not user or not verify_password(login_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email yoki parol xato.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email
            }
        }
