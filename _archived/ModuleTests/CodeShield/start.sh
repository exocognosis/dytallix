#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

# Load env if present
if [ -f ../config/.env ]; then
  set -a
  # shellcheck disable=SC1091
  . ../config/.env
  set +a
fi

: "${CODESHIELD_API:=http://127.0.0.1:7081}"
: "${CODESHIELD_MOCK:=1}"
: "${PORT:=7081}"

# Prefer system Python
if [ -x "/usr/bin/python3" ]; then
  PY="/usr/bin/python3"
else
  PY="${PYTHON:-$(command -v python3 || true)}"
fi
if [ -z "${PY:-}" ]; then
  echo "python3 not found. Please install Python 3." >&2
  exit 2
fi

if [ "${CODESHIELD_MOCK}" = "1" ] || [ "${CODESHIELD_MOCK}" = "true" ]; then
  echo "[CodeShield] Starting MOCK server on :$PORT using $PY"
  # Preflight deps check on system Python
  if ! "$PY" - <<'PYCHK' >/dev/null 2>&1
import sys
try:
    import uvicorn  # noqa
    import fastapi  # noqa
    import multipart  # noqa
except Exception as e:
    sys.exit(1)
PYCHK
  then
    echo "Missing deps for mock server on system Python. Install:" >&2
    echo "  pip3 install fastapi 'uvicorn[standard]' python-multipart" >&2
    exit 2
  fi
  exec "$PY" -m uvicorn tools.mock_server:app --host 0.0.0.0 --port "$PORT"
else
  echo "[CodeShield] Starting REAL backend proxy to $CODESHIELD_API"
  cat <<'PROXY' > .codeshield_proxy.js
import express from 'express';
import fetch from 'node-fetch';
const app = express();
app.use(express.json());
app.post('/scan', async (req, res) => {
  const r = await fetch(process.env.CODESHIELD_API + '/scan', { method: 'POST' });
  const j = await r.json().catch(()=>({}));
  res.status(r.status).json(j);
});
app.get('/report/:id', async (req, res) => {
  const r = await fetch(process.env.CODESHIELD_API + '/report/' + req.params.id);
  const j = await r.json().catch(()=>({}));
  res.status(r.status).json(j);
});
app.get('/health', (_req, res) => res.json({ ok: true }));
app.listen(process.env.PORT || 7081, () => console.log('Proxy on :' + (process.env.PORT||7081)));
PROXY
  if ! command -v node >/dev/null 2>&1; then
    echo "Node.js not found. Install Node or run in mock mode (CODESHIELD_MOCK=1)." >&2
    exit 2
  fi
  export PORT
  node .codeshield_proxy.js
fi
