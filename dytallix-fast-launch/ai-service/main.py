import os
import time
import json
import base64
import random
import subprocess
from typing import Optional
from fastapi import FastAPI, HTTPException, Header, Request
from pydantic import BaseModel

app = FastAPI(title="Dytallix AI Risk Oracle (PQC)")

# Path to Rust PQC Signer Binary
# Located in workspace root target directory
SIGNER_BIN = os.path.abspath(os.path.join(os.path.dirname(__file__), "../target/debug/pqc_signer"))

def run_signer(args):
    try:
        result = subprocess.run([SIGNER_BIN] + args, capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Signer error: {e.stderr}")
        raise HTTPException(status_code=500, detail="PQC Signing failed")

# Load or generate Oracle Signing Key
ORACLE_SK_ENV = os.getenv("AI_ORACLE_SK")
oracle_pk = ""
oracle_sk = ""

if ORACLE_SK_ENV:
    oracle_sk = ORACLE_SK_ENV
    # We need the PK too. Ideally it's in env or we derive it.
    # For MVP, if SK is provided, we assume PK is also provided or we regen (which changes SK).
    # Let's just regen if not fully configured, or assume keygen outputs both.
    # To keep it simple: always regen on startup unless specific file exists, 
    # OR just regen every time for this demo since we print the PK.
    pass 

# Always generate a new keypair for this session to ensure we have a valid matching pair
print("Generating new PQC (ML-DSA-87) Oracle Keypair...")
output = run_signer(["keygen"])
# Output: sk_b64 pk_b64
parts = output.split()
if len(parts) == 2:
    oracle_sk = parts[0]
    oracle_pk = parts[1]
    print(f"AI Oracle Public Key (Base64): {oracle_pk}")
else:
    print("Failed to generate keys")

class TxInput(BaseModel):
    hash: str
    from_addr: str = ""
    to: str
    amount: int
    fee: int
    nonce: int

    class Config:
        fields = {'from_addr': 'from'}

class AiScoreReq(BaseModel):
    hash: str
    pass

@app.post("/score")
async def score_transaction(
    request: Request,
    model_id: Optional[str] = "risk-v1",
    x_dlx_client_ts: Optional[str] = Header(None),
    x_dlx_client_sig: Optional[str] = Header(None),
    x_dlx_client_pk: Optional[str] = Header(None)
):
    # 1. Parse Body
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    tx_hash = body.get("hash")
    if not tx_hash:
        raise HTTPException(status_code=400, detail="Missing tx hash")

    # 2. Simulate AI Processing
    seed_val = sum(ord(c) for c in tx_hash)
    random.seed(seed_val)
    
    if random.random() > 0.9:
        risk_score = random.uniform(0.7, 0.99)
    else:
        risk_score = random.uniform(0.01, 0.3)
        
    risk_score = round(risk_score, 4)

    # 3. Sign Response with PQC
    # Payload: tx_hash:score:model_id
    payload = f"{tx_hash}:{risk_score}:{model_id}"
    signature_b64 = run_signer(["sign", oracle_sk, payload])

    # 4. Return Response
    return {
        "score": risk_score,
        "tx_hash": tx_hash,
        "model_id": model_id,
        "ts": int(time.time()),
        "signature": signature_b64
    }

@app.get("/health")
def health():
    return {"status": "ok", "oracle_pk": oracle_pk, "algorithm": "ML-DSA-87"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7001)
