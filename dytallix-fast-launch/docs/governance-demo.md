---
title: Governance Demo (End-to-End)
---

This runbook walks a validator through the full proposal lifecycle on a local devnet using the Dytallix CLI (dytx) and RPC endpoints:
- Submit a proposal
- Deposit (if required)
- Cast votes from validator accounts
- Check status and tally
- Execute and verify a visible on-chain state change (before/after)

Prerequisites
- macOS or Linux shell with curl and jq
- Node.js 18+
- A devnet node running with governance enabled at http://localhost:3030

1) Environment and CLI setup
Run all commands from the repository root: dytallix-lean-launch.

```bash
# 1. Verify node is up
curl -s http://localhost:3030/stats | jq .

# 2. Build the CLI once
cd cli/dytx
npm install
npm run build
cd -

# 3. Point CLI to devnet RPC (zsh/bash)
export DYTALLIX_RPC_URL="http://localhost:3030"
```

2) Snapshot current parameter (before)
We’ll change gas_limit so we can verify a clear before/after delta.

```bash
BEFORE_GAS=$(curl -s "$DYTALLIX_RPC_URL/gov/config" | jq -r '.gas_limit')
echo "Before gas_limit: ${BEFORE_GAS}"
```

3) Submit a parameter-change proposal
Example: raise gas_limit to 50000.

```bash
NEW_LIMIT=50000
PROPOSAL_ID=$(node cli/dytx/dist/index.js --output json gov submit \
  --title "Gas Limit Increase Demo" \
  --description "Increase gas limit from ${BEFORE_GAS} to ${NEW_LIMIT} for better UX" \
  --key "gas_limit" \
  --value "${NEW_LIMIT}" | jq -r '.proposal_id')

echo "Submitted proposal id: $PROPOSAL_ID"
```

Example output
```json
{ "proposal_id": 1 }
```

4) Deposit to enter voting (if required)
Use a predefined dev account. You can query the minimum deposit from the chain.

```bash
MIN_DEPOSIT=$(curl -s "$DYTALLIX_RPC_URL/gov/config" | jq -r '.min_deposit // "1000000000"')
node cli/dytx/dist/index.js gov deposit \
  --proposal "$PROPOSAL_ID" \
  --from "depositor1" \
  --amount "$MIN_DEPOSIT"
```

Example output
```
✅ Deposit submitted
{ success: true }
```

5) Cast votes from validator accounts
Cast different options from test accounts (replace with your validator key names if different).

```bash
# yes
node cli/dytx/dist/index.js gov vote \
  --proposal "$PROPOSAL_ID" \
  --from "voter1" \
  --option "yes"

# no
node cli/dytx/dist/index.js gov vote \
  --proposal "$PROPOSAL_ID" \
  --from "voter2" \
  --option "no"

# abstain
node cli/dytx/dist/index.js gov vote \
  --proposal "$PROPOSAL_ID" \
  --from "voter3" \
  --option "abstain"
```

Example output
```
✅ Vote submitted
{ success: true }
```

6) Inspect proposal status and tally

```bash
# List proposals
node cli/dytx/dist/index.js gov proposals

# Tally for this proposal (JSON recommended)
node cli/dytx/dist/index.js --output json gov tally --proposal "$PROPOSAL_ID" | jq .
```

Example tally (illustrative)
```json
{
  "yes": "6000000000",
  "no": "3000000000",
  "abstain": "1000000000",
  "no_with_veto": "0",
  "quorum_met": true,
  "passed": true
}
```

7) Execute the proposal (when passed)
Use the RPC directly to avoid any CLI version drift.

```bash
curl -s -X POST "$DYTALLIX_RPC_URL/gov/execute" \
  -H 'content-type: application/json' \
  -d "{ \"proposal_id\": $PROPOSAL_ID }" | jq .
```

Example output
```
✅ Proposal executed
{ "success": true }
```

8) Verify on-chain result (after) and show delta
Compare before/after via the governance config endpoint.

```bash
AFTER_GAS=$(curl -s "$DYTALLIX_RPC_URL/gov/config" | jq -r '.gas_limit')
echo "After  gas_limit: ${AFTER_GAS}"

if [ "$AFTER_GAS" = "$NEW_LIMIT" ]; then
  echo "OK: gas_limit updated from ${BEFORE_GAS} -> ${AFTER_GAS}"
else
  echo "ERROR: gas_limit not updated (expected ${NEW_LIMIT})" >&2
  exit 1
fi
```

Troubleshooting
- Node not running: start with governance enabled
  ```bash
  cd node
  DYT_ENABLE_GOVERNANCE=true cargo run
  ```
- Missing jq: install via Homebrew on macOS
  ```bash
  brew install jq
  ```
- CLI not built: rerun npm install && npm run build in cli/dytx

Notes
- The addresses depositor1, voter1, voter2, voter3 are devnet keys funded in genesis.
- All commands are copy-paste ready for a local devnet at http://localhost:3030.
