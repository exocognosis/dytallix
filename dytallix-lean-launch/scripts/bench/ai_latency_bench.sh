#!/usr/bin/env bash
set -euo pipefail

# Bench 300 POST /ai/score requests @ ~5 rps, record per-request latency.
# Artifacts: dytallix-lean-launch/launch-evidence/ai/{latency_run.jsonl, latency_summary.json, sample_receipts.json}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
API_BASE="${API_BASE:-http://localhost:3030}"
OUT_DIR="$ROOT_DIR/dytallix-lean-launch/launch-evidence/ai"
mkdir -p "$OUT_DIR" || true

TOTAL=${TOTAL:-300}
RPS=${RPS:-5}
SLEEP=$(awk -v rps="$RPS" 'BEGIN { printf "%.3f", 1.0/rps }')

RUN_FILE="$OUT_DIR/latency_run.jsonl"
SUMMARY_FILE="$OUT_DIR/latency_summary.json"
SAMPLES_FILE="$OUT_DIR/sample_receipts.json"
:> "$RUN_FILE"

hash_tx() {
  # Simple deterministic fake hash for index
  printf "0x%064x" "$1"
}

for i in $(seq 1 "$TOTAL"); do
  TX_HASH=$(hash_tx "$i")
  FROM="dyt1benchsender000000"
  TO="dyt1benchrcpt000000"
  AMOUNT=$((1000 + (i % 100)))
  FEE=$((100 + (i % 10)))
  NONCE=$i
  BODY=$(jq -c --null-input --arg h "$TX_HASH" '{tx:{hash:$h, from:"'"$FROM"'", to:"'"$TO"'", amount:1000, fee:100, nonce:1}, model_id:"risk-v1"}')

  T0=$(python3 - <<'PY'
import time
print(int(time.time()*1000))
PY
)
  HTTP=0
  RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/ai/score" -H 'content-type: application/json' -d "$BODY" || true)
  HTTP=$(printf '%s\n' "$RESP" | tail -n1)
  BODY_R=$(printf '%s\n' "$RESP" | sed '$d')
  T1=$(python3 - <<'PY'
import time
print(int(time.time()*1000))
PY
)
  LAT=$((T1 - T0))
  printf '{"i":%d,"tx_hash":"%s","http":%d,"lat_ms":%d}\n' "$i" "$TX_HASH" "$HTTP" "$LAT" >> "$RUN_FILE"
  sleep "$SLEEP"
done

# Compute summary
python3 - "$RUN_FILE" "$SUMMARY_FILE" << 'PY'
import sys, json
xs=[]
for ln in open(sys.argv[1]):
    try:
        xs.append(json.loads(ln.strip()))
    except: pass
lat=[x['lat_ms'] for x in xs if x.get('http')==200]
lat.sort()
def pct(p):
    if not lat: return None
    import math
    k = int(round((p/100.0)*(len(lat)-1)))
    return lat[k]
avg = sum(lat)/len(lat) if lat else None
out={
  'total': len(xs),
  'ok': sum(1 for x in xs if x.get('http')==200),
  'avg_ms': avg,
  'p95_ms': pct(95),
}
open(sys.argv[2],'w').write(json.dumps(out, indent=2))
print(json.dumps(out))
PY

# Sample receipts for first 10
TXS=$(jq -r 'select(.http==200) | .tx_hash' "$RUN_FILE" | head -n 10)
{
  echo '['
  first=1
  for h in $TXS; do
    [ $first -eq 1 ] || echo ','
    curl -s "$API_BASE/tx/$h"
    first=0
  done
  echo ']'
} > "$SAMPLES_FILE"

echo "Bench complete. Artifacts in $OUT_DIR"

