#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-8080}"

export PYTHONPATH="$ROOT_DIR"

echo "[run] Starting CodeShield on :$PORT"
python -m uvicorn src.main:app --host 0.0.0.0 --port "$PORT" &
PID=$!

trap 'kill $PID 2>/dev/null || true' EXIT

# Wait for health
ATTEMPTS=20
for i in $(seq 1 $ATTEMPTS); do
  if curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null; then
    echo "[run] Health check OK"
    wait $PID
    exit 0
  fi
  sleep 0.1
done

echo "[run] Health check failed"
exit 1

