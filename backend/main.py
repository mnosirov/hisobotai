from fastapi import FastAPI, Depends, File, UploadFile, HTTPException, Request, status, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Optional
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
from app.services.subscription_service import SubscriptionService
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
    
    # Avtomatik obuna muddati tekshiruvi
    await SubscriptionService.check_and_expire(user, db)
    
    return user

async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Faqat admin uchun"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sizda admin huquqi yo'q."
        )
    return current_user

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

# Ensure static directory exists before mounting
os.makedirs("static/uploads/products", exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please contact admin.", "error": str(exc)},
        headers={
            "Access-Control-Allow-Origin": "https://hisobotai.vercel.app",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*"
        }
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
async def add_product_manual(
    name: str = Form(...),
    category: str = Form("Umumiy"),
    unit: str = Form("dona"),
    stock: float = Form(0.0),
    last_purchase_price: float = Form(0.0),
    sell_price: float = Form(0.0),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    try:
        service = InventoryService(db, current_user.id)
        
        image_url = None
        if image:
            content = await image.read()
            image_url = service.process_product_image(content, image.filename)

        product_data = {
            "name": name,
            "category": category,
            "quantity": stock,
            "unit": unit,
            "price": last_purchase_price,
            "sell_price": sell_price
        }
        res = await service.add_or_update_product(product_data, source="Qo'lda (Manual)", image_url=image_url)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/inventory/analyze", response_model=List[Dict])
async def analyze_invoice(image: UploadFile = File(...), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    temp_path = f"/tmp/{image.filename}"
    with open(temp_path, "wb") as f:
        f.write(await image.read())
    try:
        service = InventoryService(db, current_user.id)
        return await service.analyze_invoice_upload(temp_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/inventory/confirm", response_model=Dict)
async def confirm_invoice(items: List[Dict], current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        service = InventoryService(db, current_user.id)
        results = await service.commit_invoice_upload(items)
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

@app.get("/api/sales/history", response_model=List[schemas.SaleResponse])
async def get_sales_history(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        service = SalesService(db, current_user.id)
        return await service.get_sales_history()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sales/analyze", response_model=List[Dict])
async def analyze_handwritten_ledger(image: UploadFile = File(...), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    temp_path = f"/tmp/{image.filename}"
    with open(temp_path, "wb") as f:
        f.write(await image.read())
    try:
        service = SalesService(db, current_user.id)
        return await service.analyze_handwritten_sales(temp_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sales/confirm", response_model=Dict)
async def confirm_sales(items: List[Dict], current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        service = SalesService(db, current_user.id)
        return await service.commit_sales(items)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sales/manual", response_model=Dict)
async def create_manual_sale(sale: schemas.SaleCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        service = SalesService(db, current_user.id)
        # SaleCreate.items is List[SaleItem], commit_sales expects List[Dict]
        items_dict = [item.dict() for item in sale.items]
        return await service.commit_sales(items_dict)
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
        todays_sales = await sales_service.get_todays_sales()
        recent_history = await sales_service.get_recent_sales_full(limit=10)
        
        low_stock = [f"{p.name} ({p.stock} qoldi)" for p in products if p.stock < 10]
        
        history_text = "\n".join(recent_history)
        context = f"Foydalanuvchi: {current_user.username}\n"
        context += f"Bugungi jami foyda: {int(summary.get('today_profit', 0))} UZS.\n"
        context += f"Yaqinda sotilgan mahsulotlar:\n{history_text}\n"
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
                        recent_history = await sales_service.get_recent_sales_full(limit=10)
                        
                        low_stock = [f"{p.name} ({p.stock} qoldi)" for p in products if p.stock < 10]
                        
                        history_text = "\n".join(recent_history)
                        context = f"Foydalanuvchi: {user.username}\n"
                        context += f"Bugungi jami foyda: {int(summary.get('today_profit', 0))} UZS.\n"
                        context += f"Yaqinda sotilgan mahsulotlar:\n{history_text}\n"
                        context += f"Kam qolganlar: {', '.join(low_stock[:5])}"
                        
                        reply = await AIService.chat_with_assistant(context, text)
                    except Exception as e:
                        print(f"Chat processing error: {e}")
                        reply = "Xabar tahlilida xatolik yuz berdi. Birozdan so'ng urinib ko'ring."

            # Send Telegram Message
            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            async with httpx.AsyncClient() as client:
                await client.post(url, json={"chat_id": chat_id, "text": reply})
            
    return {"status": "ok"}

# --- ADMIN API ---
@app.get("/api/admin/users", response_model=List[schemas.UserAdminResponse])
async def admin_get_users(admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    service = SubscriptionService(db)
    return await service.get_all_users()

@app.post("/api/admin/subscription", response_model=Dict)
async def admin_grant_subscription(data: schemas.SubscriptionGrant, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    service = SubscriptionService(db)
    return await service.grant_subscription(data, admin.id)

@app.delete("/api/admin/subscription/{user_id}", response_model=Dict)
async def admin_revoke_subscription(user_id: int, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    service = SubscriptionService(db)
    return await service.revoke_subscription(user_id)

@app.get("/api/admin/subscriptions", response_model=List[schemas.SubscriptionResponse])
async def admin_get_subscriptions(admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    service = SubscriptionService(db)
    return await service.get_subscription_history()
