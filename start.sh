#!/bin/bash
set -e

echo "🚀 Starting Integrated Quant Terminal..."
echo ""

# Helper: find a free TCP port from a list
find_free_port() {
  for p in "$@"; do
    if ! lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "$p"
      return 0
    fi
  done
  return 1
}

# Backend
echo "📦 Starting backend (FastAPI)..."
cd backend

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "⚠️  Created backend/.env from template — add your ANTHROPIC_API_KEY or GEMINI_API_KEY!"
fi

# Validate AI provider (Ollama local, or cloud API keys)
if grep -qE '^AI_PROVIDER=ollama' .env 2>/dev/null; then
  echo "✅ AI provider: Ollama (local)"
elif grep -qE '^(ANTHROPIC_API_KEY|GEMINI_API_KEY)=.+' .env && grep -vE 'your-key-here|your-gemini-key' .env | grep -qE '^(ANTHROPIC_API_KEY|GEMINI_API_KEY)=.+'; then
  echo "✅ AI provider: cloud API key configured"
else
  echo "⚠️  Set AI_PROVIDER=ollama in backend/.env, or add ANTHROPIC_API_KEY / GEMINI_API_KEY"
fi

if [ ! -d "venv" ]; then
  echo "📦 Creating Python virtualenv..."
  python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt -q

# Pick an available backend port (try 8000..8010)
BACKEND_PORT=$(find_free_port 8000 8001 8002 8003 8004 8005 8006 8007 8008 8009 8010) || {
  echo "❌ No available backend port (8000-8010)."; exit 1;
}

echo "✅ Starting FastAPI backend on port ${BACKEND_PORT}..."
nohup uvicorn main:app \
  --host 127.0.0.1 \
  --port "$BACKEND_PORT" > uvicorn.log 2>&1 &
BACKEND_PID=$!

# Wait for backend health (avoids frontend 500s from ECONNREFUSED)
for i in $(seq 1 20); do
  if curl -sf "http://127.0.0.1:${BACKEND_PORT}/health" >/dev/null 2>&1; then
    echo "✅ Backend healthy on port ${BACKEND_PORT}"
    break
  fi
  if [ "$i" -eq 20 ]; then
    echo "❌ Backend failed to start — check backend/uvicorn.log"
    kill "$BACKEND_PID" 2>/dev/null || true
    exit 1
  fi
  sleep 0.5
done

cd ..

# Frontend
echo ""
echo "🖥️  Starting frontend (Next.js)..."
cd frontend

if [ ! -f "shared/utils.ts" ]; then
  echo "❌ Missing frontend/shared/utils.ts"
  echo "   Run: git pull origin main"
  echo "   Or:  git checkout origin/main -- frontend/shared"
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  npm install
fi

# Pick an available frontend port (try 3000..3010)
FRONTEND_PORT=$( (cd .. && find_free_port 3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010) ) || {
  echo "❌ No available frontend port (3000-3010)."; exit 1;
}

echo "✅ Starting Next.js frontend on port ${FRONTEND_PORT}..."
PORT="$FRONTEND_PORT" nohup npm run dev > next.log 2>&1 &
FRONTEND_PID=$!

echo ""
echo "════════════════════════════════════════"
echo "  ✨ Integrated Quant Terminal is running!"
echo "  🌐 Frontend: http://localhost:${FRONTEND_PORT}"
echo "  🔌 Backend API: http://localhost:${BACKEND_PORT}"
echo "  📚 API Docs: http://localhost:${BACKEND_PORT}/docs"
echo "════════════════════════════════════════"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for signals and cleanup
cleanup() {
  echo "\n🛑 Stopping services..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" 2>/dev/null || true
  wait "$FRONTEND_PID" 2>/dev/null || true
  echo "🛑 Services stopped"
  exit 0
}

trap cleanup SIGINT SIGTERM

wait
