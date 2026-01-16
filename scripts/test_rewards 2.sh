#!/bin/bash
# test_rewards.sh - Delegation reward accrual verification
# Purpose: Demonstrate that a delegator balance increases (accrues rewards) after at least one emission cycle.
# Output: JSON evidence file under launch-evidence/rewards/delegator_balance_diff_<UTC>.json
# Requirements: running node exposing staking + account HTTP APIs (defaults to http://127.0.0.1:3030)
# Dependencies: curl, jq, sleep (coreutils)

set -euo pipefail

API_BASE="${API_BASE:-http://127.0.0.1:3030}"    # Base REST API
DELEGATOR="${DELEGATOR:-dyt1qa_delegator}"       # Delegator address (override via env)
VALIDATOR="${VALIDATOR:-dyt1qa_validator}"       # Validator address (must exist or will be auto-registered if endpoint available)
DELEGATE_AMOUNT="${DELEGATE_AMOUNT:-1000000000}" # 1,000 DGT in micro (uDGT) units example
MIN_DELTA="${MIN_DELTA:-1}"                      # Minimum expected reward increase in uDRT
MAX_WAIT_BLOCKS="${MAX_WAIT_BLOCKS:-30}"         # Safety cap on polling loops
SLEEP_SECONDS="${SLEEP_SECONDS:-2}"              # Delay between polls
OUTPUT_DIR="launch-evidence/rewards"
CLI_CMD="${CLI_CMD:-dytallix-cli}"               # If a compiled CLI exists; fallback to REST only logic
USE_CLI="${USE_CLI:-false}"                      # Set true to use CLI for delegation

mkdir -p "$OUTPUT_DIR"

log() { echo "[INFO] $*" >&2; }
warn() { echo "[WARN] $*" >&2; }
err()  { echo "[ERROR] $*" >&2; }

need() { command -v "$1" >/dev/null 2>&1 || { err "Missing dependency: $1"; exit 1; }; }
need curl; need jq; 

###############################################################################
# Helper Functions
###############################################################################

#get account balance (returns numeric or 0)
get_balance() {
  local addr="$1"; local resp
  resp=$(curl -sS "$API_BASE/account/$addr" || true)
  echo "$resp" | jq -r '.balance // .balances.total // 0' 2>/dev/null || echo 0
}

#get rewards balance if endpoint exists (optional)
get_rewards_balance() {
  local addr="$1"; local resp
  resp=$(curl -sS "$API_BASE/staking/delegator/$addr" || true)
  # Try common fields
  echo "$resp" | jq -r '.accrued_rewards // .rewards // 0' 2>/dev/null || echo 0
}

#get current block height if available
get_height() {
  curl -sS "$API_BASE/stats" | jq -r '.height // .block_height // 0' 2>/dev/null || echo 0
}

# delegate via REST (fallback minimal example) - adjust if actual endpoint differs
rest_delegate() {
  local from="$1"; local validator="$2"; local amount="$3"
  # Hypothetical delegation endpoint; adapt if actual path differs
  local payload='{"delegator":"'$from'","validator":"'$validator'","amount":"'$amount'"}'
  curl -sS -X POST -H 'Content-Type: application/json' -d "$payload" "$API_BASE/staking/delegate" || true
}

# attempt validator auto-registration (best effort)
auto_register_validator() {
  local val="$1"; local resp
  resp=$(curl -sS "$API_BASE/staking/validators" || true)
  if echo "$resp" | grep -q "$val"; then
    log "Validator $val already present"; return 0; fi
  warn "Validator $val not found - attempting auto registration (if endpoint)"
  local payload='{"address":"'$val'","pubkey":"autogen_pubkey","commission":500,"self_stake":1000000000000}'
  curl -sS -X POST -H 'Content-Type: application/json' -d "$payload" "$API_BASE/staking/register" >/dev/null 2>&1 || true
}

# Perform delegation (CLI or REST)
perform_delegation() {
  local from="$1"; local validator="$2"; local amount="$3"
  if [ "$USE_CLI" = true ] && command -v "$CLI_CMD" >/dev/null 2>&1; then
    log "Delegating with CLI: $CLI_CMD stake delegate --from $from --validator $validator --amount $amount"
    if ! $CLI_CMD stake delegate --from "$from" --validator "$validator" --amount "$amount" >/dev/null 2>&1; then
      warn "CLI delegation failed; falling back to REST"
      rest_delegate "$from" "$validator" "$amount"
    fi
  else
    rest_delegate "$from" "$validator" "$amount"
  fi
}

###############################################################################
# Workflow
###############################################################################

log "API_BASE=$API_BASE"
log "Delegator=$DELEGATOR Validator=$VALIDATOR Amount=$DELEGATE_AMOUNT"

# 1. Capture pre-delegation balances
BEFORE_BALANCE=$(get_balance "$DELEGATOR")
BEFORE_REWARDS=$(get_rewards_balance "$DELEGATOR")
START_HEIGHT=$(get_height)
log "Before: balance=$BEFORE_BALANCE accrued_rewards=$BEFORE_REWARDS height=$START_HEIGHT"

# 2. Ensure validator exists (best effort)
auto_register_validator "$VALIDATOR" || true

# 3. Submit delegation
perform_delegation "$DELEGATOR" "$VALIDATOR" "$DELEGATE_AMOUNT"

# 4. Poll for reward accrual
log "Waiting for reward emission (poll up to $MAX_WAIT_BLOCKS blocks)..."
LAST_HEIGHT=$START_HEIGHT
FOUND_DELTA=false
EMISSION_LOG=()

for ((i=0; i<MAX_WAIT_BLOCKS; i++)); do
  sleep "$SLEEP_SECONDS"
  H=$(get_height)
  CUR_BAL=$(get_balance "$DELEGATOR")
  CUR_REW=$(get_rewards_balance "$DELEGATOR")
  DELTA=$((CUR_BAL - BEFORE_BALANCE))
  # Append emission snapshot (height,balance,rewards)
  EMISSION_LOG+=("{\"height\":$H,\"balance\":$CUR_BAL,\"rewards\":$CUR_REW}")
  if [ "$CUR_REW" -gt "$BEFORE_REWARDS" ] || [ "$DELTA" -gt 0 ]; then
    if [ $((CUR_REW - BEFORE_REWARDS)) -ge "$MIN_DELTA" ] || [ "$DELTA" -ge "$MIN_DELTA" ]; then
      log "Detected reward increase at height $H (delta balance=$DELTA, delta rewards=$((CUR_REW - BEFORE_REWARDS)))"
      FOUND_DELTA=true
      break
    fi
  fi
  LAST_HEIGHT=$H
done

AFTER_BALANCE=$(get_balance "$DELEGATOR")
AFTER_REWARDS=$(get_rewards_balance "$DELEGATOR")
DELTA_BAL=$((AFTER_BALANCE - BEFORE_BALANCE))
DELTA_REW=$((AFTER_REWARDS - BEFORE_REWARDS))

if [ "$DELTA_BAL" -lt 0 ]; then warn "Balance decreased unexpectedly (possible fee)."; fi

# Choose delta (prefer explicit rewards if available)
if [ "$DELTA_REW" -gt 0 ]; then
  EFFECTIVE_DELTA=$DELTA_REW
else
  EFFECTIVE_DELTA=$DELTA_BAL
fi

TIMESTAMP_UTC=$(date -u +%Y%m%dT%H%M%SZ)
EVIDENCE_FILE="$OUTPUT_DIR/delegator_balance_diff_${TIMESTAMP_UTC}.json"

# Build emission log JSON array
EMISSION_JSON="["$(IFS=,; echo "${EMISSION_LOG[*]}")"]"

# 5. Produce JSON evidence
jq -n --arg delegator "$DELEGATOR" \
      --arg validator "$VALIDATOR" \
      --argjson beforeBalance "$BEFORE_BALANCE" \
      --argjson afterBalance "$AFTER_BALANCE" \
      --argjson beforeRewards "$BEFORE_REWARDS" \
      --argjson afterRewards "$AFTER_REWARDS" \
      --argjson delta "$EFFECTIVE_DELTA" \
      --argjson deltaBalance "$DELTA_BAL" \
      --argjson deltaRewards "$DELTA_REW" \
      --arg startedHeight "$START_HEIGHT" \
      --arg endedHeight "$(get_height)" \
      --argjson emissionLog "$EMISSION_JSON" \
      '{delegator:$delegator, validator:$validator, beforeBalance: $beforeBalance, afterBalance: $afterBalance, beforeRewards:$beforeRewards, afterRewards:$afterRewards, delta:$delta, deltaBalance:$deltaBalance, deltaRewards:$deltaRewards, startedHeight: ($startedHeight|tonumber), endedHeight: ($endedHeight|tonumber), emissionLog: ($emissionLog|fromjson)}' > "$EVIDENCE_FILE"

log "Evidence written to $EVIDENCE_FILE"

# 6. Basic assertion
if [ "$EFFECTIVE_DELTA" -le 0 ]; then
  err "No positive reward accrual detected (delta=$EFFECTIVE_DELTA)"
  exit 1
fi

log "Success: rewards accrued (delta=$EFFECTIVE_DELTA)"

# Print resulting JSON to stdout for CI capture
cat "$EVIDENCE_FILE"
