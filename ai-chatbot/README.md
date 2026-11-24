# ABC Cart — Python AI Shopping Chatbot

Independent FastAPI + OpenAI microservice providing intelligent product discovery, comparisons, order tracking, personalized shopping, and confirmed conversational commerce for ABC Cart.

## Setup

```bash
cd ai-chatbot
python -m venv venv
# Windows
venv\Scripts\activate
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and add your `OPENAI_API_KEY`:

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
CHATBOT_PORT=8001
ECOMMERCE_API_URL=http://localhost:5001
JWT_SECRET=abccart_secure_jwt_secret_2026
```

## Run

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

Or from the project root (`E-commerce-`) run all three services together:

```bash
npm run dev:all
```

## Run Tests

```bash
cd ai-chatbot
venv\Scripts\pytest -v
```
