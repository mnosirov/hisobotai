import os
import json
from openai import OpenAI
import google.generativeai as genai
from .models import Product, InventoryLog
from sqlalchemy.orm import Session
from typing import List, Dict
from dotenv import load_dotenv

load_dotenv()

# Config Clients
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def transcribe_audio(audio_path: str) -> str:
    """Uses OpenAI Whisper to transcribe audio (supports Uzbek)."""
    with open(audio_path, "rb") as audio:
        transcript = client.audio.transcriptions.create(
            model="whisper-1", 
            file=audio
        )
        return transcript.text

def extract_products_from_text(text: str) -> List[Dict]:
    """Uses GPT-4o to extract structured product data from text."""
    system_prompt = (
        "Sen hisob-kitob bo'yicha yordamchisan. Berilgan matndan mahsulot nomi, "
        "miqdori va o'lchov birligini ajratib ol. Natijani faqat JSON formatda qaytar. "
        "Matn tili: O'zbek.\n"
        "Format misol: [{\"name\": \"olma\", \"quantity\": 10, \"unit\": \"kg\"}]"
    )
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text}
        ]
    )
    
    content = response.choices[0].message.content
    # Clean up JSON if LLM adds triple backticks
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0].strip()
    return json.loads(content)

def process_invoice_vision(image_path: str) -> List[Dict]:
    """Uses Gemini 1.5 Pro to extract structured data from an invoice image."""
    model = genai.GenerativeModel("gemini-1.5-pro")
    
    prompt = (
        "Mana bu faktura (qog'oz hujjat) rasmini tahlil qil. "
        "Unda qanday mahsulotlar borligini top va miqdori hamda harid narxini ajrat. "
        "Natijani qat'iy ravishda JSON ro'yxatda qaytar. "
        "Format: [{\"name\": \"...\", \"quantity\": ..., \"unit\": \"...\", \"price\": ...}] "
        "Agar aniq bo'lmasa, taxmin qilib yozma. O'zbek tiliga e'tibor ber."
    )
    
    with open(image_path, "rb") as f:
        image_data = f.read()
        
    try:
        response = model.generate_content([prompt, {"mime_type": "image/jpeg", "data": image_data}])
        content = response.text
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].strip()
        return json.loads(content)
    except Exception as e:
        print(f"Vision API xatosi: {e}")
        return []

def chat_with_assistant_logic(db: Session, tenant_id: int, message: str) -> str:
    """Answers user queries by combining DB context with LLM."""
    from .models.models import Sale, Product
    from sqlalchemy import func, cast, Date
    from datetime import date
    
    # 1. Gather context (Simple snapshot)
    today = date.today()
    sales_today = db.query(func.sum(Sale.profit)).filter(
        Sale.tenant_id == tenant_id,
        cast(Sale.created_at, Date) == today
    ).scalar() or 0.0
    
    top_products = db.query(Product).filter(Product.tenant_id == tenant_id).order_by(Product.stock.asc()).limit(5).all()
    low_stock_info = ", ".join([f"{p.name} ({p.stock} {p.unit} qoldi)" for p in top_products if p.stock < 10])
    
    context = f"Biznes egasi (Foydalanuvchi) so'rayapti: '{message}'.\n"
    context += f"Ma'lumotlar bazasi hisoboti:\n"
    context += f"- Bugungi sof foyda: {sales_today} UZS.\n"
    if low_stock_info:
        context += f"- Kam qolgan mahsulotlar (Sklad): {low_stock_info}.\n"
    
    system_prompt = (
        "Sen 'Hisobot AI' aqlli yordamchisan. Berilgan 'Ma'lumotlar bazasi hisoboti' asnosida foydalanuvchiga do'stona, "
        "qisqa va aniq (O'zbek tilida) javob ber. Hech qanday murakkab jadvallar yoki texnik atamalardan foydalanma. "
        "Agar foydalanuvchi qarz yoki faktura haqida umumiy savol bersa va biznes ma'lumoti yetarli bo'lmasa, "
        "ularni kiritishni tavsiya qil. Javob oxiriga motivatsion emoji qo'sh (🚀, 📈, 💪 yoxud shunga o'xshash)."
    )
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": context}
        ],
        temperature=0.7
    )
    
    return response.choices[0].message.content

def analyze_handwritten_sales(image_path: str) -> List[Dict]:
    """Uses Gemini 1.5 Pro to extract structured sales records from handwritten notes."""
    model = genai.GenerativeModel("gemini-1.5-pro")
    
    prompt = (
        "Mana bu qo'lyozma savdo sahifasini tahlil qil. "
        "Har bir qatorni o'qi va mahsulot nomi, miqdori va umumiy narxni ajrat. "
        "Natijani qat'iy ravishda JSON ro'yxatda qaytar. "
        "Format: [{\"name\": \"...\", \"quantity\": ..., \"total_price\": ...}] "
        "O'zbek tilidagi qisqartmalarni tushun (masalan: '2ta non 6000' -> name: 'non', quantity: 2, price: 3000)."
    )
    
    # Load image from path
    with open(image_path, "rb") as f:
        image_data = f.read()
        
    response = model.generate_content([prompt, {"mime_type": "image/jpeg", "data": image_data}])
    
    content = response.text
    # Clean up JSON if LLM adds triple backticks
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0].strip()
    return json.loads(content)
