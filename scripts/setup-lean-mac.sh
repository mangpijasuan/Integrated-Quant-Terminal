#!/bin/bash
# Setup QuantConnect LEAN for local backtesting on macOS.
# Requires: Docker Desktop, Python venv (from ./start.sh), free QuantConnect account.

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
WORKSPACE="$BACKEND/lean_workspace"

echo "════════════════════════════════════════════════════════"
echo "  LEAN setup for Integrated Quant Terminal (macOS)"
echo "════════════════════════════════════════════════════════"
echo ""

# Docker
if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker not found."
  echo "   Install Docker Desktop: https://www.docker.com/products/docker-desktop/"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker is installed but not running."
  echo "   Open Docker Desktop and wait until it is ready, then rerun this script."
  exit 1
fi
echo "✅ Docker is running"

# Python venv
cd "$BACKEND"
if [ ! -d "venv" ]; then
  echo "📦 Creating Python virtualenv..."
  python3 -m venv venv
fi
source venv/bin/activate

echo "📦 Installing LEAN CLI..."
pip install -q lean

LEAN_BIN="$(python -c 'import shutil; print(shutil.which("lean") or "")')"
if [ -z "$LEAN_BIN" ]; then
  LEAN_BIN="$BACKEND/venv/bin/lean"
fi
echo "✅ LEAN CLI: $LEAN_BIN"

# Initialize workspace (downloads sample data + lean.json)
mkdir -p "$WORKSPACE"
cd "$WORKSPACE"

if [ ! -f "lean.json" ]; then
  echo ""
  echo "LEAN needs a free QuantConnect account to download config and sample data."
  echo "Create one at: https://www.quantconnect.com/account"
  echo ""
  echo "You will be prompted for User ID and API token (one-time setup)."
  echo ""
  lean init -l python
  echo "✅ LEAN workspace initialized"
else
  echo "✅ lean.json already exists — skipping lean init"
fi

# Create backtest project if missing
if [ ! -f "IQTBacktest/main.py" ]; then
  lean create-project --language python IQTBacktest
  echo "✅ Created IQTBacktest project"
else
  echo "✅ IQTBacktest project already exists"
fi

# Pull engine image (first run can take several minutes)
echo ""
echo "📦 Pulling quantconnect/lean Docker image (may take a few minutes on first run)..."
docker pull quantconnect/lean:latest

echo ""
echo "════════════════════════════════════════════════════════"
echo "  ✅ LEAN is ready"
echo ""
echo "  Optional — download data for any symbol/date range:"
echo "    lean login"
echo "    lean data download --dataset \"USA Equities\" --data-type Trade --ticker AAPL --resolution Daily"
echo ""
echo "  Or run a backtest from the app with engine = LEAN."
echo "  The app uses --download-data automatically when credentials exist."
echo "════════════════════════════════════════════════════════"
