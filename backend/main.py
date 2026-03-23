from fastapi import FastAPI, Depends, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict
import os
import httpx
from contextlib import asynccontextmanager

from app.core.db import get_db, init_db
from app.services.inventory_service import InventoryService
from app.services.sales_service import SalesService
from app.services.bi_service import BIService
from app.services.ai_service import AIService
from app.schemas import schemas

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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    return {"detail": "Ichki xatolik yuz berdi. Admin bilan bog'laning."}, 500

@app.get("/")
def read_root():
    return {"status": "ok", "version": "2.1 Pro — Webhook Update", "app": "Hisobot AI"}

# --- INVENTORY API ---
@app.get("/api/inventory", response_model=List[schemas.ProductResponse])
async def get_inventory(tenant_id: int = 1, db: AsyncSession = Depends(get_db)):
    try:
        service = InventoryService(db, tenant_id)
        return await service.get_all_products()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/inventory", response_model=schemas.ProductResponse)
async def add_product_manual(product: schemas.ProductCreate, tenant_id: int = 1, db: AsyncSession = Depends(get_db)):
    try:
        service = InventoryService(db, tenant_id)
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
async def upload_invoice(image: UploadFile = File(...), tenant_id: int = 1, db: AsyncSession = Depends(get_db)):
    temp_path = f"/tmp/{image.filename}"
    with open(temp_path, "wb") as f:
        f.write(await image.read())
        
    try:
        service = InventoryService(db, tenant_id)
        results = await service.process_invoice_upload(temp_path)
        return {"status": "success", "processed_count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- SALES API ---
@app.get("/api/sales/summary", response_model=Dict)
async def get_sales_summary(tenant_id: int = 1, db: AsyncSession = Depends(get_db)):
    try:
        service = SalesService(db, tenant_id)
        return await service.get_sales_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sales/ledger", response_model=Dict)
async def upload_handwritten_ledger(image: UploadFile = File(...), tenant_id: int = 1, db: AsyncSession = Depends(get_db)):
    temp_path = f"/tmp/{image.filename}"
    with open(temp_path, "wb") as f:
        f.write(await image.read())
        
    try:
        service = SalesService(db, tenant_id)
        return await service.process_handwritten_sales(temp_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- BI API ---
@app.get("/api/bi/insights", response_model=List[Dict])
async def get_insights(tenant_id: int = 1, db: AsyncSession = Depends(get_db)):
    try:
        service = BIService(db, tenant_id)
        return await service.get_weekly_insights()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- AI CHAT API ---
@app.post("/api/chat", response_model=schemas.ChatResponse)
async def chat_with_assistant(chat: schemas.ChatMessage, tenant_id: int = 1, db: AsyncSession = Depends(get_db)):
    try:
        sales_service = SalesService(db, tenant_id)
        inv_service = InventoryService(db, tenant_id)
        
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

# --- TELEGRAM WEBHOOK ---
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

@app.post("/api/telegram/webhook")
async def telegram_webhook(update: Dict):
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not bot_token:
        return {"status": "error", "message": "No bot token"}

    message = update.get("message", {})
    chat_id = message.get("chat", {}).get("id")
    text = message.get("text", "")
    
    if chat_id and text:
        # Example echo fallback, could connect to AI service dynamically
        try:
            from app.core.db import AsyncSessionLocal
            async with AsyncSessionLocal() as db:
                sales_service = SalesService(db, 1)
                inv_service = InventoryService(db, 1)
                summary = await sales_service.get_sales_summary()
                products = await inv_service.get_all_products()
                low_stock = [f"{p.name} ({p.stock} qoldi)" for p in products if p.stock < 10]
                
                context = f"Foyda: {summary.get('today_profit', 0)} UZS.\nKam: {', '.join(low_stock)}"
                reply = await AIService.chat_with_assistant(context, text)

                url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
                async with httpx.AsyncClient() as client:
                    await client.post(url, json={"chat_id": chat_id, "text": reply})
        except Exception as e:
            print(f"Webhook processing error: {e}")
            
    return {"status": "ok"}
