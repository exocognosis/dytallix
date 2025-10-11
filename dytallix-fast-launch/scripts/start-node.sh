#!/usr/bin/env bash
set -e

echo "🚀 Starting Dytallix Node..."

cd "$(dirname "$0")/../node"

# Load environment variables
if [ -f ../.env ]; then
  export $(cat ../.env | grep -v '^#' | xargs)
fi

# Set defaults
export DYT_DATA_DIR="${DYT_DATA_DIR:-./data}"
export DYT_CHAIN_ID="${DYT_CHAIN_ID:-dyt-local-1}"
export DYT_GENESIS_FILE="${DYT_GENESIS_FILE:-../genesis.json}"
export DYT_BLOCK_INTERVAL_MS="${DYT_BLOCK_INTERVAL_MS:-2000}"
export DYT_EMPTY_BLOCKS="${DYT_EMPTY_BLOCKS:-true}"
export BLOCK_MAX_TX="${BLOCK_MAX_TX:-100}"
export DYT_WS_ENABLED="${DYT_WS_ENABLED:-true}"

echo "Configuration:"
echo "  Chain ID: $DYT_CHAIN_ID"
echo "  Data Dir: $DYT_DATA_DIR"
echo "  Genesis: $DYT_GENESIS_FILE"
echo "  Block Interval: ${DYT_BLOCK_INTERVAL_MS}ms"
echo "  Port: 3030"
echo ""

# Run the node
if [ -f "../target/release/dytallix-fast-node" ]; then
  echo "Running release build..."
  ../target/release/dytallix-fast-node
else
  echo "Running with cargo (may be slower)..."
  cargo run --release --bin dytallix-fast-node
fi
