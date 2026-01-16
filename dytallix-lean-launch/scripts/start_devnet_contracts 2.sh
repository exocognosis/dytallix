#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export RUST_LOG=${RUST_LOG:-info}
export DYT_CHAIN_ID=${DYT_CHAIN_ID:-dyt-local-1}
export DYT_EMPTY_BLOCKS=${DYT_EMPTY_BLOCKS:-1}
export DYT_BLOCK_INTERVAL_MS=${DYT_BLOCK_INTERVAL_MS:-1000}
export DYT_WS_ENABLED=${DYT_WS_ENABLED:-1}

# Free port 3030 if occupied
if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -ti tcp:3030 -sTCP:LISTEN || true)
  if [ -n "${PIDS:-}" ]; then
    echo "Killing processes on :3030 -> $PIDS"
    kill -9 $PIDS || true
    sleep 0.5
  fi
fi

# Clean data dir for a fresh run
rm -rf ./data/node.db || true

# Start node on :3030
exec cargo run -p dytallix-lean-node --bin dytallix-lean-node --features contracts --quiet
