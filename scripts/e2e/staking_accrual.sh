#!/usr/bin/env bash
set -euo pipefail

# e2e/staking_accrual.sh
# - Create 2 delegators via /api/staking/delegate
# - Wait N blocks for emissions to accrue
# - Claim for one delegator (A)
# - Export before_balances.json, after_balances.json, claims.log, emission_config.json
# - Evidence to launch-evidence/staking/
#
# Requirements:
# - Running node with staking enabled: DYT_ENABLE_STAKING=1
# - Endpoint default http://localhost:3030
# - jq, curl

UTC() { date -u +%Y%m%dT%H%M%SZ; }
TS=$(UTC)

API_BASE="${API_BASE:-http://localhost:3030}"
DELEGATOR_A="${DELEGATOR_A:-dyt1delegatora000000000000000000000000}"
DELEGATOR_B="${DELEGATOR_B:-dyt1delegatorb000000000000000000000000}"
VALIDATOR="${VALIDATOR_ADDR:-dyt1validator000000000000000000000000}"
AMOUNT_A="${DELEGATE_AMOUNT_A:-1000000}"   # 1 DGT in uDGT
AMOUNT_B="${DELEGATE_AMOUNT_B:-2000000}"   # 2 DGT in uDGT
WAIT_POLLS=${WAIT_POLLS:-20}
SLEEP_SECS=${SLEEP_SECS:-2}

EVID_DIR="launch-evidence/staking"
RUN_DIR="$EVID_DIR/run_$TS"
mkdir -p "$RUN_DIR"

log() { printf '%s %s\n' "$(UTC)" "$*" | tee -a "$RUN_DIR/run.log" >&2; }
fail() { log "ERROR: $*"; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || fail "Missing command: $1"; }

need curl; need jq

# Health check
STATS=$(curl -sf "$API_BASE/api/stats" || true)
[[ -n "$STATS" ]] || fail "RPC not reachable at $API_BASE"

# Quick feature probe: claim will 501 if staking disabled
PROBE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/staking/claim" \
  -H 'content-type: application/json' -d '{"address":"__probe__"}')
PROBE_CODE=$(echo "$PROBE" | tail -n1)
if [[ "$PROBE_CODE" == "501" ]]; then
  fail "Staking feature disabled. Start node with DYT_ENABLE_STAKING=1"
fi

# Helper: get uDRT balance for an address
# Note: /account/:addr returns balances as objects; extract numeric string at .balances.udrt.balance
udrt_balance() {
  local addr=$1
  local acc=$(curl -sf "$API_BASE/account/$addr" || echo '{}')
  echo "$acc" | jq -r '.balances.udrt.balance // 0'
}

# Before snapshot (combined)
log "Taking before balances ..."
BAL_A_BEFORE=$(udrt_balance "$DELEGATOR_A")
BAL_B_BEFORE=$(udrt_balance "$DELEGATOR_B")
printf '{"delegators":[{"address":"%s","udrt":"%s"},{"address":"%s","udrt":"%s"}]}' \
  "$DELEGATOR_A" "$BAL_A_BEFORE" "$DELEGATOR_B" "$BAL_B_BEFORE" | jq . > "$RUN_DIR/before_balances.json"

# Create delegations
log "Delegating: $DELEGATOR_A -> $VALIDATOR amount=$AMOUNT_A"
curl -sf -X POST "$API_BASE/api/staking/delegate" -H 'content-type: application/json' \
  -d "{\"delegator_addr\":\"$DELEGATOR_A\",\"validator_addr\":\"$VALIDATOR\",\"amount_udgt\":\"$AMOUNT_A\"}" \
  | jq . > "$RUN_DIR/delegate_A.json"
log "Delegating: $DELEGATOR_B -> $VALIDATOR amount=$AMOUNT_B"
curl -sf -X POST "$API_BASE/api/staking/delegate" -H 'content-type: application/json' \
  -d "{\"delegator_addr\":\"$DELEGATOR_B\",\"validator_addr\":\"$VALIDATOR\",\"amount_udgt\":\"$AMOUNT_B\"}" \
  | jq . > "$RUN_DIR/delegate_B.json"

# Wait for emissions across blocks
log "Waiting for emissions over ~$((WAIT_POLLS*SLEEP_SECS)) seconds ..."
for ((i=1;i<=WAIT_POLLS;i++)); do sleep "$SLEEP_SECS"; done

# Pause producer to stabilize state during claim and snapshots
log "Pausing block producer ..."
curl -sf -X POST "$API_BASE/ops/pause" -H 'content-type: application/json' -d '{}' | jq . > "$RUN_DIR/ops_pause.json"

# Accrued rewards snapshot (stable)
log "Querying accrued rewards ..."
ACCRUED_A=$(curl -sf "$API_BASE/api/staking/accrued/$DELEGATOR_A" || echo '{}')
ACCRUED_B=$(curl -sf "$API_BASE/api/staking/accrued/$DELEGATOR_B" || echo '{}')
echo "$ACCRUED_A" | jq . > "$RUN_DIR/accrued_$DELEGATOR_A.json"
echo "$ACCRUED_B" | jq . > "$RUN_DIR/accrued_$DELEGATOR_B.json"

CLAIMABLE_A=$(echo "$ACCRUED_A" | jq -r '.accrued_rewards // "0"')
CLAIMABLE_B=$(echo "$ACCRUED_B" | jq -r '.accrued_rewards // "0"')

# Perform claim for Delegator A only
log "Claiming rewards for $DELEGATOR_A (claimable=$CLAIMABLE_A) ..."
CLAIM_A=$(curl -sf -X POST "$API_BASE/api/staking/claim" -H 'content-type: application/json' \
  -d "{\"address\":\"$DELEGATOR_A\"}")
echo "$CLAIM_A" | jq . > "$RUN_DIR/claim_$DELEGATOR_A.json"

# After snapshot (combined, still paused)
BAL_A_AFTER=$(udrt_balance "$DELEGATOR_A")
BAL_B_AFTER=$(udrt_balance "$DELEGATOR_B")
printf '{"delegators":[{"address":"%s","udrt":"%s"},{"address":"%s","udrt":"%s"}]}' \
  "$DELEGATOR_A" "$BAL_A_AFTER" "$DELEGATOR_B" "$BAL_B_AFTER" | jq . > "$RUN_DIR/after_balances.json"

# Resume producer
log "Resuming block producer ..."
curl -sf -X POST "$API_BASE/ops/resume" -H 'content-type: application/json' -d '{}' | jq . > "$RUN_DIR/ops_resume.json"

# Export evidence set
mkdir -p "$EVID_DIR"

# Build emission_config.json using observed settings + stats snapshot
STATS_AFTER=$(curl -sf "$API_BASE/api/stats" || echo '{}')
jq -n \
  --arg api_base "$API_BASE" \
  --arg delegator_a "$DELEGATOR_A" \
  --arg delegator_b "$DELEGATOR_B" \
  --arg validator "$VALIDATOR" \
  --arg amount_a "$AMOUNT_A" \
  --arg amount_b "$AMOUNT_B" \
  --argjson wait_polls "$WAIT_POLLS" \
  --argjson sleep_secs "$SLEEP_SECS" \
  --argjson stats "$STATS_AFTER" \
  '{
     api_base: $api_base,
     validator: $validator,
     delegations: [
       {address:$delegator_a, amount_udgt:$amount_a},
       {address:$delegator_b, amount_udgt:$amount_b}
     ],
     emission_runtime: {
       wait_polls: $wait_polls, sleep_secs: $sleep_secs
     },
     stats_snapshot: $stats
   }' > "$RUN_DIR/emission_config.json"

# claims.log: human-readable summary
CLAIMED_A=$(echo "$CLAIM_A" | jq -r '.claimed // "0"')
{
  echo "$(UTC) DelegatorA: $DELEGATOR_A claimed=$CLAIMED_A before=$BAL_A_BEFORE after=$BAL_A_AFTER"
  echo "$(UTC) DelegatorB: $DELEGATOR_B claimed=0 (not claimed) before=$BAL_B_BEFORE after=$BAL_B_AFTER"
} | tee "$RUN_DIR/claims.log" >/dev/null

# Copy requested evidence files
cp "$RUN_DIR/before_balances.json" "$EVID_DIR/before_balances.json"
cp "$RUN_DIR/after_balances.json" "$EVID_DIR/after_balances.json"
cp "$RUN_DIR/claims.log" "$EVID_DIR/claims.log"
cp "$RUN_DIR/emission_config.json" "$EVID_DIR/emission_config.json"

# Quality gates: positive claim for A; balance delta matches claim amount
if [[ "${CLAIMED_A:-0}" == "0" ]]; then
  fail "Expected positive claim for $DELEGATOR_A; got $CLAIMED_A"
fi

DELTA_A=$(jq -n --arg before "$BAL_A_BEFORE" --arg after "$BAL_A_AFTER" '(
  ( ($after|tonumber) - ($before|tonumber) )
) | tostring')
if [[ "$DELTA_A" != "$CLAIMED_A" ]]; then
  fail "Balance delta ($DELTA_A) does not match claimed ($CLAIMED_A) for $DELEGATOR_A"
fi

log "Success. Evidence in $EVID_DIR (before_balances.json, after_balances.json, claims.log, emission_config.json)."
exit 0
