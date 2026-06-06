#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LEAN_DIR="${LEAN_DIR:-$ROOT_DIR/lean}"
DATA_DIR="$LEAN_DIR/data"
LEAN_CONFIG="$LEAN_DIR/lean.json"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

if [[ -f "$LEAN_CONFIG" && -d "$DATA_DIR/equity" ]]; then
  echo "Lean workspace already initialized at $LEAN_DIR"
  exit 0
fi

mkdir -p "$LEAN_DIR"

echo "Downloading Lean sample data and configuration..."
curl -fsSL "https://github.com/QuantConnect/Lean/archive/master.zip" -o "$TMP_DIR/master.zip"
unzip -q "$TMP_DIR/master.zip" -d "$TMP_DIR"

if [[ ! -d "$DATA_DIR" ]]; then
  cp -R "$TMP_DIR/Lean-master/Data" "$DATA_DIR"
fi

if [[ ! -f "$LEAN_CONFIG" ]]; then
  python3 - "$TMP_DIR/Lean-master/Launcher/config.json" "$LEAN_CONFIG" <<'PY'
import re
import sys
from pathlib import Path

source = Path(sys.argv[1]).read_text(encoding="utf-8")
keys_to_remove = [
    "environment",
    "composer-dll-directory",
    "debugging",
    "debugging-method",
    "job-user-id",
    "api-access-token",
    "algorithm-type-name",
    "algorithm-language",
    "algorithm-location",
    "parameters",
    "intrinio-username",
    "intrinio-password",
    "ema-fast",
    "ema-slow",
]

sections = re.split(r"\n\s*\n", source)
for key in keys_to_remove:
    sections = [section for section in sections if f'"{key}": ' not in section]

config = "\n\n".join(sections)
config = config.replace('"data-folder": "../../../Data/"', '"data-folder": "data"')
config = config.replace(
    '"live-data-url": "ws://www.quantconnect.com/api/v2/live/data/"',
    '"live-data-url": "wss://www.quantconnect.com/api/v2/live/data/"',
)
Path(sys.argv[2]).write_text(config, encoding="utf-8")
PY
fi

echo "Lean workspace ready:"
echo "  config: $LEAN_CONFIG"
echo "  data:   $DATA_DIR"
