#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
OUT_DIR="$ROOT_DIR/outputs"
PARAMS="$ROOT_DIR/params.json"
BINARY=$(cat "$OUT_DIR/binary_name.txt" 2>/dev/null || echo simd)
HOME_DIR="$OUT_DIR/node-home"

MIN_GAS=$(jq -r .min_gas_prices "$PARAMS")

CONFIG_TOML="$HOME_DIR/config/config.toml"
APP_TOML="$HOME_DIR/config/app.toml"
CLIENT_TOML="$HOME_DIR/config/client.toml"

# Enable ports and APIs in config.toml
# RPC laddr -> 0.0.0.0:26657
sed -i.bak -E 's#^laddr = "tcp://[^"]*:26657"#laddr = "tcp://0.0.0.0:26657"#' "$CONFIG_TOML" || true
# P2P laddr -> 0.0.0.0:26656
sed -i.bak -E 's#^laddr = "tcp://[^"]*:26656"#laddr = "tcp://0.0.0.0:26656"#' "$CONFIG_TOML" || true

# app.toml tweaks
# Enable API (1317) and listen on all interfaces
sed -i.bak -E 's#^(enable|enabled) = false#\1 = true#' "$APP_TOML" || true
sed -i.bak -E 's#address = "tcp://127.0.0.1:1317"#address = "tcp://0.0.0.0:1317"#' "$APP_TOML" || true
# gRPC (9090) on all interfaces (many apps already default to 0.0.0.0)
sed -i.bak -E 's#address = "127.0.0.1:9090"#address = "0.0.0.0:9090"#' "$APP_TOML" || true

# Set minimum gas prices
sed -i.bak -E "s#^minimum-gas-prices = .*#minimum-gas-prices = \"$MIN_GAS\"#" "$APP_TOML" || true

# Relax CORS for local dev
sed -i.bak -E 's#^enabled-unsafe-cors = false#enabled-unsafe-cors = true#' "$APP_TOML" || true

# Update client.toml for keyring-backend & chain-id
CHAIN_ID=$(jq -r .chain_id "$PARAMS")
sed -i.bak -E "s#^chain-id = .*$#chain-id = \"$CHAIN_ID\"#" "$CLIENT_TOML" || true
sed -i.bak -E "s#^keyring-backend = .*$#keyring-backend = \"test\"#" "$CLIENT_TOML" || true

echo "configure.sh complete"
