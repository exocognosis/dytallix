#!/usr/bin/env bash

# Dytallix Launch Runbook (Faucet Alignment)
#
# Purpose: Document faucet behavior relative to PQC requirement and provide
#          a quick operational checklist with evidence logging.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FAUCET_DIR="$ROOT_DIR/faucet"
EVIDENCE_DIR="$ROOT_DIR/launch-evidence/faucet"
EVIDENCE_LOG="$EVIDENCE_DIR/funding_and_rate_limit.log"

echo "Dytallix Launch Runbook — Faucet Alignment"
echo "Root: $ROOT_DIR"
echo "Evidence log: $EVIDENCE_LOG"
echo

cat <<'NOTE'
Faucet PQC Alignment
--------------------
- Requirement: MVP mandates PQC for all transactions.
- Current State: Faucet backend does not submit on-chain transactions and does not use PQC signing.
  It simulates token distribution and enforces server-side rate limits.
- Decision: Keep faucet off-chain/simulated for MVP and treat as a documented exception to PQC.
  All validator/node transaction paths remain PQC-aligned.

Implications
------------
- No secp256k1 signing is happening in faucet (no on-chain signing at all).
- A future enhancement will route faucet to a PQC-enabled signing flow once the PQC signer/RPC is exposed.

Operational Steps
-----------------
1) Start Faucet (dev):
   cd faucet && npm run dev

2) Test once-success then rate-limit:
   curl -s -X POST http://localhost:3001/api/faucet \
     -H 'Content-Type: application/json' \
     -d '{"address":"dyt1testaddressxxxxxxxxxxxxxxxxxxxxxxxxx","tokenType":"both"}' | jq .

   curl -s -X POST http://localhost:3001/api/faucet \
     -H 'Content-Type: application/json' \
     -d '{"address":"dyt1testaddressxxxxxxxxxxxxxxxxxxxxxxxxx","tokenType":"both"}' | jq .

3) Verify evidence log shows:
   - SUCCESS_FUND with before/after balance (increment after first request)
   - RATE_LIMIT or IP_COOLDOWN for the second rapid request

   tail -n 20 "$EVIDENCE_LOG"

4) Health:
   curl -s http://localhost:3001/health | jq .

Artifacts
---------
- $EVIDENCE_LOG: Append-only JSONL entries of funding and rate limit enforcement.

Rollback/Recovery
-----------------
- If faucet misbehaves, stop the dev server and clear in-memory rate limits by restarting the process.
NOTE

mkdir -p "$EVIDENCE_DIR"
touch "$EVIDENCE_LOG"
echo "Initialized evidence directory and log."

