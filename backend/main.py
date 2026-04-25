from fastapi import FastAPI, Depends, File, UploadFile, HTTPException, Request, status, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Optional, Any
import os
import httpx
from contextlib import asynccontextmanager

from app.core.db import get_db, init_db
from app.core.security import ALGORITHM, SECRET_KEY
from app.services.inventory_service import InventoryService
from app.services.sales_service import SalesService
import cloudinary
import cloudinary.uploader
from cloudinary.utils import cloudinary_url
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Cloudinary configuration
cloudinary.config( 
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"), 
    api_key = os.getenv("CLOUDINARY_API_KEY"), 
    api_secret = os.getenv("CLOUDINARY_API_SECRET"),
    secure = True
)
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
    
    # Avtomatik obuna muddati tekshiruvi (Admin bo'lmasa)
    if user.is_admin != 1:
        await SubscriptionService.check_and_expire(user, db)
    
    if user.is_blocked == 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hisobingiz bloklangan. Iltimos, admin bilan bog'laning."
        )
        
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
            webhook_url = "https://hisobotai.onrender.com/api/telegram/webhook"
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
        "http://localhost:5555",
        "https://hisobotai.vercel.app",
        "https://hisobot-ai.vercel.app",
        "https://hisobotai-git-main-mnosirovs-projects.vercel.app"
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
    err_msg = traceback.format_exc()
    print(f"GLOBAL ERROR: {err_msg}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error.", "error": str(exc), "traceback": err_msg},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*"
        }
    )

@app.get("/")
def read_root():
    return {"status": "ok", "version": "2.1 Pro — Debug Active", "app": "Hisobot AI"}

@app.get("/api/admin/debug/storage")
async def debug_storage_config(admin: User = Depends(get_admin_user)):
    """Cloudinary sozlamalarini tekshirish (Faqat Admin)"""
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    api_key = os.getenv("CLOUDINARY_API_KEY", "")
    api_secret = os.getenv("CLOUDINARY_API_SECRET", "")
    
    def mask(s): return f"{s[:1]}***{s[-1:]}" if len(s) > 2 else "***"
    
    return {
        "is_configured": bool(cloud_name and api_key and api_secret),
        "cloud_name": mask(cloud_name),
        "api_key": mask(api_key),
        "has_secret": len(api_secret) > 0,
        "env_check": {
            "CLOUDINARY_CLOUD_NAME": "SET" if "CLOUDINARY_CLOUD_NAME" in os.environ else "MISSING",
            "CLOUDINARY_API_KEY": "SET" if "CLOUDINARY_API_KEY" in os.environ else "MISSING"
        }
    }

@app.get("/api/admin/debug/env_keys")
async def debug_env_keys():
    """Serverdagi barcha o'zgaruvchilar NOMINI tekshirish (Vaqtinchalik ochiq)"""
    import os
    keys = list(os.environ.keys())
    cloud_keys = [k for k in keys if "CLOUDINARY" in k]
    return {
        "all_keys_count": len(keys),
        "cloudinary_keys_found": cloud_keys,
        "is_database_url_present": "DATABASE_URL" in keys
    }

@app.get("/api/admin/debug/test_upload")
async def debug_cloudinary_test():
    """Real vaqtda Cloudinary yuklashni test qilish (Vaqtinchalik ochiq)"""
    import cloudinary.uploader
    from io import BytesIO
    from PIL import Image
    import os
    
    try:
        img = Image.new('RGB', (1, 1), color = 'red')
        buffer = BytesIO()
        img.save(buffer, format="JPEG")
        buffer.seek(0)
        
        res = cloudinary.uploader.upload(
            buffer,
            folder="debug_test",
            public_id=f"test_pixel_{os.urandom(4).hex()}",
            cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
            api_key=os.getenv("CLOUDINARY_API_KEY"),
            api_secret=os.getenv("CLOUDINARY_API_SECRET")
        )
        return {"status": "success", "url": res.get("secure_url")}
    except Exception as e:
        return {"status": "error", "message": str(e), "keys_found": [k for k in os.environ.keys() if "CLOUDINARY" in k]}

@app.get("/api/telegram/setup")
async def setup_webhook():
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not bot_token or "dummy" in bot_token:
        return {"status": "error", "message": "TELEGRAM_BOT_TOKEN kiritilmagan yoki xato."}
    
    webhook_url = "https://hisobotai.onrender.com/api/telegram/webhook"
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
    color: Optional[str] = Form(None),
    condition: Optional[str] = Form(None),
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
            "sell_price": sell_price,
            "color": color,
            "condition": condition
        }
        res = await service.add_or_update_product(product_data, source="Qo'lda (Manual)", image_url=image_url)
        return res
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        print(f"Error in add_product_manual: {err_msg}")
        return JSONResponse(status_code=500, content={"detail": str(e), "traceback": err_msg})

@app.put("/api/inventory/{product_id}", response_model=schemas.ProductResponse)
async def update_product(
    product_id: int,
    name: str = Form(None),
    category: str = Form(None),
    unit: str = Form(None),
    stock: float = Form(None),
    last_purchase_price: float = Form(None),
    sell_price: float = Form(None),
    color: Optional[str] = Form(None),
    condition: Optional[str] = Form(None),
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
        
        data = {}
        if name is not None: data["name"] = name
        if category is not None: data["category"] = category
        if unit is not None: data["unit"] = unit
        if stock is not None: data["stock"] = stock
        if last_purchase_price is not None: data["last_purchase_price"] = last_purchase_price
        if sell_price is not None: data["sell_price"] = sell_price
        if color is not None: data["color"] = color
        if condition is not None: data["condition"] = condition

        return await service.update_product(product_id, data, image_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/inventory/{product_id}")
async def delete_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        service = InventoryService(db, current_user.id)
        await service.delete_product(product_id)
        return {"status": "success"}
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

@app.post("/api/inventory/voice-analyze", response_model=List[Dict])
async def analyze_voice_inventory(audio: UploadFile = File(...), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    temp_path = f"/tmp/{audio.filename}"
    with open(temp_path, "wb") as f:
        f.write(await audio.read())
    try:
        service = InventoryService(db, current_user.id)
        return await service.analyze_voice_upload(temp_path)
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
async def get_sales_history(
    page: int = 1,
    size: int = 50,
    current_user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    try:
        service = SalesService(db, current_user.id)
        return await service.get_sales_history(page=page, size=size)
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

@app.post("/api/sales/voice-analyze", response_model=List[Dict])
async def analyze_voice_sales_endpoint(audio: UploadFile = File(...), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    temp_path = f"/tmp/{audio.filename}"
    with open(temp_path, "wb") as f:
        f.write(await audio.read())
    try:
        service = SalesService(db, current_user.id)
        return await service.analyze_voice_sales(temp_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sales/confirm", response_model=Dict)
async def confirm_sales(items: List[Dict], current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        service = SalesService(db, current_user.id)
        return await service.commit_sales(items)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/sales/{sale_id}", response_model=Dict)
async def delete_sale(sale_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        service = SalesService(db, current_user.id)
        return await service.delete_sale(sale_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sales/manual", response_model=Dict)
async def create_manual_sale(sale: schemas.SaleCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        service = SalesService(db, current_user.id)
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
        bi_service = BIService(db, current_user.id)
        
        # Summary and recent history are usually faster
        summary = await sales_service.get_sales_summary()
        recent_history = await sales_service.get_recent_sales_full(limit=5) # Reduced limit
        biz_health = await bi_service.get_business_summary()
        
        history_text = "\n".join(recent_history)
        context = f"Foydalanuvchi: {current_user.username}\n"
        context += f"Bugungi jami foyda: {int(summary.get('today_profit', 0))} UZS.\n"
        context += f"Yaqinda sotilgan mahsulotlar:\n{history_text}\n"
        
        low_stock = summary.get("low_stock_items", [])
        if low_stock:
            low_text = ", ".join([f"{i['name']} ({i['stock']} {i['unit']})" for i in low_stock])
            context += f"Tugab qolayotgan mahsulotlar: {low_text}.\n"
        
        context += f"Ombordagi mahsulot turlari: {biz_health['total_product_types']} xil.\n"
        context += f"Ombordagi jami mollar qiymati: {biz_health['total_stock_value']} UZS.\n"
        context += f"Eng ko'p sotilayotgan mahsulotlar: {', '.join(biz_health['top_selling_products'])}.\n"
            
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

@app.get("/api/admin/stats", response_model=schemas.SystemStats)
async def admin_get_stats(admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    service = SubscriptionService(db)
    return await service.get_system_stats()

@app.patch("/api/admin/users/{user_id}/block", response_model=Dict[str, Any])
async def admin_toggle_block(user_id: int, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    
    user.is_blocked = 1 if user.is_blocked == 0 else 0
    await db.commit()
    status_msg = "bloklandi" if user.is_blocked == 1 else "blokdan chiqarildi"
    return {"status": "success", "message": f"{user.username} {status_msg}"}

@app.delete("/api/admin/users/{user_id}", response_model=Dict[str, Any])
async def admin_delete_user(user_id: int, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    
    await db.delete(user)
    await db.commit()
    return {"status": "success", "message": f"Foydalanuvchi {user.username} va uning barcha ma'lumotlari o'chirildi"}

@app.post("/api/admin/users/{user_id}/impersonate", response_model=schemas.Token)
async def admin_impersonate_user(user_id: int, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    
    from app.core.security import create_access_token
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }
