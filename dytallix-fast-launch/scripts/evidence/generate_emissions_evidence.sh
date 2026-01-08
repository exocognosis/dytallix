#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
EVDIR="$BASE_DIR/launch-evidence/emissions"
RPC_URL="${RPC_HTTP_URL:-http://localhost:3030}"

mkdir -p "$EVDIR"

echo "[emissions] collecting latest rewards window from node…"
curl -sf "$RPC_URL/api/rewards?limit=50" | jq '.' > "$EVDIR/emissions_run.log" || echo '{}' > "$EVDIR/emissions_run.log"

echo "[emissions] snapshotting a few balances (udrt) after emission…"
ADDRESSES=("dyt1alpha000000000000000000000" "dyt1beta000000000000000000000" "dyt1gamma0000000000000000000")
{
  echo '{'
  echo '  "balances": {'
  FIRST=1
  for A in "${ADDRESSES[@]}"; do
    BAL_JSON=$(curl -sf "$RPC_URL/balance/$A" || echo '{}')
    if [ "$FIRST" != 1 ]; then echo ','; fi
    echo -n "    \"$A\": $BAL_JSON"
    FIRST=0
  done
  echo ''
  echo '  }'
  echo '}'
} > "$EVDIR/balances_after.json"

echo "[emissions] wrote: $EVDIR/emissions_run.log and $EVDIR/balances_after.json"

