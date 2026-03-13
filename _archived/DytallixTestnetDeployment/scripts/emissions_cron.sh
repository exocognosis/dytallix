#!/usr/bin/env sh
set -eu

# Idempotent emissions runner
# Requires: curl, jq, yq

: "${RPC:=http://dytallix-rpc.dytallix.svc.cluster.local:3030}"
: "${SCHEDULE:=/etc/dyt/emissions/schedule.yaml}"
: "${LOG_DIR:=/var/log/dytallix-emissions}"

mkdir -p "$LOG_DIR/.state"
LOG_FILE="$LOG_DIR/$(date -u +%Y%m%d).log"

log() { echo "[emissions] $*" | tee -a "$LOG_FILE"; }

# Tools check
need() { command -v "$1" >/dev/null 2>&1 || { log "Missing tool: $1"; exit 1; }; }
need curl; need jq; need yq

# Cleanup old logs if retention is set (ENV: RETENTION_DAYS)
if [ -n "${RETENTION_DAYS:-}" ]; then
  find "$LOG_DIR" -maxdepth 1 -type f -name '*.log' -mtime "+$RETENTION_DAYS" -print -delete || true
fi

# Get current height
HEIGHT=$(curl -fsS "$RPC/api/stats" | jq -r '.height')
if [ -z "$HEIGHT" ] || [ "$HEIGHT" = "null" ]; then
  log "Failed to fetch chain height from $RPC"; exit 1
fi
log "height=$HEIGHT"

# If schedule file missing, exit gracefully
if [ ! -s "$SCHEDULE" ]; then
  log "No schedule file found at $SCHEDULE; nothing to do"
  exit 0
fi

# Iterate scheduled claims
COUNT=$(yq '.entries | length' "$SCHEDULE" 2>/dev/null || echo 0)
if [ "$COUNT" -eq 0 ]; then
  log "No entries in schedule"; exit 0
fi

i=0
while [ $i -lt $COUNT ]; do
  entry=$(yq ".entries[$i]" "$SCHEDULE")
  e_height=$(echo "$entry" | yq '.height')
  pool=$(echo "$entry" | yq -r '.pool')
  to=$(echo "$entry" | yq -r '.to')
  amt=$(echo "$entry" | yq -r '.amount_udrt')
  [ "$e_height" = "null" ] && e_height=0
  [ "$amt" = "null" ] && amt=0
  key="${e_height}_${pool}_${to}_${amt}"
  stamp="$LOG_DIR/.state/$key.stamp"

  if [ "$e_height" -le "$HEIGHT" ]; then
    if [ -f "$stamp" ]; then
      log "skip height=$e_height pool=$pool to=$to amount_udrt=$amt status=already_applied"
    else
      # Apply emission claim
      body=$(printf '{"pool":"%s","amount":%s,"to":"%s"}' "$pool" "$amt" "$to")
      resp=$(curl -fsS -X POST "$RPC/emission/claim" -H 'Content-Type: application/json' -d "$body" || true)
      if echo "$resp" | jq -e . >/dev/null 2>&1; then
        remaining=$(echo "$resp" | jq -r '.remaining // ""')
        log "apply height=$e_height denom=uDRT pool=$pool to=$to amount_udrt=$amt remaining=${remaining} status=applied"
        date -u +%FT%TZ > "$stamp"
      else
        log "apply height=$e_height denom=uDRT pool=$pool to=$to amount_udrt=$amt status=error resp=$(printf %s "$resp" | tr '\n' ' ')"
      fi
    fi
  else
    log "future height=$e_height pool=$pool to=$to amount_udrt=$amt status=pending"
  fi
  i=$((i+1))
done

log "done height=$HEIGHT"

