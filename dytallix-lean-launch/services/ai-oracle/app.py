from __future__ import annotations

import hashlib
import json
import os
import random
import time
from typing import Optional

from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest

APP_START = time.time()

app = FastAPI(title="Dytallix AI Oracle", version="0.1.0")

MODEL_ID = os.environ.get("AI_MODEL_ID", "risk-v1")
MAX_LATENCY_MS = int(os.environ.get("AI_MAX_LATENCY_MS", "750"))
MIN_LATENCY_MS = int(os.environ.get("AI_MIN_LATENCY_MS", "25"))

ai_requests_total = Counter(
    "ai_oracle_microservice_requests_total",
    "Total requests served by the AI oracle microservice",
    labelnames=("outcome",),
)
ai_latency_seconds = Histogram(
    "ai_oracle_microservice_latency_seconds",
    "Latency observed by the AI oracle microservice",
    buckets=(0.01, 0.025, 0.05, 0.1, 0.2, 0.35, 0.5, 0.75, 1.0, 1.5, 2.0),
)
ai_failures_total = Counter(
    "ai_oracle_microservice_failures_total",
    "Total failed scoring attempts handled by the AI oracle microservice",
    labelnames=("reason",),
)
service_health = Gauge(
    "ai_oracle_microservice_up",
    "Indicates whether the AI oracle microservice has finished startup",
)
service_health.set(1)


class RiskRequest(BaseModel):
    tx_hash: str = Field(..., description="Transaction hash")
    amount: Optional[float] = Field(0, ge=0)
    fee: Optional[float] = Field(0, ge=0)
    sender: Optional[str] = Field(None, alias="from")
    recipient: Optional[str] = Field(None, alias="to")
    nonce: Optional[int] = Field(default=0, ge=0)

    model_config = {
        "populate_by_name": True,
        "extra": "ignore",
    }


class RiskResponse(BaseModel):
    tx_hash: str
    score: float
    model_id: str
    timestamp: int
    latency_ms: int
    signature: Optional[str] = None


def _pseudo_signature(tx_hash: str, score: float) -> str:
    digest = hashlib.sha256(f"{tx_hash}:{score}:{MODEL_ID}".encode("utf-8")).digest()
    return hashlib.sha256(digest).hexdigest()


@app.get("/health")
def health() -> dict[str, object]:
    return {"ok": True, "uptime": time.time() - APP_START}


@app.get("/metrics")
def metrics() -> Response:
    payload = generate_latest()
    return Response(payload, media_type=CONTENT_TYPE_LATEST)


@app.post("/api/ai/risk", response_model=RiskResponse)
def post_risk(request: RiskRequest) -> RiskResponse:
    started = time.perf_counter()

    if not request.tx_hash:
        ai_failures_total.labels(reason="invalid").inc()
        ai_requests_total.labels(outcome="invalid").inc()
        raise HTTPException(status_code=400, detail="tx_hash is required")

    entropy = hashlib.sha256(request.tx_hash.encode("utf-8")).digest()
    base_score = entropy[0] / 255
    fee_factor = 0.0
    if request.amount and request.amount > 0:
        fee_ratio = (request.fee or 0) / request.amount
        fee_factor = max(0.0, min(1.0, fee_ratio))
    # Weighted blend to keep scores between 0 and 1
    adjusted = 0.65 * base_score + 0.35 * (1.0 - fee_factor)
    score = max(0.0, min(1.0, round(adjusted, 4)))

    simulated_delay_ms = 0
    if MAX_LATENCY_MS > 0:
        # Random jitter between MIN and MAX latency bounds
        simulated_delay_ms = random.randint(min(MIN_LATENCY_MS, MAX_LATENCY_MS), MAX_LATENCY_MS)
        time.sleep(simulated_delay_ms / 1000.0)

    ai_requests_total.labels(outcome="ok").inc()
    ai_latency_seconds.observe(time.perf_counter() - started)

    return RiskResponse(
        tx_hash=request.tx_hash,
        score=score,
        model_id=MODEL_ID,
        timestamp=int(time.time()),
        latency_ms=simulated_delay_ms,
        signature=_pseudo_signature(request.tx_hash, score),
    )


@app.exception_handler(Exception)
def on_exception(_: object, exc: Exception) -> Response:
    if isinstance(exc, HTTPException):
        detail = exc.detail if isinstance(exc.detail, (str, dict)) else str(exc.detail)
        if isinstance(detail, dict):
            payload = detail
        else:
            payload = {"error": "HTTPException", "message": detail}
        return JSONResponse(status_code=exc.status_code, content=payload)

    ai_failures_total.labels(reason=exc.__class__.__name__).inc()
    ai_requests_total.labels(outcome="error").inc()
    payload = {"error": exc.__class__.__name__, "message": str(exc)}
    return Response(json.dumps(payload), status_code=500, media_type="application/json")
