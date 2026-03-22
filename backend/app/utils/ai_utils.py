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
    """Uses GPT-4o Vision to extract structured data from an invoice image (Placeholder logic)."""
    # Vision API logic here (multi-modal upload)
    # (Simplified for the demo)
    return []

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
