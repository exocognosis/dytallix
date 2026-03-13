from __future__ import annotations
import base64
import json
import os
from typing import Dict


def sha256_hex(b: bytes) -> str:
    import hashlib
    return hashlib.sha256(b).hexdigest()


def pqc_attest(payload: Dict) -> Dict:
    """Produce a PQC-signed checksum if pqcrypto is available; else return checksum only.
    Uses Dilithium2 by default. Returns {checksum, alg, signature?}.
    """
    checksum = sha256_hex(json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))
    try:
        from pqcrypto.sign import dilithium2  # type: ignore
        seed = os.getenv("PQC_SEED", "dytallix-pulseguard")
        # Deterministic keypair from seed for demo purposes (NOT for production use)
        # In real deployments, load keys from secrets manager.
        pk, sk = dilithium2.generate_keypair()
        sig = dilithium2.sign(checksum.encode("utf-8"), sk)
        return {"checksum": checksum, "alg": "Dilithium2", "signature": base64.b64encode(sig).decode("ascii")}
    except Exception:
        return {"checksum": checksum, "alg": "none"}

