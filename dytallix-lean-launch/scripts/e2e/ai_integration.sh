#!/usr/bin/env bash
set -euo pipefail

# Simple integration: 10 sample tx -> /ai/score persisted -> /tx/{hash} shows ai_risk_score

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
API_BASE="${API_BASE:-http://localhost:3030}"
OUT_DIR="$ROOT_DIR/dytallix-lean-launch/launch-evidence/ai"
mkdir -p "$OUT_DIR"

hash_tx() { printf "0x%064x" "$1"; }

OK=0
for i in $(seq 1 10); do
  TX_HASH=$(hash_tx "$i")
  BODY=$(jq -c --null-input --arg h "$TX_HASH" '{tx:{hash:$h, from:"dyt1aiintsender", to:"dyt1aiintdst", amount:1000, fee:100, nonce:1}, model_id:"risk-v1"}')
  curl -s -X POST "$API_BASE/ai/score" -H 'content-type: application/json' -d "$BODY" >/dev/null || true
  sleep 0.1
  R=$(curl -s "$API_BASE/tx/$TX_HASH" || true)
  SCORE=$(printf '%s' "$R" | jq -r '(.ai_risk_score // empty)')
  if [ -n "$SCORE" ]; then OK=$((OK+1)); fi
done

printf '{"requested":10,"with_risk":%d}\n' "$OK" > "$OUT_DIR/sample_receipts.json"
echo "Integration complete: $OK/10 receipts with ai_risk_score"

