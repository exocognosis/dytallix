#!/usr/bin/env bash
set -euo pipefail

# MVP emissions: periodically transfer uDRT from `emissions_reserve` to distribution, ai_incentives, bridge_ops according to params.json.
# This is a userland script, not an on-chain module. For true per-block minting, implement x/emissions.

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
OUT_DIR="$ROOT_DIR/outputs"
PARAMS="$ROOT_DIR/params.json"
BINARY=$(cat "$OUT_DIR/binary_name.txt" 2>/dev/null || echo simd)
HOME_DIR="$OUT_DIR/node-home"
ADDRS="$OUT_DIR/addresses.json"

RATE_ANNUAL=$(jq -r .emissions.annual_inflation_rate "$PARAMS")
BLOCK_TIME_MS=$(jq -r .block_time_ms "$PARAMS")
SPLIT_BLOCK=$(jq -r .emissions.splits.block_rewards_distribution "$PARAMS")
SPLIT_STAKE=$(jq -r .emissions.splits.staking_bonuses_distribution "$PARAMS")
SPLIT_AI=$(jq -r .emissions.splits.ai_incentives "$PARAMS")
SPLIT_BRIDGE=$(jq -r .emissions.splits.bridge_ops "$PARAMS")

EMISSIONS_ADDR=$(jq -r .emissions_reserve "$ADDRS")
DIST_ADDR=$(jq -r .dist_module "$ADDRS")
AI_ADDR=$(jq -r .ai_incentives "$ADDRS")
BRIDGE_ADDR=$(jq -r .bridge_ops "$ADDRS")

# Determine per-block payment from reserve at target inflation over a notional supply.
# For MVP we compute based on current reserve balance divided into an epoch window.
# You can override AMOUNT_PER_BLOCK by setting env var.

TOTAL_SUPPLY_DRT=$("$BINARY" q bank total --denom uDRT --home "$HOME_DIR" --output json | jq -r .amount.amount 2>/dev/null || echo 0)
if [ "$TOTAL_SUPPLY_DRT" = "0" ]; then
  # fallback: assume 1e18 uDRT supply notionally
  TOTAL_SUPPLY_DRT=1000000000000000000
fi

BLOCKS_PER_YEAR=$(( (365*24*60*60*1000) / BLOCK_TIME_MS ))
PER_BLOCK=$(python3 - <<PY
rate=$RATE_ANNUAL
supply=$TOTAL_SUPPLY_DRT
bpy=$BLOCKS_PER_YEAR
print(int(supply*rate/bpy))
PY
)

AMOUNT_PER_BLOCK=${AMOUNT_PER_BLOCK:-$PER_BLOCK}

if [ "$AMOUNT_PER_BLOCK" -le 0 ]; then
  echo "Calculated zero emissions per block; adjust params.json"
  exit 0
fi

# Perform one transfer burst simulating N blocks
N_BLOCKS=${N_BLOCKS:-100}
TOTAL=$(( AMOUNT_PER_BLOCK * N_BLOCKS ))

AMT_BLOCK=$(( TOTAL * SPLIT_BLOCK ))
AMT_STAKE=$(( TOTAL * SPLIT_STAKE ))
AMT_AI=$(( TOTAL * SPLIT_AI ))
AMT_BRIDGE=$(( TOTAL * SPLIT_BRIDGE ))

set +e
"$BINARY" tx bank send "$(jq -r .emissions_reserve "$ADDRS")" "$DIST_ADDR" "${AMT_BLOCK}uDRT" --yes --keyring-backend test --fees 1uDGT --home "$HOME_DIR"
"$BINARY" tx bank send "$(jq -r .emissions_reserve "$ADDRS")" "$DIST_ADDR" "${AMT_STAKE}uDRT" --yes --keyring-backend test --fees 1uDGT --home "$HOME_DIR"
"$BINARY" tx bank send "$(jq -r .emissions_reserve "$ADDRS")" "$AI_ADDR" "${AMT_AI}uDRT" --yes --keyring-backend test --fees 1uDGT --home "$HOME_DIR"
"$BINARY" tx bank send "$(jq -r .emissions_reserve "$ADDRS")" "$BRIDGE_ADDR" "${AMT_BRIDGE}uDRT" --yes --keyring-backend test --fees 1uDGT --home "$HOME_DIR"
set -e

echo "enable_emissions.sh simulated $N_BLOCKS blocks emissions from reserve"
