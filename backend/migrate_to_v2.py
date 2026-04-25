import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

# Re-path for local vs container
current_dir = os.path.dirname(os.path.abspath(__file__))
if os.path.basename(current_dir) == "backend":
    pass
else:
    os.chdir(os.path.join(current_dir, "backend"))

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "sqlite+aiosqlite:///hisobot.db"
elif DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://")

# If using postgresql, standard neon urls without params are best
if "?" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.split("?")[0]

connect_args = {"ssl": "require"} if "neon.tech" in DATABASE_URL else {}
engine = create_async_engine(DATABASE_URL, connect_args=connect_args)

async def migrate():
    print("V2 Ma'lumotlar bazasi migratsiyasi boshlandi...")
    async with engine.begin() as conn:
        try:
            # 1. Barcha eski qarzlarni olish
            result = await conn.execute(text("SELECT id, tenant_id, customer_name, amount, is_paid, created_at FROM debts"))
            debts = result.fetchall()
            print(f"Jami {len(debts)} ta qarz tarixi topildi.")

            for debt in debts:
                debt_id, tenant_id, customer_name, amount, is_paid, created_at = debt
                
                # Check if counterparty already exists
                cp_res = await conn.execute(text(
                    "SELECT id FROM counterparties WHERE tenant_id = :t_id AND name = :name"
                ), {"t_id": tenant_id, "name": customer_name})
                cp_row = cp_res.fetchone()

                if cp_row:
                    cp_id = cp_row[0]
                else:
                    # Create Counterparty
                    initial_balance = amount if is_paid == 0 else 0
                    insert_cp = await conn.execute(text(
                        """INSERT INTO counterparties (tenant_id, name, type, balance, created_at) 
                           VALUES (:t_id, :name, 'customer', :bal, :created) RETURNING id"""
                    ), {
                        "t_id": tenant_id, 
                        "name": customer_name, 
                        "bal": initial_balance, 
                        "created": created_at
                    })
                    if insert_cp.returns_rows:
                        cp_id = insert_cp.scalar()
                    else:
                        # For sqlite without RETURNING in some drivers:
                        cp_res_after = await conn.execute(text(
                            "SELECT id FROM counterparties WHERE tenant_id = :t_id AND name = :name ORDER BY id DESC LIMIT 1"
                        ), {"t_id": tenant_id, "name": customer_name})
                        cp_id = cp_res_after.scalar()

                if not cp_id:
                     print(f"FAILED to create counterparty for {customer_name}")
                     continue

                # Update balance if counterparty already existed and we are adding more debt
                if cp_row and is_paid == 0:
                    await conn.execute(text(
                        "UPDATE counterparties SET balance = balance + :amt WHERE id = :id"
                    ), {"amt": amount, "id": cp_id})

                # Create Transaction record
                tx_type = "debt_paid" if is_paid == 1 else "debt_created"
                await conn.execute(text(
                    """INSERT INTO transactions (tenant_id, counterparty_id, type, amount, description, created_at) 
                       VALUES (:t_id, :c_id, :type, :amt, 'Eski (V1) tizimdan ko''chirilgan qarz', :created)"""
                ), {
                    "t_id": tenant_id,
                    "c_id": cp_id,
                    "type": tx_type,
                    "amt": amount,
                    "created": created_at
                })

            print("Barcha eski qarzlar Counterparty va Transaction jadvaliga muvaffaqiyatli ko'chirildi!")
            
        except Exception as e:
            print(f"Xatolik yuz berdi (jadvallar hali yaratilmagan bo'lishi mumkin): {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
