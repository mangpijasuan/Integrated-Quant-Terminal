#!/bin/bash
# Run Integrated Quant Terminal 24/7 (production mode, detached from terminal).
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
PID_DIR="$ROOT/.run"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_PID="$PID_DIR/backend.pid"
FRONTEND_PID="$PID_DIR/frontend.pid"

mkdir -p "$PID_DIR"

if lsof -nP -iTCP:"$BACKEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Backend already listening on port $BACKEND_PORT"
else
  echo "Starting backend on port $BACKEND_PORT..."
  cd "$ROOT/backend"
  if [ ! -d venv ]; then python3 -m venv venv; fi
  source venv/bin/activate
  pip install -r requirements.txt -q
  nohup uvicorn main:app --host 127.0.0.1 --port "$BACKEND_PORT" >> uvicorn.log 2>&1 &
  echo $! > "$BACKEND_PID"
  for i in $(seq 1 30); do
    curl -sf "http://127.0.0.1:${BACKEND_PORT}/health" >/dev/null 2>&1 && break
    sleep 0.5
  done
  echo "Backend PID $(cat "$BACKEND_PID")"
fi

if lsof -nP -iTCP:"$FRONTEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Frontend already listening on port $FRONTEND_PORT"
else
  echo "Building frontend (one-time, may take a minute)..."
  cd "$ROOT/frontend"
  npm install -q
  npm run build
  echo "Starting frontend on port $FRONTEND_PORT..."
  PORT="$FRONTEND_PORT" nohup npm start >> next.log 2>&1 &
  echo $! > "$FRONTEND_PID"
  echo "Frontend PID $(cat "$FRONTEND_PID")"
fi

echo ""
echo "Integrated Quant Terminal is running in the background."
echo "  Frontend: http://localhost:${FRONTEND_PORT}"
echo "  Backend:  http://127.0.0.1:${BACKEND_PORT}"
echo "  Logs:     backend/uvicorn.log  frontend/next.log"
echo ""
echo "Stop with: ./stop-daemon.sh"
