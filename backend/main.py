from fastapi import FastAPI, Depends, File, UploadFile, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict
import os
import httpx
from contextlib import asynccontextmanager

from app.core.db import get_db, init_db
from app.core.security import ALGORITHM, SECRET_KEY
from app.services.inventory_service import InventoryService
from app.services.sales_service import SalesService
from app.services.bi_service import BIService
from app.services.ai_service import AIService
from app.services.auth_service import AuthService
from app.schemas import schemas
from app.models.models import User
from fastapi.security import OAuth2PasswordBearer
import jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Tokenni tasdiqlab bo'lmadi.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.InvalidTokenError:
        raise credentials_exception
        
    from sqlalchemy import select
    query = select(User).where(User.id == int(user_id))
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize the database and handle table creations automatically
    try:
        await init_db()
        print("Database initialized successfully.")
    except Exception as e:
        print(f"Error during database initialization: {e}")
        
    # Auto-set Telegram Webhook on startup to make it foolproof
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if bot_token and "dummy" not in bot_token:
        try:
            # We use the current production domain name
            webhook_url = "https://hisobotai-production.up.railway.app/api/telegram/webhook"
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    f"https://api.telegram.org/bot{bot_token}/setWebhook",
                    json={"url": webhook_url}
                )
                print(f"Telegram Webhook Status: {res.json()}")
        except Exception as e:
            print(f"Failed to auto-set Telegram Webhook: {e}")
            
    yield

app = FastAPI(title="Hisobot AI — Pro API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://hisobotai.vercel.app",
        "https://hisobot-ai.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "Ichki xatolik yuz berdi. Admin bilan bog'laning.", "error": str(exc)}
    )

@app.get("/")
def read_root():
    return {"status": "ok", "version": "2.1 Pro — Debug Active", "app": "Hisobot AI"}

@app.get("/api/debug/file")
async def debug_file():
    path = "app/services/ai_service.py"
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return {"path": path, "content": f.read()[-500:]}
    return {"error": "File not found"}

@app.get("/api/telegram/setup")
async def setup_webhook():
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not bot_token or "dummy" in bot_token:
        return {"status": "error", "message": "TELEGRAM_BOT_TOKEN kiritilmagan yoki xato."}
    
    webhook_url = "https://hisobotai-production.up.railway.app/api/telegram/webhook"
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"https://api.telegram.org/bot{bot_token}/setWebhook",
                json={"url": webhook_url}
            )
            return {
                "status": "Telegram API javobi",
                "response": res.json(),
                "webhook_url": webhook_url
            }
    except Exception as e:
        return {"status": "error", "error_details": str(e)}

# --- AUTH API ---
@app.post("/api/auth/register", response_model=schemas.UserResponse)
async def register(user_data: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    auth_service = AuthService(db)
    return await auth_service.register_user(user_data)

@app.post("/api/auth/login", response_model=schemas.Token)
async def login(login_data: schemas.UserLogin, db: AsyncSession = Depends(get_db)):
    auth_service = AuthService(db)
    return await auth_service.authenticate_user(login_data)

@app.get("/api/auth/me", response_model=schemas.UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# --- INVENTORY API ---
@app.get("/api/inventory", response_model=List[schemas.ProductResponse])
async def get_inventory(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        service = InventoryService(db, current_user.id)
        return await service.get_all_products()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/inventory", response_model=schemas.ProductResponse)
async def add_product_manual(product: schemas.ProductCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        service = InventoryService(db, current_user.id)
        product_data = {
            "name": product.name,
            "quantity": product.stock,
            "unit": product.unit,
            "price": product.last_purchase_price,
            "sell_price": product.sell_price
        }
        res = await service.add_or_update_product(product_data, source="Qo'lda (Manual)")
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/inventory/invoice", response_model=Dict)
async def upload_invoice(image: UploadFile = File(...), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    temp_path = f"/tmp/{image.filename}"
    with open(temp_path, "wb") as f:
        f.write(await image.read())
        
    try:
        service = InventoryService(db, current_user.id)
        results = await service.process_invoice_upload(temp_path)
        return {"status": "success", "processed_count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- SALES API ---
@app.get("/api/sales/summary", response_model=Dict)
async def get_sales_summary(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        service = SalesService(db, current_user.id)
        return await service.get_sales_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sales/ledger", response_model=Dict)
async def upload_handwritten_ledger(image: UploadFile = File(...), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    temp_path = f"/tmp/{image.filename}"
    with open(temp_path, "wb") as f:
        f.write(await image.read())
        
    try:
        service = SalesService(db, current_user.id)
        return await service.process_handwritten_sales(temp_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- BI API ---
@app.get("/api/bi/insights", response_model=List[Dict])
async def get_insights(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        service = BIService(db, current_user.id)
        return await service.get_weekly_insights()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- AI CHAT API ---
@app.post("/api/chat", response_model=schemas.ChatResponse)
async def chat_with_assistant(chat: schemas.ChatMessage, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        sales_service = SalesService(db, current_user.id)
        inv_service = InventoryService(db, current_user.id)
        
        summary = await sales_service.get_sales_summary()
        products = await inv_service.get_all_products()
        
        low_stock = [f"{p.name} ({p.stock} qoldi)" for p in products if p.stock < 10]
        context = f"Bugungi foyda: {summary.get('today_profit', 0)} UZS.\n"
        if low_stock:
            context += f"Tugab qolayotgan mahsulotlar: {', '.join(low_stock)}.\n"
            
        reply = await AIService.chat_with_assistant(context, chat.message)
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/telegram/webhook")
async def telegram_webhook_get():
    return {"status": "ok", "message": "Bot is alive. Use POST for webhook."}

@app.post("/api/telegram/webhook")
async def telegram_webhook(update: Dict):
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not bot_token:
        return {"status": "error", "message": "No bot token"}

    message = update.get("message", {})
    chat_id = message.get("chat", {}).get("id")
    text = message.get("text", "")
    
    if chat_id and text:
        from app.core.db import AsyncSessionLocal
        from sqlalchemy import select
        
        async with AsyncSessionLocal() as db:
            # 1. Handle Account Linking
            if text.startswith("/start "):
                email = text.split("/start ")[1].strip()
                query = select(User).where(User.email == email)
                result = await db.execute(query)
                user = result.scalar_one_or_none()
                
                if user:
                    user.telegram_chat_id = str(chat_id)
                    await db.commit()
                    reply = f"Muvaffaqiyatli! {user.username} hisobingiz botga biriktirildi. Endi savol so'rashingiz mumkin."
                else:
                    reply = "Kechirasiz, bunday email bilan ro'yxatdan o'tilmagan. Avval veb-sahifada ro'yxatdan o'ting."
            
            # 2. Regular AI Chat (User-Specific)
            else:
                user_query = select(User).where(User.telegram_chat_id == str(chat_id))
                user_res = await db.execute(user_query)
                user = user_res.scalar_one_or_none()
                
                if not user:
                    reply = "Iltimos, avval hisobingizni biriktiring: /start <email>"
                else:
                    try:
                        sales_service = SalesService(db, user.id)
                        inv_service = InventoryService(db, user.id)
                        summary = await sales_service.get_sales_summary()
                        products = await inv_service.get_all_products()
                        low_stock = [f"{p.name} ({p.stock} qoldi)" for p in products if p.stock < 10]
                        
                        context = f"Foydalanuvchi: {user.username}\nFoyda: {summary.get('today_profit', 0)} UZS.\nKam: {', '.join(low_stock[:5])}"
                        reply = await AIService.chat_with_assistant(context, text)
                    except Exception as e:
                        print(f"Chat processing error: {e}")
                        reply = "Xabar tahlilida xatolik yuz berdi. Birozdan so'ng urinib ko'ring."

            # Send Telegram Message
            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            async with httpx.AsyncClient() as client:
                await client.post(url, json={"chat_id": chat_id, "text": reply})
            
    return {"status": "ok"}
