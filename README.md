# Hisobot AI — From Notebook to Smartphone (Daftardan — Smartfonga)

Professional ERP and Business Intelligence system for entrepreneurs.

## 🚀 Features
- **Voice-to-Inventory (AI)**: Automated stock updates using voice command (Uzbek).
- **Daily Ledger OCR (Gemini 1.5 Pro)**: Digitization of handwritten notes for sales tracking.
- **Smart Inventory Management**: Red/Green indicators for low stock items.
- **Business Intelligence**: AI-powered predictions for restocking and profit analysis.

## 🛠️ Technology Stack
- **Backend**: FastAPI, PostgreSQL/SQLite, SQLAlchemy, OpenAI (Whisper + GPT-4o), Gemini 1.5 Pro.
- **Frontend**: React, Tailwind CSS, Telegram Mini App (TMA).

## 🔨 Installation
1. Clone the repository.
2. Setup `.env` file in `backend/` with `OPENAI_API_KEY` and `GEMINI_API_KEY`.
3. Run Backend: `pip install -r backend/requirements.txt && uvicorn backend.app.main:app --reload`.
4. Run Frontend: `cd frontend && npm install && npm run dev`.
