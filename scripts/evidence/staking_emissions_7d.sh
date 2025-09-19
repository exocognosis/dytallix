#!/usr/bin/env bash
set -euo pipefail

# scripts/evidence/staking_emissions_7d.sh
# 7-day dry-run report approximating emission accrual assuming steady blocks.
# Produces:
# - launch-evidence/staking/7d_report.csv (network-level projection)
# - launch-evidence/staking/validators.json (best-effort validator set snapshot)
# - launch-evidence/staking/7d_accruals.csv (per-delegator accrued snapshot)

UTC() { date -u +%Y%m%dT%H%M%SZ; }
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "$SCRIPT_DIR/../.." && pwd)
API_BASE="${API_BASE:-http://localhost:3030}"
EVID_DIR="$ROOT_DIR/launch-evidence/staking"
RUN_DIR="$EVID_DIR/run_$(UTC)"
mkdir -p "$RUN_DIR" "$EVID_DIR"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing command: $1" >&2; exit 1; }; }
need curl; need jq

log() { printf '%s %s\n' "$(UTC)" "$*" | tee -a "$RUN_DIR/run.log" >&2; }

# Get emission rate per block and recent block time
STATS=$(curl -sf "$API_BASE/api/stats" || echo '{}')
EMISSION_PER_BLOCK=$(echo "$STATS" | jq -r '.emission_per_block // .emissionPerBlock // 1000000')
BLOCK_TIME_SEC=$(echo "$STATS" | jq -r '.block_time_seconds // .blockTimeSeconds // 2')

DAYS=${DAYS:-7}
SECONDS_IN_DAY=86400
BLOCKS_PER_DAY=$(jq -n --arg bt "$BLOCK_TIME_SEC" '$bt|tonumber|if .>0 then (86400/. )|floor else 43200 end')
TOTAL_BLOCKS=$(jq -n --arg bpd "$BLOCKS_PER_DAY" --arg d "$DAYS" '($bpd|tonumber) * ($d|tonumber)')
TOTAL_EMISSION=$(jq -n --arg e "$EMISSION_PER_BLOCK" --arg tb "$TOTAL_BLOCKS" '($e|tonumber) * ($tb|tonumber)')

CSV="$EVID_DIR/7d_report.csv"
{
  echo "days,block_time_seconds,blocks_per_day,total_blocks,emission_per_block,total_emission"
  echo "${DAYS},${BLOCK_TIME_SEC},${BLOCKS_PER_DAY},${TOTAL_BLOCKS},${EMISSION_PER_BLOCK},${TOTAL_EMISSION}"
} > "$CSV"
log "Wrote $CSV"

# Best-effort validator set snapshot
if VALS=$(curl -sf "$API_BASE/api/staking/validators" 2>/dev/null || true); then
  if [[ -n "$VALS" ]]; then
    echo "$VALS" | jq . > "$EVID_DIR/validators.json"
    log "Wrote $EVID_DIR/validators.json"
  fi
else
  log "No validator endpoint available; skipping validators.json"
fi

# Determine delegators for per-delegator accruals
# Priority: emission_config.json -> STAKE_DELEGATORS env (comma-separated) -> DELEGATOR_A/DELEGATOR_B envs
DEL_LIST=()
if [[ -f "$EVID_DIR/emission_config.json" ]]; then
  mapfile -t DEL_LIST < <(jq -r '.delegations[]?.address // empty' "$EVID_DIR/emission_config.json" | sort -u)
fi
if [[ ${#DEL_LIST[@]} -eq 0 && -n "${STAKE_DELEGATORS:-}" ]]; then
  IFS=',' read -r -a DEL_LIST <<< "$STAKE_DELEGATORS"
fi
if [[ ${#DEL_LIST[@]} -eq 0 ]]; then
  [[ -n "${DELEGATOR_A:-}" ]] && DEL_LIST+=("$DELEGATOR_A") || true
  [[ -n "${DELEGATOR_B:-}" ]] && DEL_LIST+=("$DELEGATOR_B") || true
fi

ACCRUALS_CSV="$EVID_DIR/7d_accruals.csv"
echo "as_of,address,accrued_rewards" > "$ACCRUALS_CSV"
AS_OF=$(UTC)
for addr in "${DEL_LIST[@]}"; do
  [[ -z "$addr" ]] && continue
  AJSON=$(curl -sf "$API_BASE/api/staking/accrued/$addr" || echo '{}')
  ACCRUED=$(echo "$AJSON" | jq -r '.accrued_rewards // "0"')
  echo "$AS_OF,$addr,$ACCRUED" >> "$ACCRUALS_CSV"
  echo "$AJSON" | jq . > "$RUN_DIR/accrued_${addr}.json"
  log "Accrued for $addr = $ACCRUED"
done
log "Wrote $ACCRUALS_CSV"
