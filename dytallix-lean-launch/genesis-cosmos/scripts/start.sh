#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
OUT_DIR="$ROOT_DIR/outputs"
BINARY=$(cat "$OUT_DIR/binary_name.txt" 2>/dev/null || echo simd)
HOME_DIR="$OUT_DIR/node-home"

NODE_ID=$("$BINARY" tendermint show-node-id --home "$HOME_DIR" 2>/dev/null || echo unknown)
{
  echo "Node ID: $NODE_ID"
  echo "RPC:    http://127.0.0.1:26657"
  echo "P2P:    tcp://127.0.0.1:26656"
  echo "LCD:    http://127.0.0.1:1317"
} > "$OUT_DIR/node_info.txt"

"$BINARY" start --home "$HOME_DIR" --log_level info
