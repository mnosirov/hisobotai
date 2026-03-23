from fastapi import FastAPI, Depends, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict
from dotenv import load_dotenv

load_dotenv()

from .core.db import get_db, init_db
from .services.inventory_service import InventoryService
from .services.sales_service import SalesService
from .services.bi_service import BIService
from .schemas import schemas

app = FastAPI(title="Hisobot AI — Daftardan Smartfonga API")

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_db_client():
    init_db()

@app.get("/")
def read_root():
    return {"status": "ok", "app": "Hisobot AI"}

# --- Dashboards & Fetching Data ---
@app.get("/api/inventory", response_model=List[schemas.Product])
def get_inventory(tenant_id: int = 1, db: Session = Depends(get_db)):
    """Fetch all products for the tenant."""
    from .models.models import Product
    products = db.query(Product).filter(Product.tenant_id == tenant_id).all()
    return products

@app.get("/api/sales/summary", response_model=Dict)
def get_sales_summary(tenant_id: int = 1, db: Session = Depends(get_db)):
    """Fetch total profit and today's profit."""
    from .models.models import Sale
    from datetime import datetime, date
    import sqlalchemy as sa
    
    # Simple summary logic
    today = date.today()
    sales_today = db.query(sa.func.sum(Sale.profit)).filter(
        Sale.tenant_id == tenant_id,
        sa.func.date(Sale.created_at) == today
    ).scalar() or 0.0
    
    total_sales = db.query(sa.func.sum(Sale.profit)).filter(
        Sale.tenant_id == tenant_id
    ).scalar() or 0.0
    
    return {
        "today_profit": sales_today,
        "total_profit": total_sales
    }

# --- Module 2: Inventory Actions ---
@app.post("/api/inventory/voice", response_model=Dict)
async def upload_voice(audio: UploadFile = File(...), tenant_id: int = 1, db: Session = Depends(get_db)):
    """Module 2: Voice-to-Inventory."""
    # (Helper to save file temporarily)
    temp_path = f"/tmp/{audio.filename}"
    with open(temp_path, "wb") as f:
        f.write(await audio.read())
    
    service = InventoryService(db, tenant_id)
    results = service.handle_voice_inventory(temp_path)
    return {"status": "success", "processed_count": len(results)}

@app.post("/api/inventory/invoice", response_model=Dict)
async def upload_invoice(image: UploadFile = File(...), tenant_id: int = 1, db: Session = Depends(get_db)):
    """Module 2: Invoice-OCR."""
    temp_path = f"/tmp/{image.filename}"
    with open(temp_path, "wb") as f:
        f.write(await image.read())
        
    service = InventoryService(db, tenant_id)
    results = service.handle_invoice_ocr(temp_path)
    return {"status": "success", "processed_count": len(results)}

# Module 3: Daily Sales (Daily Ledger)
@app.post("/api/sales/ledger", response_model=Dict)
async def upload_handwritten_ledger(image: UploadFile = File(...), tenant_id: int = 1, db: Session = Depends(get_db)):
    """Module 3: Daily Sales OCR (Handwriting)."""
    temp_path = f"/tmp/{image.filename}"
    with open(temp_path, "wb") as f:
        f.write(await image.read())
        
    service = SalesService(db, tenant_id)
    res = service.process_handwritten_sales(temp_path)
    return res

# Module 5: BI & Reporting
@app.get("/api/bi/insights", response_model=List[Dict])
def get_insights(tenant_id: int = 1, db: Session = Depends(get_db)):
    """Module 5: Weekly Insights & Predictions."""
    service = BIService(db, tenant_id)
    return service.get_weekly_insights()

# --- AI Chat Assistant ---
@app.post("/api/chat", response_model=schemas.ChatResponse)
def chat_with_assistant(chat: schemas.ChatMessage, tenant_id: int = 1, db: Session = Depends(get_db)):
    """Chat intelligently with the AI Assistant using Database Context."""
    from .utils.ai_utils import chat_with_assistant_logic
    reply = chat_with_assistant_logic(db, tenant_id, chat.message)
    return {"reply": reply}

# --- Telegram Bot Webhook ---
@app.post("/api/telegram/webhook")
async def telegram_webhook(update: Dict):
    """Handles incoming signals directly from Telegram Bot."""
    import os
    import httpx
    
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not bot_token:
        print("Webhook: TELEGRAM_BOT_TOKEN yo'q")
        return {"status": "error"}

    message = update.get("message", {})
    chat_id = message.get("chat", {}).get("id")
    text = message.get("text", "")
    
    if chat_id and text:
        # Example: Simple echo or AI integration for external messages
        # Ideally, we map chat_id to tenant_id using the DB.
        # For this production ready version, let's assume tenant 1.
        db = next(get_db())
        try:
            from .utils.ai_utils import chat_with_assistant_logic
            reply = chat_with_assistant_logic(db, 1, text)
            
            # Send reply back
            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            async with httpx.AsyncClient() as client:
                await client.post(url, json={"chat_id": chat_id, "text": reply})
        finally:
            db.close()
            
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
