#!/usr/bin/env bash
set -euo pipefail
DURATION_MINUTES=${1:-${SOAK_DURATION_MINUTES:-2880}}
INTERVAL_SECONDS=${INTERVAL_SECONDS:-10}
LOG_FILE="artifacts/stability.log"
mkdir -p artifacts

# Convert duration to seconds, handling decimal values
if [[ "$DURATION_MINUTES" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
  duration_seconds=$(python3 -c "print(int(${DURATION_MINUTES} * 60))")
else
  duration_seconds=$((DURATION_MINUTES * 60))
fi
end_time=$(( $(date +%s) + duration_seconds ))

log(){ echo "$(date -Is) $1" >&2; }

write_json(){
  printf '{"ts":"%s","heights":%s,"missed":%s,"tx_total":%s,"tps":%.4f,"notes":"%s"}\n' \
    "$1" "$2" "$3" "$4" "$5" "$6" >> "$LOG_FILE"
}

last_tx_total=0; last_time=$(date +%s)

while true; do
  now=$(date +%s); ts=$(date -Is)
  if (( now >= end_time )); then log "Duration reached"; break; fi
  heights=(); missed=(); tx_total=0; notes=""
  declare -a TARGETS=(9564 9565 9566) # validator metrics
  for idx in "${!TARGETS[@]}"; do
     port=${TARGETS[$idx]}
     metrics=$(curl -s --max-time 2 "http://localhost:${port}/metrics" || true)
     h=$(echo "$metrics" | awk -F' ' '/dytallix_block_height/{print $2;exit}')
     m=$(echo "$metrics" | awk -F' ' '/dytallix_blocks_missed_total/{print $2;exit}')
     t=$(echo "$metrics" | awk -F' ' '/dytallix_transactions_total/{print $2;exit}')
     [[ -z "$h" ]] && h=null && notes+="h$idx? "
     [[ -z "$m" ]] && m=0 && notes+="m$idx? "
     [[ -z "$t" ]] && t=0 && notes+="t$idx? "
     heights+=("$h"); missed+=("$m"); tx_total=$(( tx_total + t ))
  done
  # simple aggregate TPS (delta total tx / interval / validators)
  if (( last_tx_total == 0 )); then
     tps=0
  else
     delta_tx=$(( tx_total - last_tx_total ))
     delta_time=$(( now - last_time ))
     (( delta_time > 0 )) || delta_time=1
     tps=$(python3 - <<PY
print(${delta_tx} / ${delta_time:.0f})
PY
)
  fi
  last_tx_total=$tx_total; last_time=$now
  write_json "$ts" "[${heights[*]}]" "[${missed[*]}]" "$tx_total" "$tps" "$notes"
  sleep "$INTERVAL_SECONDS"
done