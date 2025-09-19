#!/usr/bin/env bash
set -euo pipefail

# Governance end-to-end demo: adjust gas_limit via ParameterChange and capture artifacts
# Idempotent: if the desired gas limit is already executed, the script refreshes evidence
# without resubmitting a new proposal.

UTC() { date -u +%Y%m%dT%H%M%SZ; }

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "$SCRIPT_DIR/../.." && pwd)
API_BASE="${API_BASE:-http://localhost:3030}"
TITLE="${GOV_TITLE:-Increase gas limit}"
DESC="${GOV_DESC:-Governance demo ParameterChange(gas_limit)}"
DEPOSITOR="${GOV_DEPOSITOR:-dyt1senderdev000000}"
VOTER="${GOV_VOTER:-dyt1senderdev000000}"
POLL_MAX=${GOV_POLL_MAX:-180}
SLEEP_SECS=${GOV_POLL_SLEEP:-2}
DEFAULT_INCREMENT=5000
TARGET_FILE="$ROOT_DIR/launch-evidence/governance/target_gas_limit"
EVID_DIR="$ROOT_DIR/launch-evidence/governance"
RUN_DIR="$EVID_DIR/run_$(UTC)"
RUN_LOG="$RUN_DIR/run.log"
EXEC_FILE="$EVID_DIR/execution.log"
HELPER_SCRIPT="$ROOT_DIR/scripts/e2e/govern_gas_limit.sh"

mkdir -p "$RUN_DIR" "$EVID_DIR"

log() { printf '%s %s\n' "$(UTC)" "$*" | tee -a "$RUN_LOG" >&2; }
fail() { log "ERROR: $*"; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || fail "Missing command: $1"; }

need curl
need jq

[[ -x "$HELPER_SCRIPT" ]] || fail "Missing helper script $HELPER_SCRIPT"

CONFIG=$(curl -sf "$API_BASE/gov/config" || true)
[[ -n "$CONFIG" ]] || fail "RPC not reachable at $API_BASE"
if echo "$CONFIG" | jq -e 'has("error") and .error == "NOT_IMPLEMENTED"' >/dev/null 2>&1; then
  fail "Governance feature disabled. Start node with DYT_ENABLE_GOVERNANCE=1"
fi

CURRENT_LIMIT=$(printf '%s' "$CONFIG" | jq -r '.gas_limit // .gasLimit // .gaslimit // empty')
[[ -n "$CURRENT_LIMIT" && "$CURRENT_LIMIT" != "null" ]] || fail "Unable to read gas_limit from /gov/config"

NEW_GAS_LIMIT="${GOV_NEW_GAS_LIMIT:-}"
if [[ -z "$NEW_GAS_LIMIT" ]]; then
  if [[ -f "$TARGET_FILE" ]]; then
    NEW_GAS_LIMIT=$(tr -d '\n' < "$TARGET_FILE")
  else
    INCREMENT="${GOV_GAS_INCREMENT:-$DEFAULT_INCREMENT}"
    [[ "$INCREMENT" =~ ^[0-9]+$ ]] || fail "Invalid GOV_GAS_INCREMENT '$INCREMENT'"
    NEW_GAS_LIMIT=$(printf '%s' "$CONFIG" | jq -r --argjson inc "$INCREMENT" '((.gas_limit // .gasLimit // .gaslimit // 0) | tonumber) + $inc')
  fi
fi
[[ "$NEW_GAS_LIMIT" =~ ^[0-9]+$ ]] || fail "Desired gas limit must be numeric (got '$NEW_GAS_LIMIT')"
printf '%s\n' "$NEW_GAS_LIMIT" > "$TARGET_FILE"

fetch_and_write_artifacts() {
  local pid="$1"
  local update_exec="$2"
  local proposal votes config_json ts tmp

  proposal=$(curl -sf "$API_BASE/gov/proposal/$pid" || true)
  [[ -n "$proposal" ]] || fail "Failed to fetch proposal $pid"
  votes=$(curl -sf "$API_BASE/api/governance/proposals/$pid/votes" || true)
  config_json=$(curl -sf "$API_BASE/gov/config" || true)
  [[ -n "$config_json" ]] || fail "Failed to refresh /gov/config"

  printf '%s' "$proposal" | jq . > "$EVID_DIR/proposal.json"
  if [[ -n "$votes" ]]; then
    printf '%s' "$votes" | jq . > "$EVID_DIR/votes.json"
  else
    log "Votes endpoint returned empty response; writing []"
    jq -n '[]' > "$EVID_DIR/votes.json"
  fi
  printf '%s' "$config_json" | jq . > "$EVID_DIR/final_params.json"

  if [[ "$update_exec" == "update" && -f "$EXEC_FILE" ]]; then
    ts=$(UTC)
    tmp=$(mktemp)
    jq --arg time "$ts" '.last_verified_at = $time' "$EXEC_FILE" > "$tmp"
    mv "$tmp" "$EXEC_FILE"
  fi
}

maybe_refresh() {
  local pid status stored_target final_limit
  pid=$(jq -r '.proposal_id // empty' "$EXEC_FILE" 2>/dev/null || true)
  status=$(jq -r '.status // empty' "$EXEC_FILE" 2>/dev/null || true)
  stored_target=$(jq -r '.gas_limit_requested // empty' "$EXEC_FILE" 2>/dev/null || true)

  if [[ -z "$pid" || "$pid" == "null" ]]; then
    return 1
  fi
  if [[ "$status" != "Executed" ]]; then
    return 1
  fi
  if [[ "$stored_target" != "$NEW_GAS_LIMIT" ]]; then
    return 1
  fi

  log "Detected executed proposal $pid for gas_limit=$NEW_GAS_LIMIT; refreshing artifacts"
  fetch_and_write_artifacts "$pid" update
  final_limit=$(jq -r '.gas_limit // .gasLimit // .gaslimit // empty' "$EVID_DIR/final_params.json")
  if [[ "$final_limit" != "$NEW_GAS_LIMIT" ]]; then
    fail "On-chain gas_limit ($final_limit) does not match stored target $NEW_GAS_LIMIT"
  fi
  log "Governance evidence already up to date"
  return 0
}

log "Current gas_limit=$CURRENT_LIMIT, target gas_limit=$NEW_GAS_LIMIT"

if [[ -f "$EXEC_FILE" ]]; then
  if maybe_refresh; then
    exit 0
  fi
fi

log "Executing governance flow via $HELPER_SCRIPT"
GOV_NEW_GAS_LIMIT="$NEW_GAS_LIMIT" \
GOV_TITLE="$TITLE" \
GOV_DESC="$DESC" \
GOV_DEPOSITOR="$DEPOSITOR" \
GOV_VOTER="$VOTER" \
GOV_POLL_MAX="$POLL_MAX" \
GOV_POLL_SLEEP="$SLEEP_SECS" \
API_BASE="$API_BASE" \
  "$HELPER_SCRIPT"

if [[ ! -f "$EVID_DIR/proposal.json" ]]; then
  fail "Helper script did not produce $EVID_DIR/proposal.json"
fi

PID=$(jq -r '.id // .proposal_id // empty' "$EVID_DIR/proposal.json")
[[ -n "$PID" && "$PID" != "null" ]] || fail "Unable to determine proposal_id from proposal.json"

# Refresh artifacts from live endpoints to capture final state
fetch_and_write_artifacts "$PID" no

STATUS=$(jq -r '.status // empty' "$EVID_DIR/proposal.json")
[[ "$STATUS" == "Executed" ]] || fail "Proposal status is '$STATUS', expected 'Executed'"
ACTUAL_LIMIT=$(jq -r '.gas_limit // .gasLimit // .gaslimit // empty' "$EVID_DIR/final_params.json")
[[ "$ACTUAL_LIMIT" == "$NEW_GAS_LIMIT" ]] || fail "gas_limit mismatch: expected $NEW_GAS_LIMIT, got $ACTUAL_LIMIT"

TMP_EXEC=$(mktemp)
jq -n \
  --argjson proposal_id "$PID" \
  --arg status "$STATUS" \
  --argjson requested "$NEW_GAS_LIMIT" \
  --argjson final "$ACTUAL_LIMIT" \
  --arg executed_at "$(UTC)" \
  '{proposal_id: $proposal_id, status: $status, gas_limit_requested: $requested, gas_limit_final: $final, executed_at: $executed_at}' \
  > "$TMP_EXEC"

mv "$TMP_EXEC" "$EXEC_FILE"
log "Governance demo complete; evidence written to $EVID_DIR"
exit 0
