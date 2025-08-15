#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
OUT_DIR="$ROOT_DIR/outputs"
PARAMS="$ROOT_DIR/params.json"
ALLOCS="$ROOT_DIR/allocs.json"
VESTING="$ROOT_DIR/vesting.json"
DENOMS="$ROOT_DIR/denoms.json"
BINARY=$(cat "$OUT_DIR/binary_name.txt" 2>/dev/null || echo simd)
HOME_DIR="$OUT_DIR/node-home"
GENESIS="$HOME_DIR/config/genesis.json"

[ -f "$GENESIS" ] || { echo "Genesis not found, run init_chain.sh first" >&2; exit 1; }

# 1) Set denom metadata for uDGT/uDRT
jq --argjson metas "$(jq -c .denoms "$DENOMS")" '.app_state.bank.denom_metadata = $metas' "$GENESIS" > "$GENESIS.tmp" && mv "$GENESIS.tmp" "$GENESIS"

# 2) Set staking bond denom to uDGT
jq '.app_state.staking.params.bond_denom = "uDGT"' "$GENESIS" > "$GENESIS.tmp" && mv "$GENESIS.tmp" "$GENESIS"

# 3) Gov params
QUORUM=$(jq -r .gov.quorum "$PARAMS")
THRESHOLD=$(jq -r .gov.threshold "$PARAMS")
VETO=$(jq -r .gov.veto_threshold "$PARAMS")
VOTING=$(jq -r .gov.voting_period "$PARAMS")
MIN_DEPOSIT=$(jq -c .gov.min_deposit "$PARAMS")

jq \
  --arg q "$QUORUM" --arg t "$THRESHOLD" --arg v "$VETO" --arg vp "$VOTING" --argjson md "$MIN_DEPOSIT" \
  '.app_state.gov.params.quorum = $q | .app_state.gov.params.threshold = $t | .app_state.gov.params.veto_threshold = $v | .app_state.gov.params.voting_period = $vp | .app_state.gov.params.min_deposit = $md' \
  "$GENESIS" > "$GENESIS.tmp" && mv "$GENESIS.tmp" "$GENESIS"

# 4) Apply allocations: fill addresses
ADDR_MAP=$(jq -c '{ faucet, treasury, dist_module, ai_incentives, bridge_ops, validator, emissions_reserve, dev_team, initial_validators, ecosystem_fund }' "$OUT_DIR/addresses.json")
TMP_ALLOCS=$(mktemp)
JQF='map(.address = (if (.address|length)>0 then .address else (.label|tostring as $k | $addrmap[$k]) end))'
jq --argjson addrmap "$ADDR_MAP" "$JQF" "$ROOT_DIR/allocs.json" > "$TMP_ALLOCS"

# Merge balances array with existing balances
EXISTING=$(jq -c '.app_state.bank.balances' "$GENESIS")
MERGED=$(mktemp)
echo "$EXISTING" > "$MERGED"
while read -r row; do
  ADDR=$(echo "$row" | jq -r .address)
  uDGT=$(echo "$row" | jq -r .uDGT)
  uDRT=$(echo "$row" | jq -r .uDRT)
  COINS=()
  [ "$uDGT" != "0" ] && COINS+=("{\"denom\":\"uDGT\",\"amount\":\"$uDGT\"}")
  [ "$uDRT" != "0" ] && COINS+=("{\"denom\":\"uDRT\",\"amount\":\"$uDRT\"}")
  COINS_JSON="[${COINS[*]}]"
  jq --arg addr "$ADDR" --argjson coins "$COINS_JSON" '. += [{"address": $addr, "coins": $coins}]' "$MERGED" > "$MERGED.tmp" && mv "$MERGED.tmp" "$MERGED"
done < <(jq -c '.[]' "$TMP_ALLOCS")

jq --argjson bals "$(cat "$MERGED")" '.app_state.bank.balances = $bals' "$GENESIS" > "$GENESIS.tmp" && mv "$GENESIS.tmp" "$GENESIS"

# 5) Placeholder vesting writeout
cp "$VESTING" "$OUT_DIR/vesting_applied.json"

# Save working genesis
cp "$GENESIS" "$ROOT_DIR/outputs/genesis.json"

echo "seed_state.sh complete"
