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
    
    @staticmethod
    async def extract_invoice_data(image_path: str) -> List[Dict]:
        """Uses Gemini 1.5 Pro to extract structured data from an invoice image asynchronously."""
        model = genai.GenerativeModel("gemini-1.5-pro")
        
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

    @staticmethod
    async def extract_handwritten_sales(image_path: str) -> List[Dict]:
        """Uses Gemini to extract sales from handwritten ledger asynchronously."""
        model = genai.GenerativeModel("gemini-1.5-pro")
        
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

    @staticmethod
    async def chat_with_assistant(context_text: str, message: str) -> str:
        """Uses Async OpenAI to chat with business context."""
        system_prompt = (
            "Sen 'Hisobot AI' aqlli yordamchisan. Berilgan biznes hisoboti (context) dan foydalanib o'zbek tilida, "
            "do'stona, aniq va qisqa qilib javob ber. Hech qanday murakkab gaplardan foydalanma. Javob oxirida bitta emoj qoldir."
        )
        
        full_content = f"Biznes egasi so'rovi: {message}\n\nHozirgi Holat (Context):\n{context_text}"
        
        try:
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": full_content}
                ]
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Chat API error: {e}")
            return "Kechirasiz, xizmatda uzilish yuz berdi. Iltimos, keyinroq urinib ko'ring."
