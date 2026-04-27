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
            "Unda qanday mahsulotlar borligini top, ularni mantiqiy toifalarga (kategoriyalarga, masalan: 'Oziq-ovqat', 'Ichimlik', 'Shirinlik') ajrat, miqdori hamda harid narxini ajrat. "
            "Matn Kiril yoki Lotin alifbosida bo'lishi mumkin, har ikkalasini tushunib tahlil qil. "
            "Natijani qat'iy ravishda JSON ro'yxatda qaytar. "
            "Format: [{\"name\": \"...\", \"category\": \"...\", \"quantity\": ..., \"unit\": \"...\", \"price\": ...}] "
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
            "O'zbek tilidagi qisqartmalarni tushun (masalan: '2ta choy 6000' -> name: 'choy', quantity: 2, total_price: 6000). "
            "Agar umumiy narx yozilmagan bo'lsa (masalan: '2ta choy'), total_price ni 0 qoldir."
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
            "Sen 'Hisobot AI' biznes maslahatchisisan. Tizimda sotuvlar, qarzlar, ombor nazorati kabi funksiyalar mavjud.\n"
            "Yangi imkoniyatlar: Foydalanuvchi pastki menyudagi 'Chiqim' bo'limidan kundalik xarajatlarni kiritishi mumkin. Kiritilgan chiqimlar avtomatik ravishda Kassadan yechiladi. Shuningdek, 'Xulosa' bo'limi tepasidagi 'Hisobot (Excel)' tugmasi orqali barcha ma'lumotlarni (foyda, qarz, chiqim, savdo, ombor) Excel (.xlsx) faylda saqlab olish imkoniyati qo'shildi.\n"
            "Foydalanuvchilar savollariga aniq, qisqa va tushunarli javob ber. Ortiqcha uzun tushuntirishlardan qoch. O'zbek tilida, professional va londa gapir. Javobing 2-3 ta gapdan oshmasin. Javob oxirida bitta do'stona emoji qoldir."
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

    @classmethod
    async def transcribe_audio(cls, file_path: str) -> str:
        """Uses OpenAI Whisper to transcribe audio file to text for better Uzbek accuracy."""
        try:
            with open(file_path, "rb") as audio_file:
                # OpenAI Whisper v3 is much better for Uzbek language than Gemini Flash
                transcript = await client.audio.transcriptions.create(
                    model="whisper-1", 
                    file=audio_file,
                    language="uz", # Explicitly set Uzbek to avoid confusion
                    prompt="Sotuv va xaridlar haqida ma'lumot: mahsulot nomi, soni va narxi." # Contextual hint
                )
                return transcript.text.strip()
        except Exception as e:
            print(f"OpenAI Transcription failed: {e}")
            # Fallback to a simplified error message or Gemini if needed, 
            # but usually OpenAI is the reliable one here.
            raise ValueError(f"Ovozni matnga o'girishda xatolik (OpenAI): {str(e)}")

    @classmethod
    async def parse_voice_intent(cls, transcribed_text: str, mode: str = "inventory") -> List[Dict]:
        """Uses Gemini to parse transcribed text into structured JSON data. 
        Handles converting word-numbers (ikki -> 2) and fuzzy product matching logic."""
        if mode == "sales":
            prompt = (
                f"Matn: '{transcribed_text}'.\n"
                "Ushbu matndan sotilgan mahsulotlarni ajrat. "
                "DIQQAT: Matnda sonlar so'z bilan yozilgan bo'lsa (masalan: 'ikki', 'beshta', 'o'nta'), ularni raqamga o'gir (2, 5, 10). "
                "Mahsulot nomini aslini topishga harakat qil (masalan: 'non sotildi' -> name: 'non'). "
                "Faqat JSON ro'yxat qaytar.\n"
                "Format: [{\"name\": \"...\", \"quantity\": ..., \"total_price\": ...}] "
                "Agar narx aytilmagan bo'lsa, total_price: 0 qoldir."
            )
        else:
            prompt = (
                f"Matn: '{transcribed_text}'.\n"
                "Ushbu matndan omborga kelgan (xarid qilingan) mahsulotlarni ajrat. "
                "DIQQAT: Sonlarni raqamga o'gir (masalan: 'uch yuz' -> 300). "
                "Faqat JSON ro'yxat qaytar.\n"
                "Format: [{\"name\": \"...\", \"category\": \"...\", \"quantity\": ..., \"unit\": \"...\", \"price\": ...}] "
                "Kategoriyani mantiqan aniqla. Narx (price) sotib olish narxidir."
            )

        tried_models = set()
        last_error = "Noma'lum xatolik"
        
        for _ in range(3):
            model_name = await cls._get_best_model(exclude=tried_models)
            tried_models.add(model_name)
            
            try:
                model = genai.GenerativeModel(model_name)
                response = await asyncio.to_thread(model.generate_content, prompt)
                content = response.text
                
                json_match = re.search(r'\[.*\]', content, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group(0))
                raise ValueError("JSON topilmadi")
            except Exception as e:
                last_error = str(e)
                continue
                
        raise ValueError(f"NLP tahlilda xatolik: {last_error}")
