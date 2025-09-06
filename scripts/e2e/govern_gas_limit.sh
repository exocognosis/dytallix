#!/usr/bin/env bash
set -euo pipefail

# e2e/govern_gas_limit.sh
# - Submit a ParameterChange(gas_limit)
# - Deposit minimum, vote yes
# - Let blocks advance, verify status Executed
# - Export proposal.json, votes.json, execution.log, final_params.json
#
# Requirements:
# - Running node with governance enabled: DYT_ENABLE_GOVERNANCE=1
# - Endpoint default http://localhost:3030
# - jq, curl
# - An address with sufficient udgt to meet min_deposit
#   (for devnet, use scripts/devnet/spin_up.sh which pre-funds validators)

UTC() { date -u +%Y%m%dT%H%M%SZ; }
TS=$(UTC)

API_BASE="${API_BASE:-http://localhost:3030}"
TITLE="${GOV_TITLE:-Increase gas limit}"
DESC="${GOV_DESC:-Automated ParameterChange(gas_limit)}"
NEW_GAS_LIMIT="${GOV_NEW_GAS_LIMIT:-50000}"
DEPOSITOR="${GOV_DEPOSITOR:-dyt1senderdev000000}"
VOTER="${GOV_VOTER:-dyt1senderdev000000}"
POLL_MAX=${GOV_POLL_MAX:-120}
SLEEP_SECS=${GOV_POLL_SLEEP:-2}

EVID_DIR="launch-evidence/governance"
RUN_DIR="$EVID_DIR/run_$TS"
mkdir -p "$RUN_DIR" "$EVID_DIR"

log() { printf '%s %s\n' "$(UTC)" "$*" | tee -a "$RUN_DIR/run.log" >&2; }
fail() { log "ERROR: $*"; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || fail "Missing command: $1"; }

need curl; need jq

# Health checks
log "Checking governance feature..."
CFG=$(curl -sf "$API_BASE/gov/config" || true)
if [[ -z "$CFG" ]]; then fail "RPC not reachable at $API_BASE"; fi
if echo "$CFG" | jq -e 'has("error") and .error == "NOT_IMPLEMENTED"' >/dev/null 2>&1; then
  fail "Governance feature disabled. Start node with DYT_ENABLE_GOVERNANCE=1"
fi

MIN_DEPOSIT=$(echo "$CFG" | jq -r '.min_deposit // .minDeposit // empty')
if [[ -z "$MIN_DEPOSIT" || "$MIN_DEPOSIT" == "null" ]]; then
  # derive from example default if not present
  MIN_DEPOSIT=1000000000
fi
log "min_deposit = $MIN_DEPOSIT udgt"

# 1) Submit proposal
log "Submitting ParameterChange(gas_limit=$NEW_GAS_LIMIT) ..."
SUBMIT=$(curl -sf -X POST "$API_BASE/gov/submit" \
  -H 'content-type: application/json' \
  -d "{\"title\":\"$TITLE\",\"description\":\"$DESC\",\"key\":\"gas_limit\",\"value\":\"$NEW_GAS_LIMIT\"}") || fail "submit failed"
PID=$(echo "$SUBMIT" | jq -r '.proposal_id // empty')
[[ -n "$PID" ]] || fail "No proposal_id in response: $SUBMIT"
echo "$SUBMIT" | jq . > "$RUN_DIR/submit_response.json"
log "proposal_id = $PID"

# 2) Deposit
log "Depositing min_deposit=$MIN_DEPOSIT from $DEPOSITOR ..."
DEPOSIT_RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/gov/deposit" \
  -H 'content-type: application/json' \
  -d "{\"depositor\":\"$DEPOSITOR\",\"proposal_id\":$PID,\"amount\":$MIN_DEPOSIT}")
DEPOSIT_CODE=$(echo "$DEPOSIT_RESP" | tail -n1)
DEPOSIT_BODY=$(echo "$DEPOSIT_RESP" | head -n -1)
echo "$DEPOSIT_BODY" | jq . > "$RUN_DIR/deposit_response.json" || true
if [[ "$DEPOSIT_CODE" != "200" ]]; then
  fail "Deposit failed (HTTP $DEPOSIT_CODE). Body: $DEPOSIT_BODY"
fi
if ! echo "$DEPOSIT_BODY" | jq -e '.success == true' >/dev/null 2>&1; then
  fail "Deposit did not return success: $DEPOSIT_BODY"
fi

# 3) Vote yes
log "Casting yes vote from $VOTER ..."
VOTE_RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/gov/vote" \
  -H 'content-type: application/json' \
  -d "{\"voter\":\"$VOTER\",\"proposal_id\":$PID,\"option\":\"yes\"}")
VOTE_CODE=$(echo "$VOTE_RESP" | tail -n1)
VOTE_BODY=$(echo "$VOTE_RESP" | head -n -1)
echo "$VOTE_BODY" | jq . > "$RUN_DIR/vote_response.json" || true
if [[ "$VOTE_CODE" != "200" ]]; then
  fail "Vote failed (HTTP $VOTE_CODE). Body: $VOTE_BODY"
fi
if ! echo "$VOTE_BODY" | jq -e '.success == true' >/dev/null 2>&1; then
  fail "Vote did not return success: $VOTE_BODY"
fi

# 4) Poll proposal status until Executed
log "Polling proposal status until Executed ..."
STATUS=""
for ((i=1;i<=POLL_MAX;i++)); do
  PJSON=$(curl -sf "$API_BASE/gov/proposal/$PID" || true)
  [[ -n "$PJSON" ]] || fail "Failed to fetch proposal $PID"
  echo "$PJSON" | jq . > "$RUN_DIR/proposal_latest.json"
  STATUS=$(echo "$PJSON" | jq -r '.status')
  log "status=$STATUS (poll $i/$POLL_MAX)"
  if [[ "$STATUS" == "Executed" ]]; then
    break
  fi
  sleep "$SLEEP_SECS"
done

if [[ "$STATUS" != "Executed" ]]; then
  fail "Expected status Executed, got $STATUS"
fi

# 5) Collect votes and final params
VOTES=$(curl -sf "$API_BASE/api/governance/proposals/$PID/votes" || true)
echo "$VOTES" | jq . > "$RUN_DIR/votes.json" || true

FINAL=$(curl -sf "$API_BASE/gov/config" || true)
echo "$FINAL" | jq . > "$RUN_DIR/final_params.json" || true

# Verify gas_limit actually updated to requested value
ACTUAL_GAS_LIMIT=$(echo "$FINAL" | jq -r '.gas_limit // .gasLimit // empty')
if [[ -z "$ACTUAL_GAS_LIMIT" || "$ACTUAL_GAS_LIMIT" == "null" ]]; then
  fail "final /gov/config missing gas_limit"
fi
if [[ "$ACTUAL_GAS_LIMIT" != "$NEW_GAS_LIMIT" ]]; then
  fail "gas_limit mismatch: expected $NEW_GAS_LIMIT, got $ACTUAL_GAS_LIMIT"
fi

# 6) Write compact evidence files in governance/ as requested
cp "$RUN_DIR/proposal_latest.json" "$EVID_DIR/proposal.json"
cp "$RUN_DIR/votes.json" "$EVID_DIR/votes.json"
cp "$RUN_DIR/final_params.json" "$EVID_DIR/final_params.json"
# Provide execution.log as requested (copy run.log)
cp "$RUN_DIR/run.log" "$EVID_DIR/execution.log"

log "Success. Evidence: $EVID_DIR/{proposal.json,votes.json,execution.log,final_params.json}"
exit 0
