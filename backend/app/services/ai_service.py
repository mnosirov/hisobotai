import os
import json
import asyncio
from typing import List, Dict
from openai import AsyncOpenAI
import google.generativeai as genai
from dotenv import load_dotenv
import re
import PIL.Image

load_dotenv()

# Async OpenAI Client
openai_key = os.getenv("OPENAI_API_KEY", "dummy_key_to_prevent_crash")
client = AsyncOpenAI(api_key=openai_key)

# Gemini configure
gemini_key = os.getenv("GEMINI_API_KEY", "dummy_key")
if gemini_key != "dummy_key":
    genai.configure(api_key=gemini_key)

class AIService:
    _cached_model_name = None

    @classmethod
    async def _get_best_model(cls) -> str:
        """Dynamically finds the best available model for the current API key."""
        if cls._cached_model_name:
            return cls._cached_model_name
        
        try:
            # We wrap in to_thread because list_models is synchronous
            models = await asyncio.to_thread(genai.list_models)
            available_models = [m.name for m in models if "generateContent" in m.supported_generation_methods]
            
            # Priority list for a smooth experience
            priorities = [
                "models/gemini-1.5-flash",
                "models/gemini-1.5-flash-latest",
                "models/gemini-2.0-flash",
                "models/gemini-1.5-pro",
                "models/gemini-pro"
            ]
            
            for p in priorities:
                if p in available_models:
                    cls._cached_model_name = p
                    print(f"Auto-selected model: {p}")
                    return p
            
            # Fallback to the first available if none of our priorities match
            if available_models:
                cls._cached_model_name = available_models[0]
                return available_models[0]
                
            return "gemini-1.5-flash" # Absolute fallback
        except Exception as e:
            print(f"Model discovery error: {e}")
            return "gemini-1.5-flash"

    @classmethod
    async def extract_invoice_data(cls, image_path: str) -> List[Dict]:
        """Uses the best available Gemini model to extract structured data from an invoice image."""
        model_name = await cls._get_best_model()
        model = genai.GenerativeModel(model_name)
        
        prompt = (
            "Mana bu faktura (qog'oz hujjat) rasmini tahlil qil. "
            "Unda qanday mahsulotlar borligini top va miqdori hamda harid narxini ajrat. "
            "Natijani qat'iy ravishda JSON ro'yxatda qaytar. "
            "Format: [{\"name\": \"...\", \"quantity\": ..., \"unit\": \"...\", \"price\": ...}] "
            "Agar aniq bo'lmasa, taxmin qilib yozma. O'zbek tiliga e'tibor ber."
        )
        
        try:
            img = PIL.Image.open(image_path)
            response = await asyncio.to_thread(
                model.generate_content,
                [prompt, img]
            )
            content = response.text
            
            # Robust JSON extraction
            json_match = re.search(r'\[.*\]', content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
            raise ValueError(f"Kutilgan JSON format topilmadi. AI javobi: {content}")
        except Exception as e:
            print(f"Vision API error (Invoice): {e}")
            raise e

    @classmethod
    async def extract_handwritten_sales(cls, image_path: str) -> List[Dict]:
        """Uses the best available Gemini model to extract sales from handwritten ledger."""
        model_name = await cls._get_best_model()
        model = genai.GenerativeModel(model_name)
        
        prompt = (
            "Mana bu qo'lyozma savdo sahifasini tahlil qil. "
            "Har bir qatorni o'qi va mahsulot nomi, miqdori va umumiy narxni ajrat. "
            "Natijani qat'iy ravishda JSON ro'yxatda qaytar. "
            "Format: [{\"name\": \"...\", \"quantity\": ..., \"total_price\": ...}] "
            "O'zbek tilidagi qisqartmalarni tushun (masalan: '2ta choy 6000' -> name: 'choy', quantity: 2, price: 3000)."
        )
        
        try:
            img = PIL.Image.open(image_path)
            response = await asyncio.to_thread(
                model.generate_content,
                [prompt, img]
            )
            content = response.text
            
            # Robust JSON extraction
            json_match = re.search(r'\[.*\]', content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
            raise ValueError(f"Kutilgan JSON format topilmadi. AI javobi: {content}")
        except Exception as e:
            print(f"Vision API error (Sales): {e}")
            raise e

    @classmethod
    async def chat_with_assistant(cls, context_text: str, message: str) -> str:
        """Uses the best available Gemini model to chat with business context."""
        model_name = await cls._get_best_model()
        model = genai.GenerativeModel(model_name)
        
        system_prompt = (
            "Sen 'Hisobot AI' aqlli yordamchisan. Berilgan biznes hisoboti (context) dan foydalanib o'zbek tilida, "
            "do'stona, aniq va qisqa qilib javob ber. Hech qanday murakkab gaplardan foydalanma. Javob oxirida bitta emoji qoldir."
        )
        
        full_content = f"{system_prompt}\n\nHozirgi Holat (Context):\n{context_text}\n\nFoydalanuvchi: {message}"
        
        try:
            response = await asyncio.to_thread(
                model.generate_content,
                full_content
            )
            return response.text
        except Exception as e:
            print(f"Chat API error (Gemini): {e}")
            return f"Xatolik (AI): {str(e)} 😔"
