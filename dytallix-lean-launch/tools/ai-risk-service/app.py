from fastapi import FastAPI, Response
from pydantic import BaseModel, Field
import uvicorn
import os
import hashlib
import base64
import time
import threading
try:
    from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
    HAVE_PROM = True
except Exception:
    HAVE_PROM = False
try:
    from nacl.signing import SigningKey
    HAVE_NACL = True
except Exception:
    HAVE_NACL = False

app = FastAPI(title="AI Risk Service", version="0.1.0")

class Tx(BaseModel):
    hash: str
    from_addr: str = Field(alias="from")
    to: str
    amount: int
    fee: int
    nonce: int

class RiskResponse(BaseModel):
    score: float
    tx_hash: str
    model_id: str | None = None
    ts: int | None = None
    signature: str | None = None

SECRET_SEED = os.environ.get("AI_RISK_SECRET_SEED", "dev-seed")
SIGNING_KEY_B64 = os.environ.get("AI_RISK_SIGNING_KEY_B64")
if SIGNING_KEY_B64 and HAVE_NACL:
    sk_bytes = base64.b64decode(SIGNING_KEY_B64)
    sk = SigningKey(sk_bytes)
else:
    sk = SigningKey.generate() if HAVE_NACL else None

# Metrics
if HAVE_PROM:
    ai_latency_ms = Histogram(
        'ai_latency_ms',
        'AI scoring latency in milliseconds',
        buckets=(10, 25, 50, 100, 250, 500, 1000, 1500, 2000, 3000, 5000)
    )
    ai_requests_total = Counter('ai_requests_total', 'Total AI scoring requests')
    ai_request_errors_total = Counter('ai_request_errors_total', 'Total AI request errors')

# Runtime-configurable delay (ms)
_delay_lock = threading.Lock()
_delay_ms = 0

@app.post("/score", response_model=RiskResponse)
async def score(tx: Tx, model_id: str = "risk-v1"):
    global _delay_ms
    if HAVE_PROM:
        ai_requests_total.inc()
    t0 = time.perf_counter()
    # Simple heuristic: hash entropy mod scaled
    h = hashlib.sha256(f"{tx.hash}:{tx.amount}:{tx.fee}:{tx.nonce}".encode()).digest()
    raw = int.from_bytes(h[:4], 'big') / 0xFFFFFFFF
    # adjust by fee ratio as naive anti-spam weight
    fee_factor = min(1.0, (tx.fee / (tx.amount + 1)) if tx.amount else 0.0)
    score = min(1.0, max(0.0, 0.3 * raw + 0.7 * (1 - fee_factor)))
    sig = None
    ts = int(time.time())
    if sk:
        # Sign tx_hash:score:model_id for oracle verification
        msg = f"{tx.hash}:{score}:{model_id}".encode()
        sig = base64.b64encode(sk.sign(msg).signature).decode()
    # Optional artificial delay
    dly = 0
    with _delay_lock:
        dly = _delay_ms
    if dly > 0:
        await _async_sleep_ms(dly)
    # Observe latency
    if HAVE_PROM:
        ms = (time.perf_counter() - t0) * 1000.0
        ai_latency_ms.observe(ms)
    return RiskResponse(score=round(score,4), tx_hash=tx.hash, model_id=model_id, ts=ts, signature=sig)

async def _async_sleep_ms(ms: int):
    import asyncio
    await asyncio.sleep(max(0.0, ms/1000.0))

@app.get('/ops/set_delay')
async def set_delay(ms: int = 0):
    global _delay_ms
    with _delay_lock:
        _delay_ms = max(0, int(ms))
    return {"ok": True, "delay_ms": _delay_ms}

@app.get('/metrics')
def metrics():
    if not HAVE_PROM:
        return Response("", media_type=CONTENT_TYPE_LATEST)
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 7000)))
