#!/usr/bin/env sh
set -eu

# Environment
# RPC: Node RPC base (default http://dytallix-node:3030)
# SCHEDULE: Path to emissions_schedule.yaml
# LOG_DIR: Directory for audit logs (default /var/log/dytallix-emissions)

RPC="${RPC:-http://dytallix-node:3030}"
SCHEDULE="${SCHEDULE:-/etc/dyt/emissions/schedule.yaml}"
LOG_DIR="${LOG_DIR:-/var/log/dytallix-emissions}"
DATE="$(date -u +%Y%m%d)"
LOG_FILE="$LOG_DIR/$DATE.log"

mkdir -p "$LOG_DIR"
touch "$LOG_FILE"

need() { command -v "$1" >/dev/null 2>&1 || { echo "missing $1" >&2; exit 1; }; }
need curl; need jq; need yq

ts() { date -u +%Y-%m-%dT%H:%M:%SZ; }

log_json() {
  # args: status, msg (kv JSON on stdin merged)
  STATUS="$1"; shift
  EXTRA="$1"; shift || true
  printf '{"ts":"%s","status":"%s",%s}\n' "$(ts)" "$STATUS" "$EXTRA" >> "$LOG_FILE"
}

echo "[emissions] Using RPC=$RPC SCHEDULE=$SCHEDULE LOG_FILE=$LOG_FILE"

# Fetch current chain height
HEIGHT=$(curl -fsS "$RPC/api/stats" | jq -r '.height // 0')
echo "[emissions] Current height: $HEIGHT"

# Iterate schedule entries with height <= current height
COUNT=$(yq '.entries | length' "$SCHEDULE" 2>/dev/null || echo 0)
if [ "$COUNT" -eq 0 ]; then
  echo "[emissions] No schedule entries found"
  exit 0
fi

APPLIED=0
for i in $(seq 0 $((COUNT-1))); do
  entry_height=$(yq ".entries[$i].height" "$SCHEDULE")
  pool=$(yq -r ".entries[$i].pool // \"staking_rewards\"" "$SCHEDULE")
  to=$(yq -r ".entries[$i].to" "$SCHEDULE")
  amount=$(yq -r ".entries[$i].amount_udrt" "$SCHEDULE")

  # Skip if beyond height
  if [ "$entry_height" -gt "$HEIGHT" ]; then
    continue
  fi

  # Idempotency key
  key="$entry_height:$pool:$to:$amount"
  if grep -R "\"key\":\"$key\"" "$LOG_DIR" >/dev/null 2>&1; then
    echo "[emissions] Skip already applied: $key"
    continue
  fi

  # Apply claim via RPC
  body=$(printf '{"pool":"%s","amount":%s,"to":"%s"}' "$pool" "$amount" "$to")
  resp=$(curl -fsS -X POST "$RPC/emission/claim" -H 'content-type: application/json' -d "$body" || true)
  code=$?
  if [ $code -eq 0 ]; then
    remaining=$(echo "$resp" | jq -r '.remaining // empty' 2>/dev/null || true)
    log_json ok "\"key\":\"$key\",\"height\":$entry_height,\"pool\":\"$pool\",\"to\":\"$to\",\"amount_udrt\":$amount,\"remaining\":\"$remaining\""
    APPLIED=$((APPLIED+1))
  else
    log_json error "\"key\":\"$key\",\"height\":$entry_height,\"pool\":\"$pool\",\"to\":\"$to\",\"amount_udrt\":$amount,\"error\":\"claim_failed\""
  fi
done

echo "[emissions] Applied $APPLIED entries up to height $HEIGHT"

