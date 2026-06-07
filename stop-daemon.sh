#!/bin/bash
ROOT="$(cd "$(dirname "$0")" && pwd)"
PID_DIR="$ROOT/.run"

stop_pid_file() {
  local file="$1"
  local name="$2"
  if [ -f "$file" ]; then
    local pid
    pid="$(cat "$file")"
    if kill "$pid" 2>/dev/null; then
      echo "Stopped $name (PID $pid)"
    fi
    rm -f "$file"
  fi
}

stop_pid_file "$PID_DIR/backend.pid" "backend"
stop_pid_file "$PID_DIR/frontend.pid" "frontend"

# Fallback: free default ports if pid files are stale
for port in 8000 3000; do
  pids="$(lsof -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    kill $pids 2>/dev/null || true
    echo "Freed port $port"
  fi
done

echo "Done."
