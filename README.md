# Integrated Quant Terminal — Web

Bloomberg-grade market intelligence for retail traders. AI-powered analysis, real-time data, and quant tools in a clean terminal UI.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Backend | FastAPI (Python), yfinance, Anthropic Claude |
| Database | SQLite (via aiosqlite) |
| Auth | JWT (python-jose + bcrypt) |

## Quick Start

### 1. Get your Anthropic API key
Get one at [console.anthropic.com](https://console.anthropic.com)

### 2. Run everything
```bash
./start.sh
```

That script will:
- Create a Python virtualenv and install dependencies
- Create `backend/.env` from the template
- Start the FastAPI backend on port 8000
- Install npm packages and start Next.js on port 3000

### 3. Add your API key
Edit `backend/.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

Then open **http://localhost:3000**

---

## Manual Setup

### Backend
```bash
cd backend
cp .env.example .env
# Edit .env and add ANTHROPIC_API_KEY
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Features (Phase 1 & 2)

### Phase 1 — Dashboard & Watchlist
- Bloomberg-style terminal dark UI
- Live market overview (S&P 500, NASDAQ, DOW, BTC, Gold, Oil)
- Watchlist — add any ticker, see live prices + % change
- Top Movers (biggest gainers and losers)
- Market Mood (Fear/Greed indicator powered by VIX)
- Live ticker tape in the top bar

### Phase 2 — AI Stock Analyst
- Enter any ticker → get instant AI report
- Verdict (BUY / HOLD / SELL) + confidence score
- Price target + upside %
- Bull case & bear case (3 points each)
- DCF valuation estimate
- Key risks
- 3 AI investor personas (Buffett, Wood, Dalio)
- Rate limiting: 5 free analyses/day (upgrade to Pro for unlimited)

---

## Pricing Tiers
| Tier | Price | Analyses/day |
|------|-------|-------------|
| Free | $0 | 5 |
| Pro | $29/month | Unlimited |
| Pro+ | $79/month | Unlimited + backtesting |

---

## Project Structure
```
├── frontend/
│   ├── app/
│   │   ├── (auth)/login/     # Login page
│   │   ├── (auth)/signup/    # Signup page
│   │   ├── dashboard/        # Main dashboard
│   │   └── analyst/          # AI Stock Analyst
│   ├── components/
│   │   ├── dashboard/        # Sidebar, Topbar, MarketOverview, TopMovers, MarketMood
│   │   ├── watchlist/        # WatchlistWidget
│   │   ├── analyst/          # AnalystReport
│   │   └── ui/               # Badge, Spinner
│   └── lib/
│       ├── api.ts            # API client + auth token mgmt
│       └── utils.ts          # Formatters, helpers
└── backend/
    ├── main.py               # FastAPI app + CORS + lifespan
    ├── config.py             # Settings (env vars)
    ├── database.py           # SQLite init + get_db
    ├── routers/
    │   ├── auth.py           # POST /auth/login, /auth/signup
    │   ├── market.py         # GET /market/overview, /movers, /mood
    │   ├── watchlist.py      # GET/POST/DELETE /watchlist
    │   └── analyst.py        # POST /analyst/analyze
    ├── services/
    │   ├── auth_service.py   # JWT, bcrypt, user lookups
    │   ├── market_service.py # yfinance data fetching + TTL cache
    │   └── analyst_service.py # Anthropic Claude AI analysis
    └── models/
        ├── auth.py           # Pydantic auth models
        └── market.py         # Pydantic market/analyst models
```
