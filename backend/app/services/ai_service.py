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
    @classmethod
    async def _get_best_model(cls, exclude: set = None) -> str:
        """Finds the best available model, respecting GEMINI_MODEL_NAME override."""
        if exclude is None: exclude = set()
        
        # 1. Manual override from Environment Variable
        manual_model = os.getenv("GEMINI_MODEL_NAME")
        if manual_model and manual_model not in exclude:
            return manual_model
            
        try:
            # 2. Dynamic Discovery
            models = await asyncio.to_thread(genai.list_models)
            available_models = [m.name for m in models if "generateContent" in m.supported_generation_methods]
            
            # Priority list for future-proofing
            priorities = [
                "models/gemini-2.0-flash",
                "models/gemini-1.5-flash",
                "models/gemini-1.5-pro",
            ]
            
            for p in priorities:
                if p in available_models and p not in exclude:
                    return p
            
            for m in available_models:
                if m not in exclude:
                    return m
            return "models/gemini-1.5-flash"
        except Exception as e:
            print(f"Model discovery error: {e}")
            return "models/gemini-1.5-flash"

    @classmethod
    async def extract_invoice_data(cls, image_path: str) -> List[Dict]:
        """Uses Gemini with auto-retry across models to extract invoice data."""
        prompt = (
            "Mana bu faktura (qog'oz hujjat) rasmini tahlil qil. "
            "Unda qanday mahsulotlar borligini top va miqdori hamda harid narxini ajrat. "
            "Matn Kiril yoki Lotin alifbosida bo'lishi mumkin, har ikkalasini tushunib tahlil qil. "
            "Natijani qat'iy ravishda JSON ro'yxatda qaytar. "
            "Format: [{\"name\": \"...\", \"quantity\": ..., \"unit\": \"...\", \"price\": ...}] "
            "Agar aniq bo'lmasa, taxmin qilib yozma. O'zbek tiliga e'tibor ber."
        )
        
        tried_models = set()
        last_error = "Noma'lum xatolik"
        
        # Convert to standard JPEG to avoid 'image/mpo' or other unsupported types
        standard_path = f"{image_path}_standard.jpg"
        try:
            with PIL.Image.open(image_path) as img:
                img.convert("RGB").save(standard_path, "JPEG")
            processing_path = standard_path
        except:
            processing_path = image_path

        for _ in range(3):
            model_name = await cls._get_best_model(exclude=tried_models)
            tried_models.add(model_name)
            
            try:
                img = PIL.Image.open(processing_path)
                model = genai.GenerativeModel(model_name)
                response = await asyncio.to_thread(model.generate_content, [prompt, img])
                content = response.text
                
                json_match = re.search(r'\[.*\]', content, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group(0))
                raise ValueError(f"JSON format topilmadi. Model: {model_name}")
            except Exception as e:
                last_error = str(e)
                print(f"Vision (Invoice) failed with {model_name}: {e}")
                continue
        
        if os.path.exists(standard_path): os.remove(standard_path)
        raise ValueError(f"Barcha modellar muvaffaqiyatsiz tugadi. So'nggi xato: {last_error}")

    @classmethod
    async def extract_handwritten_sales(cls, image_path: str) -> List[Dict]:
        """Uses Gemini with auto-retry across models to extract sales data."""
        prompt = (
            "Mana bu qo'lyozma savdo sahifasini tahlil qil. "
            "Har bir qatorni o'qi va mahsulot nomi, miqdori va umumiy narxni ajrat. "
            "Matn Kiril yoki Lotin alifbosida bo'lishi mumkin, har ikkalasini tushunib tahlil qil. "
            "Natijani qat'iy ravishda JSON ro'yxatda qaytar. "
            "Format: [{\"name\": \"...\", \"quantity\": ..., \"total_price\": ...}] "
            "O'zbek tilidagi qisqartmalarni tushun (masalan: '2ta choy 6000' -> name: 'choy', quantity: 2, total_price: 6000)."
        )
        
        tried_models = set()
        last_error = "Noma'lum xatolik"

        # Convert to standard JPEG
        standard_path = f"{image_path}_standard_sales.jpg"
        try:
            with PIL.Image.open(image_path) as img:
                img.convert("RGB").save(standard_path, "JPEG")
            processing_path = standard_path
        except:
            processing_path = image_path
        
        for _ in range(3):
            model_name = await cls._get_best_model(exclude=tried_models)
            tried_models.add(model_name)
            
            try:
                img = PIL.Image.open(processing_path)
                model = genai.GenerativeModel(model_name)
                response = await asyncio.to_thread(model.generate_content, [prompt, img])
                content = response.text
                
                json_match = re.search(r'\[.*\]', content, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group(0))
                raise ValueError(f"JSON format topilmadi. Model: {model_name}")
            except Exception as e:
                last_error = str(e)
                print(f"Vision (Sales) failed with {model_name}: {e}")
                continue
        
        if os.path.exists(standard_path): os.remove(standard_path)
        raise ValueError(f"Barcha modellar muvaffaqiyatsiz tugadi. So'nggi xato: {last_error}")

    @classmethod
    async def chat_with_assistant(cls, context_text: str, message: str) -> str:
        """Uses Gemini with auto-retry across models for chat functionality."""
        system_prompt = (
            "Sen 'Hisobot AI' aqlli yordamchisan. Berilgan biznes hisoboti (context) dan foydalanib o'zbek tilida, "
            "do'stona, aniq va qisqa qilib javob ber. Hech qanday murakkab gaplardan foydalanma. Javob oxirida bitta emoji qoldir."
        )
        full_content = f"{system_prompt}\n\nHozirgi Holat (Context):\n{context_text}\n\nFoydalanuvchi: {message}"
        
        tried_models = set()
        last_error = "Noma'lum xatolik"
        
        for _ in range(3):
            model_name = await cls._get_best_model(exclude=tried_models)
            tried_models.add(model_name)
            
            try:
                model = genai.GenerativeModel(model_name)
                response = await asyncio.to_thread(model.generate_content, full_content)
                return response.text
            except Exception as e:
                last_error = str(e)
                print(f"Chat failed with {model_name}: {e}")
                continue
                
        return f"Kechirasiz, barcha AI modellarida limit tugagan ko'rinadi. So'nggi xato: {last_error} 😔"
