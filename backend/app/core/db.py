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
    from app.core.security import get_password_hash
    import sqlalchemy as sa
    
    # 1. Create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    # 1.5 Auto-migrate missing columns for existing Phase 1 database
    # Define a helper to run safe migrations in individual transactions
    async def safe_migrate(sql):
        # Using connect() followed by begin() ensures a fresh transaction for each step
        async with engine.connect() as conn:
            try:
                async with conn.begin():
                    await conn.execute(sa.text(sql))
            except Exception:
                pass # Already exists or syntax error

    # Users table
    await safe_migrate("ALTER TABLE users ADD COLUMN telegram_chat_id VARCHAR")
    await safe_migrate("ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    await safe_migrate("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0")
    await safe_migrate("ALTER TABLE users ADD COLUMN is_blocked INTEGER DEFAULT 0")
    await safe_migrate("ALTER TABLE users ADD COLUMN subscription_tier VARCHAR DEFAULT 'free'")
    await safe_migrate("ALTER TABLE users ADD COLUMN subscription_start TIMESTAMP")
    await safe_migrate("ALTER TABLE users ADD COLUMN subscription_end TIMESTAMP")
    
    # Products table
    await safe_migrate("ALTER TABLE products ADD COLUMN category VARCHAR DEFAULT 'Umumiy'")
    await safe_migrate("ALTER TABLE products ADD COLUMN tenant_id INTEGER")
    await safe_migrate("ALTER TABLE products ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    await safe_migrate("ALTER TABLE products ADD COLUMN image_url VARCHAR")
    await safe_migrate("ALTER TABLE products ADD COLUMN color VARCHAR")
    await safe_migrate("ALTER TABLE products ADD COLUMN condition VARCHAR")
    
    # Sales table
    await safe_migrate("ALTER TABLE sales ADD COLUMN tenant_id INTEGER")
    await safe_migrate("ALTER TABLE sales ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    await safe_migrate("ALTER TABLE sales ADD COLUMN is_deleted INTEGER DEFAULT 0")
    await safe_migrate("ALTER TABLE sales ADD COLUMN deleted_at TIMESTAMP")
    
    # Debts table
    await safe_migrate("ALTER TABLE debts ADD COLUMN tenant_id INTEGER")
    await safe_migrate("ALTER TABLE debts ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    
    # Inventory Logs table
    await safe_migrate("ALTER TABLE inventory_logs ADD COLUMN tenant_id INTEGER")
    await safe_migrate("ALTER TABLE inventory_logs ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    
    # Subscriptions table
    async with engine.connect() as conn:
        try:
            async with conn.begin():
                await conn.execute(sa.text("""
                    CREATE TABLE IF NOT EXISTS subscriptions (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        tier VARCHAR NOT NULL,
                        start_date TIMESTAMP NOT NULL,
                        end_date TIMESTAMP NOT NULL,
                        activated_by INTEGER,
                        price FLOAT DEFAULT 0.0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """))
        except Exception:
            # Fallback for SQLite
            await safe_migrate("""
                CREATE TABLE IF NOT EXISTS subscriptions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    tier VARCHAR NOT NULL,
                    start_date DATETIME NOT NULL,
                    end_date DATETIME NOT NULL,
                    activated_by INTEGER,
                    price FLOAT DEFAULT 0.0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            """)

    await safe_migrate("ALTER TABLE subscriptions ADD COLUMN price FLOAT DEFAULT 0.0")
    
    # Update existing prices based on tier if price is 0
    async with engine.connect() as conn:
        try:
            async with conn.begin():
                await conn.execute(sa.text("UPDATE subscriptions SET price = 79000 WHERE tier = 'standard' AND (price IS NULL OR price = 0);"))
                await conn.execute(sa.text("UPDATE subscriptions SET price = 149000 WHERE tier = 'premium' AND (price IS NULL OR price = 0);"))
        except Exception:
            pass
        
    # 2. Seed Default User securely
    async with AsyncSessionLocal() as session:
        # Try to find admin by email first
        query = sa.select(User).where(User.email == "admin@hisobot.ai")
        result = await session.execute(query)
        user = result.scalar_one_or_none()
        
        if not user:
            # Create if doesn't exist
            default_user = User(
                username="admin",
                email="admin@hisobot.ai",
                hashed_password=get_password_hash("admin123"),
                is_admin=1
            )
            session.add(default_user)
            await session.commit()
            print("Default admin created.")
        else:
            # Force update password and admin status for existing user
            user.hashed_password = get_password_hash("admin123")
            user.is_admin = 1
            await session.commit()
            print("Default admin credentials reset.")
