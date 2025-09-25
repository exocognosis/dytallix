#!/usr/bin/env bash
set -euo pipefail

# Governance param change E2E script with strict error handling & diagnostics

RPC=${RPC:-http://localhost:3030}
PROPOSAL_KEY=staking_reward_rate
OLD_VALUE=$(curl -sf $RPC/params/staking_reward_rate 2>/dev/null || echo '0.0500')
NEW_VALUE=0.10

mkdir -p readiness_out readiness_out/logs

START_HEIGHT=$(curl -sf $RPC/status | jq -r .latest_height || echo 0)
echo "[status] Start height: $START_HEIGHT"

echo "[1] Submitting proposal to change $PROPOSAL_KEY from $OLD_VALUE to $NEW_VALUE"
RESP=$(curl -sf -X POST "$RPC/gov/submit" -H 'Content-Type: application/json' -d "{\"key\":\"$PROPOSAL_KEY\",\"value\":\"$NEW_VALUE\",\"title\":\"Update staking reward\",\"description\":\"Increase reward to 10%\"}")
PROPOSAL_ID=$(echo "$RESP" | jq -r '.proposal_id')

if [ -z "${PROPOSAL_ID:-}" ] || [ "$PROPOSAL_ID" = "null" ]; then
  echo "Failed to submit proposal: $RESP" | tee readiness_out/gov_execute_report.md
  exit 1
fi

echo "Proposal ID: $PROPOSAL_ID"

sleep 2

echo "[status] Height before deposits: $(curl -sf $RPC/status | jq -r .latest_height)"

echo "[2] Depositing min deposit - using single depositor strategy"
DEPOSIT_RESP=$(curl -s -w "\n%{http_code}" -X POST "$RPC/gov/deposit" -H 'Content-Type: application/json' -d "{\"proposal_id\":$PROPOSAL_ID,\"depositor\":\"dyt1valoper000000000001\",\"amount\":1000000000}") || { echo "curl failed"; exit 1; }
CODE=$(echo "$DEPOSIT_RESP" | tail -n1)
BODY=$(echo "$DEPOSIT_RESP" | sed '$d')
if [ "$CODE" != "200" ]; then
  echo "Deposit failed (validator1) code=$CODE body=$BODY" | tee -a readiness_out/gov_execute_report.md
  exit 1
fi
echo "     deposit ok"

sleep 2

echo "[status] Proposal after deposits:" | tee -a readiness_out/gov_execute_report.md
curl -sf $RPC/gov/proposal/$PROPOSAL_ID | tee -a readiness_out/gov_execute_report.md

# Dump current tally
curl -sf $RPC/gov/tally/$PROPOSAL_ID | jq . | tee readiness_out/logs/tally_after_deposits.json >/dev/null

echo "[3] Casting yes votes"
for VAL in 1 2 3; do
  echo "  -> vote yes from validator$VAL"
  VOTE_RESP=$(curl -s -w "\n%{http_code}" -X POST "$RPC/gov/vote" -H 'Content-Type: application/json' -d "{\"proposal_id\":$PROPOSAL_ID,\"voter\":\"dyt1valoper00000000000$VAL\",\"option\":\"yes\"}") || { echo "curl failed"; exit 1; }
  CODE=$(echo "$VOTE_RESP" | tail -n1)
  BODY=$(echo "$VOTE_RESP" | sed '$d')
  if [ "$CODE" != "200" ]; then
    echo "Vote failed (validator$VAL) code=$CODE body=$BODY" | tee -a readiness_out/gov_execute_report.md
    exit 1
  fi
  echo "     ok"
  sleep 1
done

# Save proposal snapshot mid-flight
curl -sf $RPC/gov/proposal/$PROPOSAL_ID | jq . > readiness_out/logs/proposal_mid.json || true

echo "[4] Waiting for proposal to execute (tracking height)"
ATTEMPTS=120
STATUS="unknown"
while [ $ATTEMPTS -gt 0 ]; do
  STATUS=$(curl -sf $RPC/gov/proposal/$PROPOSAL_ID | jq -r '.status' || echo 'unknown')
  HEIGHT=$(curl -sf $RPC/status | jq -r .latest_height || echo 0)
  echo "  height=$HEIGHT status=$STATUS attempts_left=$ATTEMPTS"
  if [ "$STATUS" = "Executed" ]; then
    break
  fi
  sleep 2
  ATTEMPTS=$((ATTEMPTS-1))
done

END_HEIGHT=$(curl -sf $RPC/status | jq -r .latest_height || echo 0)
NEW_CHAIN_VALUE=$(curl -sf $RPC/params/staking_reward_rate || echo 'error')

{
  echo "Final status: $STATUS"
  echo "Before: $OLD_VALUE After: $NEW_CHAIN_VALUE"
  echo "Block range: $START_HEIGHT -> $END_HEIGHT"
} | tee -a readiness_out/gov_execute_report.md

# Collect logs and proposal/votes snapshots
{
  curl -sf $RPC/gov/proposal/$PROPOSAL_ID | jq . > readiness_out/logs/proposal_final.json || true
  curl -sf $RPC/gov/tally/$PROPOSAL_ID | jq . > readiness_out/logs/tally_final.json || true
  curl -sf $RPC/api/governance/proposals | jq . > readiness_out/logs/proposals_list.json || true
} || true

# Attempt to copy evidence logs from seed container if available
if command -v docker >/dev/null 2>&1; then
  echo "[logs] copying governance evidence from container dyt-seed (if exists)"
  docker cp dyt-seed:/var/lib/dytallix/launch-evidence/governance/execution.log readiness_out/logs/gov_execution.log 2>/dev/null || true
  docker cp dyt-seed:/var/lib/dytallix/launch-evidence/governance/proposal.json readiness_out/logs/gov_proposals.json 2>/dev/null || true
  docker cp dyt-seed:/var/lib/dytallix/launch-evidence/governance/votes.json readiness_out/logs/gov_votes.json 2>/dev/null || true
fi

if [[ "$STATUS" = "Executed" && "$NEW_CHAIN_VALUE" == 0.1000* ]]; then
  echo "Success: staking reward rate updated" | tee -a readiness_out/gov_execute_report.md
  exit 0
else
  echo "Failure: staking reward rate not updated (status=$STATUS value=$NEW_CHAIN_VALUE)" | tee -a readiness_out/gov_execute_report.md
  exit 1
fi
