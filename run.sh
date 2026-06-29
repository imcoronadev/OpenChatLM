#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

if [ ! -d "$ROOT/backend/.venv" ]; then
  echo "[setup] Creating backend virtualenv..."
  (cd "$ROOT/backend" && python -m venv .venv)
fi
# shellcheck disable=SC1091
source "$ROOT/backend/.venv/bin/activate"
echo "[setup] Installing backend deps..."
pip install -q -r "$ROOT/backend/requirements.txt"

if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo "[setup] Installing frontend deps..."
  (cd "$ROOT/frontend" && npm install --silent)
fi

# Start backend in background
echo "[run] Starting backend on http://127.0.0.1:8000 ..."
(cd "$ROOT/backend" && uvicorn app.main:app --host 127.0.0.1 --port 8000) &
BACKEND_PID=$!

trap "echo '[stop]'; kill $BACKEND_PID 2>/dev/null || true" EXIT INT TERM

# Start frontend dev server
echo "[run] Starting frontend on http://127.0.0.1:5173 ..."
(cd "$ROOT/frontend" && npm run dev -- --host 127.0.0.1)

wait $BACKEND_PID