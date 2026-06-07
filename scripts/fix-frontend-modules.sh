#!/bin/bash
# Ensures frontend shared modules exist and old @/lib imports keep working.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHARED="$ROOT/frontend/shared"
LIB="$ROOT/frontend/lib"

required=(utils.ts api.ts use-api-cache.ts sidebar-context.tsx)

for file in "${required[@]}"; do
  if [ ! -f "$SHARED/$file" ]; then
    echo "❌ Missing $SHARED/$file"
    echo "   Run: git pull origin main"
    echo "   Or:  git checkout origin/main -- frontend/shared"
    exit 1
  fi
done

mkdir -p "$LIB"

for file in "${required[@]}"; do
  shim="$LIB/$file"
  if [ ! -f "$shim" ]; then
    module="${file%.*}"
    if [[ "$file" == *.tsx ]]; then
      echo "export * from \"../shared/$module\";" > "$shim"
    else
      echo "export * from \"../shared/$module\";" > "$shim"
    fi
    echo "✅ Created compatibility shim: frontend/lib/$file"
  fi
done

# Patch any stale @/lib imports in source (idempotent if already @/shared)
if command -v python3 >/dev/null 2>&1; then
  python3 - <<'PY'
import pathlib
root = pathlib.Path("frontend")
changed = 0
for p in list(root.rglob("*.ts")) + list(root.rglob("*.tsx")):
    if "node_modules" in p.parts or ".next" in p.parts or "shared" in p.parts or "lib" in p.parts:
        continue
    text = p.read_text()
    if "@/lib/" in text:
        p.write_text(text.replace("@/lib/", "@/shared/"))
        print(f"Patched imports: {p}")
        changed += 1
if changed == 0:
    print("✅ No stale @/lib imports found")
PY
fi

rm -rf "$ROOT/frontend/.next"
echo "✅ Frontend modules OK (cleared .next cache)"
