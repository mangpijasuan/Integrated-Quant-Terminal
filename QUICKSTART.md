# Quick Start Guide — Integrated Quant Terminal

## Prerequisites
- Python 3.11+
- Node.js 18+
- npm or yarn
- Either Anthropic or Google Gemini API key

## Option 1: Local Development (Recommended for Dev)

### 1. Get an API Key
- **Anthropic Claude**: [console.anthropic.com](https://console.anthropic.com)
- **Google Gemini**: [makersuite.google.com](https://makersuite.google.com/app/apikey)

### 2. Configure Environment
```bash
cd backend
cp .env.example .env
# Edit .env and add your API key
nano .env  # or open in your editor
```

### 3. Run Everything
```bash
# From project root
chmod +x start.sh
./start.sh
```

### 4. Access the App
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **Health**: http://localhost:8000/health

---

## Option 2: Docker (Recommended for Production)

### 1. Install Docker & Docker Compose
- [Docker Desktop](https://www.docker.com/products/docker-desktop)

### 2. Configure Environment
```bash
cp backend/.env.example backend/.env
# Edit and add your API key
nano backend/.env
```

### 3. Start Services
```bash
docker-compose up --build
```

### 4. Access the App
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs

---

## Configuration Reference

### Environment Variables (backend/.env)

```env
# AI Provider (choose ONE)
ANTHROPIC_API_KEY=sk-ant-your-key-here  # Recommended
# OR
GEMINI_API_KEY=your-gemini-key-here

# JWT Security
JWT_SECRET=auto-generated-if-not-set
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080

# Database
DATABASE_URL=./iqt.db

# CORS (for frontend)
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Logging
LOG_LEVEL=INFO  # Options: DEBUG, INFO, WARNING, ERROR, CRITICAL

# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=8000

# Alpaca Trading (optional)
ALPACA_API_KEY=
ALPACA_SECRET_KEY=
ALPACA_BASE_URL=https://paper-api.alpaca.markets
```

---

## Testing the API

### 1. Signup
```bash
curl -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "secure123456"
  }'
```

### 2. Get API Docs
Open http://localhost:8000/docs in your browser for interactive Swagger UI

### 3. Analyze a Stock
```bash
# First, login to get token
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"secure123456"}' | jq -r '.access_token')

# Then analyze
curl -X POST http://localhost:8000/analyst/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ticker":"AAPL"}'
```

---

## Interactive Brokers (IBKR)

Trading, portfolio, options chains, and option execution use **IB Gateway / TWS** only.

### Setup

1. Install [IB Gateway](https://www.interactivebrokers.com/en/trading/ibgateway-stable.php) and log in (paper recommended first).
2. **Configure → Settings → API** → enable socket clients, trusted IP `127.0.0.1`.
3. Note the port: **4002** (paper Gateway), **4001** (live Gateway).
4. Add to `backend/.env`:

```env
IBKR_HOST=127.0.0.1
IBKR_PORT=4002
IBKR_CLIENT_ID=10
IBKR_ACCOUNT=DU1234567
```

5. Restart `./start.sh`, open **Settings → Broker → Test Connection**.

### App features on IBKR

| Feature | Route |
|---------|--------|
| Stock orders | Execution |
| Portfolio / positions | Portfolio |
| Options chain + AI execute | Options |
| Live quotes (when connected) | Dashboard / Watchlist |

Keep IB Gateway running whenever you trade.

---

Use QuantConnect's LEAN engine for institutional-grade backtests from **Algo → Backtest** (select engine **QuantConnect LEAN**).

### One-time setup

1. Install and start **Docker Desktop**
2. Run from project root:

```bash
chmod +x scripts/setup-lean-mac.sh
./scripts/setup-lean-mac.sh
```

This installs the LEAN CLI, initializes `backend/lean_workspace/`, pulls the `quantconnect/lean` Docker image, and creates the `IQTBacktest` project.

3. (Recommended) Log in to QuantConnect so LEAN can download data for any symbol:

```bash
cd backend && source venv/bin/activate
lean login
```

Free account: https://www.quantconnect.com/account

### Run from the app

1. Open http://localhost:3000 → **Algo → Backtest**
2. Set **Engine** to **QuantConnect LEAN (Docker, Mac)**
3. Choose symbol, strategy, dates, and click **Run LEAN Backtest**

First LEAN run may take a few minutes while Docker starts the engine.

---

## Troubleshooting

### Backend won't start
```bash
# Check if port 8000 is in use
lsof -i :8000
# Kill the process
kill -9 <PID>
```

### Frontend won't start
```bash
# Clear npm cache
rm -rf node_modules package-lock.json
npm install
```

### API key error
```bash
# Make sure your API key is set in backend/.env
grep "ANTHROPIC_API_KEY\|GEMINI_API_KEY" backend/.env
```

### Database locked
```bash
# Delete old database and restart
rm backend/iqt.db
./start.sh
```

---

## Features Implemented

✅ **Phase 1 — Dashboard & Watchlist**
- Live market data (S&P 500, NASDAQ, DOW, BTC, Gold, Oil)
- Watchlist management
- Top movers tracking
- Market mood (VIX-based)

✅ **Phase 2 — AI Stock Analyst**
- AI-powered stock analysis
- Buy/Hold/Sell verdicts with confidence scores
- Bull/Bear thesis points
- Key risks identification
- Three investor personas (Buffett, Wood, Dalio)

✅ **Security & Improvements**
- Secure JWT authentication
- Both Anthropic & Gemini AI support
- Comprehensive error handling
- Structured logging
- Database optimization
- Input validation
- Docker containerization

---

## Documentation

- [IMPROVEMENTS.md](IMPROVEMENTS.md) — Detailed changes made
- [README.md](README.md) — Project overview
- [API Docs](http://localhost:8000/docs) — Interactive Swagger UI

---

## Support

For issues or questions:
1. Check [IMPROVEMENTS.md](IMPROVEMENTS.md) for recent changes
2. Review logs: `backend/` or `frontend/` console output
3. Check API docs at `/docs` endpoint

---

**Last Updated**: May 17, 2026
