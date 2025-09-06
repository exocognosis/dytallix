#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
EVDIR="$BASE_DIR/launch-evidence/ai"
RPC_URL="${RPC_HTTP_URL:-http://localhost:3030}"

mkdir -p "$EVDIR"

echo "[ai] checking service health & latency…"
curl -sf "$RPC_URL/ai/latency" | jq '.' > "$EVDIR/ai_service_health.json" || echo '{}' > "$EVDIR/ai_service_health.json"

echo "[ai] submitting sample analysis…"
cat > /tmp/ai_req.json <<EOF
{
  "tx": {"hash": "0x$(openssl rand -hex 32)", "from": "dyt1testaddr0000000", "to": "dyt1testaddr1111111", "amount": 1234, "fee": 10, "nonce": 1},
  "model_id": "risk-v1"
}
EOF
curl -sf -X POST "$RPC_URL/ai/score" -H 'content-type: application/json' --data-binary @/tmp/ai_req.json | jq '.' > "$EVDIR/sample_analysis.json" || echo '{}' > "$EVDIR/sample_analysis.json"

echo "[ai] writing latency report…"
date -Is >> "$EVDIR/latency_report.log"
curl -sf "$RPC_URL/ai/latency" >> "$EVDIR/latency_report.log" || echo '{}' >> "$EVDIR/latency_report.log"

echo "[ai] wrote evidence under $EVDIR"

