#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
OUT_DIR="$ROOT_DIR/outputs"
BINARY=$(cat "$OUT_DIR/binary_name.txt" 2>/dev/null || echo simd)
HOME_DIR="$OUT_DIR/node-home"

echo "Stopping node if running (best-effort)"
pkill -f "$BINARY start --home $HOME_DIR" || true

rm -rf "$HOME_DIR/data" "$HOME_DIR/config/genesis.json" "$OUT_DIR/genesis.json"
"$BINARY" tendermint unsafe-reset-all --home "$HOME_DIR" || true

echo "reset.sh complete; re-run init_chain.sh next"
