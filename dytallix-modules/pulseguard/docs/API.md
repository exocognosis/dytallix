# PulseGuard MVP API Documentation

## Overview

PulseGuard provides real-time anomaly and fraud detection for blockchain transactions with a target P95 latency of <100ms.

## Base URL

```
http://localhost:8088
```

## Authentication

Requests must include HMAC-SHA256 signature in the `X-HMAC-Signature` header.

```bash
# Generate HMAC signature
echo -n "$REQUEST_BODY" | openssl dgst -sha256 -hmac "$HMAC_KEY" | cut -d' ' -f2
```

## Endpoints

### Health Check

```http
GET /healthz
```

**Response:**
```json
{
  "status": "healthy",
  "version": "0.1.0", 
  "uptime_seconds": 1234.5,
  "checks": {
    "ensemble_model": true,
    "security_manager": true,
    "telemetry": true
  }
}
```

### Score Transaction

```http
POST /score
Content-Type: application/json
X-HMAC-Signature: <hmac_signature>
```

**Request Body:**
```json
{
  "tx_hash": "0x1234567890abcdef..."
}
```

**Response:**
```json
{
  "score": 0.85,
  "reasons": [
    "PG.FLASH.CHAINBURST.K1",
    "PG.MODEL.IF.HIGH"
  ],
  "sub_scores": {
    "isolation_forest": 0.92,
    "gbdt": 0.78,
    "graph": 0.65,
    "temporal": 0.88
  },
  "version": "v0_1_0",
  "latency_ms": 45,
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": 1699999999
}
```

### Batch Scoring

```http
POST /score
Content-Type: application/json
```

**Request Body:**
```json
{
  "transactions": [
    {
      "hash": "0x123...",
      "from": "0xabc...",
      "to": "0xdef...",
      "value": 1.5,
      "gas": 21000,
      "timestamp": 1699999999
    }
  ]
}
```

### System Status

```http
GET /status
```

**Response:**
```json
{
  "mode": "live",
  "models": [
    {
      "version": "v0_1_0",
      "type": "ensemble", 
      "trained": true,
      "last_trained": 1699999999,
      "performance": {
        "auc": 0.85
      }
    }
  ],
  "connectors": {
    "mempool": true,
    "blocks": true
  },
  "queue_sizes": {
    "mempool": 15
  },
  "processed_counts": {
    "transactions": 1234567
  }
}
```

### Metrics (Prometheus)

```http
GET /metrics
```

Returns Prometheus-formatted metrics including:

- `pg_api_latency_seconds` - API request latency histogram
- `pg_score_distribution` - Anomaly score distribution 
- `pg_detector_counts_total` - Detector trigger counts by reason code
- `pg_model_version_info` - Model version information
- `pg_queue_lag` - Data pipeline queue lag
- `pg_block_gap` - Block processing gap

## Reason Codes

### Flash Loan Detectors
- `PG.FLASH.CHAINBURST.K1` - Single-block burst with repay pattern
- `PG.FLASH.VOLSPIKE.K1` - Volume spike above baseline
- `PG.FLASH.REPAY.K1` - Rapid repay pattern detected
- `PG.FLASH.SAMEORIGIN.K1` - Same-origin burst activity

### Mint/Burn Detectors  
- `PG.MINT.SPIKE.K1` - Mint volume spike > Nσ above baseline
- `PG.BURN.SPIKE.K1` - Burn volume spike detected
- `PG.MINT.RATIO.K1` - Unusual mint/burn ratio
- `PG.MINT.COORDINATED.K1` - Coordinated activity across tokens

### Bridge Detectors
- `PG.BRIDGE.SEQ.K2` - Bridge sequence pattern within time window
- `PG.BRIDGE.HOPS.K1` - Rapid bridge hops detected
- `PG.BRIDGE.HIGHVAL.K1` - High-value bridge transfer
- `PG.BRIDGE.PREP.K1` - Cross-chain preparation pattern

### Graph Detectors
- `PG.GRAPH.CYCLE.K1` - Suspicious cycle length ≤ 4 detected
- `PG.GRAPH.HIGHCONN.K1` - High connectivity pattern

### Model Detectors
- `PG.MODEL.IF.HIGH` - IsolationForest high anomaly score
- `PG.MODEL.GBDT.HIGH` - GBDT probability above threshold
- `PG.ENSEMBLE.ANOMALY.HIGH` - Ensemble anomaly component high
- `PG.ENSEMBLE.CLASSIFIER.HIGH` - Ensemble classifier component high
- `PG.ENSEMBLE.GRAPH.HIGH` - Ensemble graph component high

### Temporal Detectors
- `PG.TEMPORAL.BURST.K1` - Temporal burst pattern detected

## Error Codes

- `400` - Bad Request (invalid input)
- `401` - Unauthorized (invalid HMAC signature)
- `500` - Internal Server Error
- `503` - Service Unavailable (dependencies down)

## Rate Limits

No explicit rate limits, but P95 latency target of <100ms may effectively limit throughput based on available resources.

## Examples

### Score a transaction hash

```bash
curl -X POST http://localhost:8088/score \
  -H "Content-Type: application/json" \
  -H "X-HMAC-Signature: $(echo -n '{"tx_hash":"0x123..."}' | openssl dgst -sha256 -hmac 'your_hmac_key' | cut -d' ' -f2)" \
  -d '{"tx_hash": "0x1234567890abcdef1234567890abcdef12345678"}'
```

### Health check

```bash
curl http://localhost:8088/healthz | jq .
```

### Get metrics

```bash
curl http://localhost:8088/metrics
```