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

# Module 2: Inventory Actions
@app.post("/inventory/voice", response_model=Dict)
async def upload_voice(audio: UploadFile = File(...), tenant_id: int = 1, db: Session = Depends(get_db)):
    """Module 2: Voice-to-Inventory."""
    # (Helper to save file temporarily)
    temp_path = f"/tmp/{audio.filename}"
    with open(temp_path, "wb") as f:
        f.write(await audio.read())
    
    service = InventoryService(db, tenant_id)
    results = service.handle_voice_inventory(temp_path)
    return {"status": "success", "processed_count": len(results)}

@app.post("/inventory/invoice", response_model=Dict)
async def upload_invoice(image: UploadFile = File(...), tenant_id: int = 1, db: Session = Depends(get_db)):
    """Module 2: Invoice-OCR."""
    temp_path = f"/tmp/{image.filename}"
    with open(temp_path, "wb") as f:
        f.write(await image.read())
        
    service = InventoryService(db, tenant_id)
    results = service.handle_invoice_ocr(temp_path)
    return {"status": "success", "processed_count": len(results)}

# Module 3: Daily Sales (Daily Ledger)
@app.post("/sales/ledger", response_model=Dict)
async def upload_handwritten_ledger(image: UploadFile = File(...), tenant_id: int = 1, db: Session = Depends(get_db)):
    """Module 3: Daily Sales OCR (Handwriting)."""
    temp_path = f"/tmp/{image.filename}"
    with open(temp_path, "wb") as f:
        f.write(await image.read())
        
    service = SalesService(db, tenant_id)
    res = service.process_handwritten_sales(temp_path)
    return res

# Module 5: BI & Reporting
@app.get("/bi/insights", response_model=List[Dict])
def get_insights(tenant_id: int = 1, db: Session = Depends(get_db)):
    """Module 5: Weekly Insights & Predictions."""
    service = BIService(db, tenant_id)
    return service.get_weekly_insights()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
