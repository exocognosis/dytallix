import os
import time
from collections import deque
from typing import Any, Deque, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import asyncio

APP_VERSION = "v0.1.0"

PORT = int(os.getenv("PORT", "8090"))
RPC_URL = os.getenv("RPC_URL", "")
FEATURE_WINDOW = int(float(os.getenv("FEATURE_WINDOW", "200")))
ALERT_THRESHOLD = float(os.getenv("ALERT_THRESHOLD", "0.8"))
SINK_URL = os.getenv("SINK_URL", "")

app = FastAPI(title="PulseGuard", version=APP_VERSION)


class Tx(BaseModel):
    hash: Optional[str] = None
    from_: Optional[str] = Field(default=None, alias="from")
    to: Optional[str] = None
    value: float = 0.0
    gas: int = 0
    timestamp: Optional[int] = None
    nonce: Optional[int] = None

    class Config:
        allow_population_by_field_name = True


class ScoreRequest(BaseModel):
    tx: Optional[Tx] = None
    batch: Optional[List[Tx]] = None


class Explainability(BaseModel):
    top_features: List[str] = []
    dag_paths: List[List[str]] = []
    graph_metrics: Dict[str, float] = {}


class Attestation(BaseModel):
    checksum: str
    alg: str
    signature: Optional[str] = None


class ScoreResponse(BaseModel):
    score: float
    label: str
    reasons: List[str]
    explainability: Explainability
    attestation: Attestation


class Pipeline:
    def __init__(self, window: int = 200):
        self.window = window
        self._buf: Deque[Dict[str, float]] = deque(maxlen=window)

    @staticmethod
    def features(tx: Tx) -> Dict[str, float]:
        # Base features; normalized to simple magnitudes
        return {
            "value": float(tx.value or 0.0),
            "gas": float(tx.gas or 0),
            "is_external": 1.0 if (tx.from_ and tx.from_.startswith("0x")) else 0.0,
        }

    def _score_given_history(self, feats: Dict[str, float]) -> float:
        # Compute mean/var across existing history ONLY (no leakage of current sample).
        if not self._buf:
            return 0.0
        keys = feats.keys()
        n = len(self._buf)
        means: Dict[str, float] = {k: 0.0 for k in keys}
        for row in self._buf:
            for k in keys:
                means[k] += row.get(k, 0.0)
        for k in keys:
            means[k] /= n
        vars_: Dict[str, float] = {k: 0.0 for k in keys}
        for row in self._buf:
            for k in keys:
                d = row.get(k, 0.0) - means[k]
                vars_[k] += d * d
        for k in keys:
            vars_[k] = vars_[k] / max(1, n - 1)
        score_parts: List[float] = []
        for k in keys:
            mu = means[k]
            sigma = (vars_[k] ** 0.5) if vars_[k] > 0 else 1.0
            z = abs((feats.get(k, 0.0) - mu) / sigma)
            s = 1.0 - (1.0 / (1.0 + (z)))
            score_parts.append(max(0.0, min(1.0, s)))
        return sum(score_parts) / max(1, len(score_parts))

    def update_and_score(self, feats: Dict[str, float]) -> float:
        # Score against prior history, then update buffer with current sample.
        score = self._score_given_history(feats)
        self._buf.append(feats)
        return score


PIPE = Pipeline(window=FEATURE_WINDOW)
SINKS: List[str] = []
if SINK_URL:
    SINKS.append(SINK_URL)


def heuristics(tx: Tx) -> List[str]:
    reasons: List[str] = []
    if tx.value and tx.value > 100.0:
        reasons.append("high_value_transfer")
    if tx.gas and tx.gas > 1_000_000:
        reasons.append("unusually_high_gas")
    if tx.to is None:
        reasons.append("contract_creation_or_missing_to")
    return reasons


async def dispatch_alert(payload: Dict[str, Any]) -> None:
    try:
        import httpx
    except Exception:
        return
    async with httpx.AsyncClient(timeout=2.0) as client:
        for url in list(SINKS):
            try:
                await client.post(url, json=payload)
            except Exception:
                continue


@app.get("/health")
async def health() -> JSONResponse:
    return JSONResponse({"status": "ok", "version": APP_VERSION})


@app.post("/score", response_model=ScoreResponse)
async def score_endpoint(body: ScoreRequest) -> ScoreResponse:
    if not body.tx and not body.batch:
        raise HTTPException(status_code=400, detail="missing tx or batch")

    from .detector.graph.dag_builder import build_interaction_dag, find_multi_hop_paths
    from .detector.stream.features import temporal_structural_embeddings
    from .detector.ml.classifier import score_batch as clf_score_batch
    from .detector.ml.ensemble import combine_scores
    from .detector.explainability.metadata import top_feature_reasons, subgraph_context
    from .detector.pqc.attestation import pqc_attest

    txs: List[Tx] = []
    if body.tx is not None:
        txs.append(body.tx)
    if body.batch:
        txs.extend(body.batch)

    # Features and anomaly scores
    features = temporal_structural_embeddings([t.model_dump(by_alias=True) for t in txs])
    anomaly_scores: List[float] = []
    reasons: List[str] = []
    for t in txs:
        feats = PIPE.features(t)
        anomaly_scores.append(PIPE.update_and_score(feats))
        reasons.extend(heuristics(t))

    # Classifier scores
    clf_scores = clf_score_batch(features)

    # Graph-based score
    dag = build_interaction_dag([t.model_dump(by_alias=True) for t in txs])
    paths = find_multi_hop_paths(dag, min_hops=3, max_paths=5)
    graph_score = 0.0
    try:
        deg_c = float(dag.get("metrics", {}).get("avg_degree_centrality", 0.0))
        path_flag = 1.0 if paths else 0.0
        graph_score = max(0.0, min(1.0, 0.5 * deg_c + 0.5 * path_flag))
    except Exception:
        graph_score = 0.0

    # Ensemble
    score, ensemble_reasons = combine_scores(anomaly_scores, clf_scores, graph_score)
    all_reasons = list(sorted(set(reasons + ensemble_reasons)))
    label = "alert" if score >= ALERT_THRESHOLD or all_reasons else "normal"

    explain = {
        "top_features": top_feature_reasons(features),
        "dag_paths": subgraph_context(paths),
        "graph_metrics": dag.get("metrics", {}),
    }

    core = {"score": score, "label": label, "reasons": all_reasons, "explainability": explain}
    attest = pqc_attest(core)

    if label == "alert" and SINKS:
        asyncio.create_task(dispatch_alert({"type": "pulseguard.alert", "data": core, "attestation": attest}))

    return ScoreResponse(score=score, label=label, reasons=all_reasons, explainability=Explainability(**explain), attestation=Attestation(**attest))


class WebhookReq(BaseModel):
    url: str


@app.post("/stream/webhook")
async def register_webhook(body: WebhookReq) -> JSONResponse:
    url = body.url.strip()
    if not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(status_code=400, detail="invalid url")
    if url not in SINKS:
        SINKS.append(url)
    return JSONResponse({"registered": url})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
