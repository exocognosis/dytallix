#!/usr/bin/env bash
set -euo pipefail
HOST="${HOST:-localhost}"
PORT="${PORT:-4000}"
BASE="http://$HOST:$PORT"
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT_DIR="dytallix-lean-launch/launch-evidence/metrics-dashboard"
mkdir -p "$OUT_DIR"

log(){ echo "[smoke] $*" >&2; }

check(){ local name=$1 url=$2; log "GET $url"; local resp; resp=$(curl -sS --max-time 8 "$url" || true); if [[ -z "$resp" ]]; then echo "ERROR: $name empty" >&2; return 1; fi; echo "$resp" > "$OUT_DIR/${TS}_${name}.json"; echo "$resp"; }

# Overview
OV=$(check overview "$BASE/api/overview") || exit 1
HEIGHT=$(echo "$OV" | jq -r '.height // empty')
TPS=$(echo "$OV" | jq -r '.tps // empty')
PEERS=$(echo "$OV" | jq -r '.peers // empty')
if [[ -z "$HEIGHT" || -z "$TPS" || -z "$PEERS" ]]; then log "WARN missing keys in overview"; else log "OK overview height=$HEIGHT tps=$TPS peers=$PEERS"; fi

# Health
check health "$BASE/api/health" >/dev/null || true

# Timeseries tps
TS_TPS=$(check timeseries_tps "$BASE/api/timeseries?metric=tps&range=1h" || true)
LEN=$(echo "$TS_TPS" | jq '.points | length' 2>/dev/null || echo 0)
if [[ "$LEN" -le 0 ]]; then log "WARN timeseries length=0"; else log "OK timeseries points=$LEN"; fi

log "Artifacts in $OUT_DIR (timestamp prefix $TS)"
