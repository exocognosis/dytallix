from fastapi import FastAPI
from pydantic import BaseModel, Field
import uvicorn
import os
import hashlib
import base64
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
    signature: str | None = None

SECRET_SEED = os.environ.get("AI_RISK_SECRET_SEED", "dev-seed")
SIGNING_KEY_B64 = os.environ.get("AI_RISK_SIGNING_KEY_B64")
if SIGNING_KEY_B64 and HAVE_NACL:
    sk_bytes = base64.b64decode(SIGNING_KEY_B64)
    sk = SigningKey(sk_bytes)
else:
    sk = SigningKey.generate() if HAVE_NACL else None

@app.post("/score", response_model=RiskResponse)
async def score(tx: Tx):
    # Simple heuristic: hash entropy mod scaled
    h = hashlib.sha256(f"{tx.hash}:{tx.amount}:{tx.fee}:{tx.nonce}".encode()).digest()
    raw = int.from_bytes(h[:4], 'big') / 0xFFFFFFFF
    # adjust by fee ratio as naive anti-spam weight
    fee_factor = min(1.0, (tx.fee / (tx.amount + 1)) if tx.amount else 0.0)
    score = min(1.0, max(0.0, 0.3 * raw + 0.7 * (1 - fee_factor)))
    sig = None
    if sk:
        msg = f"{tx.hash}:{score}".encode()
        sig = base64.b64encode(sk.sign(msg).signature).decode()
    return RiskResponse(score=round(score,4), tx_hash=tx.hash, signature=sig)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 7000)))
