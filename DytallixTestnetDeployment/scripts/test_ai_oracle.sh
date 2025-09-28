#!/usr/bin/env bash

# Automated validation for the AI oracle integration.
# - Generates or reuses 10 transactions
# - Queries the Express proxy and/or the microservice directly
# - Records latency metrics and fallback behaviour under readiness_out/

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
LOG_DIR="${ROOT_DIR}/readiness_out"
LAT_LOG="${LOG_DIR}/ai_oracle_latency.log"
FALLBACK_LOG="${LOG_DIR}/ai_oracle_fallback.log"

SERVER_BASE=${SERVER_BASE:-http://localhost:8787}
SERVER_STATUS_URL="${SERVER_BASE%/}/api/status"
SERVER_RISK_BASE="${SERVER_BASE%/}/api/ai/risk/transaction"
AI_URL=${AI_ORACLE_URL:-http://localhost:8080/api/ai/risk}
AI_HEALTH_URL=${AI_HEALTH_URL:-http://localhost:8080/health}

mkdir -p "${LOG_DIR}"
: >"${LAT_LOG}"
: >"${FALLBACK_LOG}"

log() {
  local msg=$1
  printf '%s %s\n' "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")]" "$msg"
}

wait_for_endpoint() {
  local url=$1
  local method=${2:-GET}
  local attempts=${3:-30}
  for ((i=1; i<=attempts; i++)); do
    if curl -sSf --max-time 3 -X "$method" "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

random_hash() {
  python - <<'PY'
import secrets
print('0x' + secrets.token_hex(32))
PY
}

build_payload() {
  local hash=$1
  python - "$hash" <<'PY'
import json
import random
import secrets
import sys

rng = random.SystemRandom()
tx_hash = sys.argv[1]
amount = rng.randint(1, 1000) * 1_000_000
fee = max(1000, int(amount * rng.uniform(0.001, 0.02)))
payload = {
    "tx_hash": tx_hash,
    "amount": amount,
    "fee": fee,
    "from": "dyt1" + secrets.token_hex(20),
    "to": "dyt1" + secrets.token_hex(20),
    "nonce": rng.randint(0, 5000),
}
print(json.dumps(payload))
PY
}

parse_latency_ms() {
  local seconds=$1
  python - "$seconds" <<'PY'
import sys
try:
    seconds = float(sys.argv[1])
except Exception:
    seconds = 0.0
print(f"{seconds * 1000:.0f}")
PY
}

parse_proxy_response() {
  python - <<'PY'
import json
import sys
try:
    data = json.load(sys.stdin)
except Exception:
    print('error|')
    raise SystemExit(0)
status = data.get('risk_status', 'unknown')
score = data.get('ai_risk_score')
print(f"{status}|{'' if score is None else score}")
PY
}

parse_microservice_response() {
  python - <<'PY'
import json
import sys
try:
    data = json.load(sys.stdin)
except Exception:
    print('|')
    raise SystemExit(0)
score = data.get('score')
print('' if score is None else score)
PY
}

log "AI oracle validation starting"
if wait_for_endpoint "$SERVER_STATUS_URL" GET 20; then
  log "Server reachable at $SERVER_STATUS_URL"
else
  log "WARNING: server status endpoint not reachable within timeout"
fi
if wait_for_endpoint "$AI_HEALTH_URL" GET 20; then
  log "AI microservice healthy at $AI_HEALTH_URL"
else
  log "WARNING: AI microservice health endpoint not reachable within timeout"
fi

# Gather up to 10 transaction hashes from the explorer proxy
mapfile -t ledger_hashes < <(
  curl -sSf --max-time 5 "${SERVER_BASE%/}/api/transactions?limit=20" 2>/dev/null \
    | python - <<'PY'
import json
import sys
try:
    data = json.load(sys.stdin)
except Exception:
    raise SystemExit(0)
seen = set()
for tx in data.get('transactions', []):
    tx_hash = tx.get('hash')
    if tx_hash and tx_hash not in seen:
        seen.add(tx_hash)
        print(tx_hash)
PY
) || true

declare -a entries=()
declare -A seen=()
for hash in "${ledger_hashes[@]}"; do
  [[ -n "$hash" ]] || continue
  if [[ -z ${seen[$hash]:-} ]]; then
    entries+=("ledger:$hash")
    seen[$hash]=1
  fi
  [[ ${#entries[@]} -ge 10 ]] && break
done

while [[ ${#entries[@]} -lt 10 ]]; do
  hash=$(random_hash)
  [[ -n "$hash" && -z ${seen[$hash]:-} ]] || continue
  entries+=("synthetic:$hash")
  seen[$hash]=1
  [[ ${#entries[@]} -ge 10 ]] && break
done

log "Prepared ${#entries[@]} transactions (ledger: ${#ledger_hashes[@]}, synthetic: $(( ${#entries[@]} - ${#ledger_hashes[@]} )))"

success_latencies=()
for entry in "${entries[@]}"; do
  IFS=':' read -r source hash <<<"$entry"
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  if [[ $source == "ledger" ]]; then
    tmp=$(mktemp)
    status_time=$(curl -sS --max-time 5 -w '%{http_code} %{time_total}' -o "$tmp" "${SERVER_RISK_BASE%/}/$hash" || echo "000 0")
    read -r http_code elapsed <<<"$status_time"
    body=$(cat "$tmp")
    rm -f "$tmp"
    latency_ms=$(parse_latency_ms "$elapsed")
    if [[ "$http_code" != "200" ]]; then
      echo "[$timestamp] hash=$hash source=ledger http_status=$http_code latency_ms=$latency_ms body=$(echo "$body" | tr '\n' ' ' | cut -c1-200)" >>"$FALLBACK_LOG"
      continue
    fi
    risk_info=$(printf '%s' "$body" | parse_proxy_response)
    risk_status=${risk_info%%|*}
    score=${risk_info#*|}
    if [[ "$risk_status" == "unavailable" || "$risk_status" == "error" ]]; then
      echo "[$timestamp] hash=$hash source=ledger risk_status=$risk_status latency_ms=$latency_ms body=$(echo "$body" | tr '\n' ' ' | cut -c1-200)" >>"$FALLBACK_LOG"
    else
      success_latencies+=("$latency_ms")
      echo "[$timestamp] hash=$hash source=ledger latency_ms=$latency_ms score=${score:-null}" >>"$LAT_LOG"
    fi
  else
    payload=$(build_payload "$hash")
    tmp=$(mktemp)
    status_time=$(curl -sS --max-time 5 -w '%{http_code} %{time_total}' -o "$tmp" -H 'content-type: application/json' -d "$payload" "$AI_URL" || echo "000 0")
    read -r http_code elapsed <<<"$status_time"
    body=$(cat "$tmp")
    rm -f "$tmp"
    latency_ms=$(parse_latency_ms "$elapsed")
    if [[ "$http_code" != "200" ]]; then
      echo "[$timestamp] hash=$hash source=synthetic http_status=$http_code latency_ms=$latency_ms body=$(echo "$body" | tr '\n' ' ' | cut -c1-200)" >>"$FALLBACK_LOG"
      continue
    fi
    score=$(printf '%s' "$body" | parse_microservice_response)
    success_latencies+=("$latency_ms")
    echo "[$timestamp] hash=$hash source=synthetic latency_ms=$latency_ms score=${score:-null}" >>"$LAT_LOG"
  fi
done

if [[ ${#success_latencies[@]} -gt 0 ]]; then
  median_ms=$(python - <<'PY' "${success_latencies[@]}"
import statistics
import sys
values = [float(v) for v in sys.argv[1:]]
if not values:
    print('0')
else:
    print(f"{statistics.median(values):.2f}")
PY
)
  log "Median latency across successful queries: ${median_ms} ms" | tee -a "$LAT_LOG"
fi

log "Latency log written to $LAT_LOG"
if [[ -s "$FALLBACK_LOG" ]]; then
  log "Fallback events captured in $FALLBACK_LOG"
else
  log "No fallback events recorded"
fi
