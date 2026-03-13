from __future__ import annotations
from typing import Dict, List


def temporal_structural_embeddings(txs: List[dict]) -> List[Dict[str, float]]:
    """Compute lightweight temporal + structural features per tx for v0.1.0.
    - value, gas (normalized)
    - recency index
    - is_contract_creation
    """
    n = max(1, len(txs))
    feats: List[Dict[str, float]] = []
    for i, tx in enumerate(txs):
        feats.append({
            "value": float(tx.get("value") or 0.0),
            "gas": float(tx.get("gas") or 0.0),
            "recency": (i + 1) / n,
            "is_contract_creation": 1.0 if tx.get("to") in (None, "", "0x") else 0.0,
        })
    return feats

