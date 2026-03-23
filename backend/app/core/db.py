import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from dotenv import load_dotenv

load_dotenv()

# We expect a PostgreSQL URL connecting via asyncpg
# E.g., postgresql+asyncpg://user:pass@host/dbname
raw_url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./hisobot.db")

# Automatically inject the asyncpg dialect if it's a standard postgres url
if raw_url.startswith("postgres://"):
    DATABASE_URL = raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif raw_url.startswith("postgresql://") and not raw_url.startswith("postgresql+asyncpg://"):
    DATABASE_URL = raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
else:
    DATABASE_URL = raw_url

# Strip problematic neon parameters (asyncpg doesn't support them in the URL)
if "?" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.split("?")[0]

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    connect_args={"ssl": "require"} if "neon.tech" in DATABASE_URL else {}
) if "postgresql" in DATABASE_URL else create_async_engine(DATABASE_URL, echo=False)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    from app.models.models import Base, User
    import sqlalchemy as sa
    
    # 1. Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    # 2. Seed Default User securely
    async with AsyncSessionLocal() as session:
        query = sa.select(User).where(User.id == 1)
        result = await session.execute(query)
        user = result.scalar_one_or_none()
        
        if not user:
            default_user = User(
                id=1,
                username="default_tenant",
                email="admin@hisobot.ai",
                hashed_password="dummy_password_xyz"
            )
            session.add(default_user)
            await session.commit()
