#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
OUT_DIR="$ROOT_DIR/outputs"
PARAMS="$ROOT_DIR/params.json"
DENOMS="$ROOT_DIR/denoms.json"
BINARY=$(cat "$OUT_DIR/binary_name.txt" 2>/dev/null || echo simd)
CHAIN_ID=$(jq -r .chain_id "$PARAMS")
HOME_DIR="$OUT_DIR/node-home"
KEYRING="test"

mkdir -p "$OUT_DIR" "$HOME_DIR"

have_key() { "$BINARY" keys show "$1" --keyring-backend "$KEYRING" --home "$HOME_DIR" >/dev/null 2>&1; }
create_key_once() {
  local name="$1"
  if have_key "$name"; then
    echo "Key $name exists"
  else
    echo -e "y\n" | "$BINARY" keys add "$name" --keyring-backend "$KEYRING" --home "$HOME_DIR" --output json >/dev/null
    echo "Created key $name"
  fi
}

# Core keys
for K in faucet treasury dist_module ai_incentives bridge_ops validator emissions_reserve dev_team initial_validators ecosystem_fund staking_rewards; do
  create_key_once "$K"
  ADDR=$("$BINARY" keys show "$K" -a --keyring-backend "$KEYRING" --home "$HOME_DIR")
  ADDRS[$K]="$ADDR"
done

# Save addresses
{
  echo "{"
  for K in faucet treasury dist_module ai_incentives bridge_ops validator emissions_reserve dev_team initial_validators ecosystem_fund staking_rewards; do
    ADDR=$("$BINARY" keys show "$K" -a --keyring-backend "$KEYRING" --home "$HOME_DIR")
    echo "  \"$K\": \"$ADDR\"," 
  done | sed '$ s/,$//'
  echo "}"
} > "$OUT_DIR/addresses.json"

# Init chain
if [ ! -f "$HOME_DIR/config/genesis.json" ]; then
  "$BINARY" init dytallix --chain-id "$CHAIN_ID" --home "$HOME_DIR"
fi

# Add minimal funds for basic txs (will be overridden/augmented later by seed_state.sh)
for K in faucet treasury dist_module ai_incentives bridge_ops validator emissions_reserve dev_team initial_validators ecosystem_fund staking_rewards; do
  ADDR=$("$BINARY" keys show "$K" -a --keyring-backend "$KEYRING" --home "$HOME_DIR")
  "$BINARY" genesis add-genesis-account "$ADDR" 1000000uDGT,1000000uDRT --home "$HOME_DIR" >/dev/null 2>&1 || \
  "$BINARY" add-genesis-account "$ADDR" 1000000uDGT,1000000uDRT --home "$HOME_DIR" >/dev/null 2>&1 || true
done

# Gentx for validator with uDGT staking denom
if ! grep -q 'gen_txs' "$HOME_DIR/config/genesis.json" || [ "$(jq '.app_state.genutil.gen_txs | length' "$HOME_DIR/config/genesis.json")" -eq 0 ]; then
  "$BINARY" genesis gentx validator 1000000uDGT --chain-id "$CHAIN_ID" --keyring-backend "$KEYRING" --home "$HOME_DIR" >/dev/null 2>&1 || \
  "$BINARY" gentx validator 1000000uDGT --chain-id "$CHAIN_ID" --keyring-backend "$KEYRING" --home "$HOME_DIR" >/dev/null 2>&1 || true
  "$BINARY" genesis collect-gentxs --home "$HOME_DIR" >/dev/null 2>&1 || "$BINARY" collect-gentxs --home "$HOME_DIR" >/dev/null 2>&1 || true
fi

# Validate genesis
"$BINARY" genesis validate-genesis --home "$HOME_DIR" >/dev/null 2>&1 || "$BINARY" validate-genesis --home "$HOME_DIR" >/dev/null 2>&1 || true

echo "init_chain.sh complete"
