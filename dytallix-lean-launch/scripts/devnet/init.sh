#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NETDIR="$ROOT/configs/devnet"
rm -rf "$NETDIR"
mkdir -p "$NETDIR/node1" "$NETDIR/node2" "$NETDIR/node3"

# Helper to init a node
init_node () {
  local id="$1"
  local moniker="val$id"
  local home="$NETDIR/node$id"
  docker run --rm -v "$home:/root/.dytallix" dytallix-node:latest \
    init "$moniker" --chain-id dyt-devnet
}

init_node 1
cp -r "$NETDIR/node1/config" "$NETDIR/node2/"
cp -r "$NETDIR/node1/config" "$NETDIR/node3/"

# Derive node IDs (need daemons running briefly or use show-node-id after start). We set addresses now; IDs will be auto-learned.
P2P1="node1:26656"
P2P2="node2:26656"
P2P3="node3:26656"

# Tweak configs for each node
tweak () {
  local id="$1"; local rpcport="$2"; local p2pport="$3"; local pprof="$4"
  local cfg="$NETDIR/node$id/config/config.toml"
  local app="$NETDIR/node$id/config/app.toml"

  # RPC and P2P ports
  sed -i "s|^laddr = \".*26657\"|laddr = \"tcp://0.0.0.0:$rpcport\"|g" "$cfg"
  sed -i "s|^laddr = \".*26656\"|laddr = \"tcp://0.0.0.0:$p2pport\"|g" "$cfg"

  # Reduce timeouts for faster blocks if defaults are large
  sed -i "s/^timeout_propose = .*/timeout_propose = \"1s\"/g" "$cfg"
  sed -i "s/^timeout_commit = .*/timeout_commit = \"1s\"/g" "$cfg"

  # Enable indexer for queries if off
  sed -i "s/^indexer = .*/indexer = \"kv\"/g" "$cfg"

  # App pruning/gas defaults (optional)
  sed -i "s/^pruning = .*/pruning = \"nothing\"/g" "$app"
}

tweak 1 26657 26656 6060
tweak 2 26660 26659 6061
tweak 3 26663 26662 6062

# Set persistent peers (use service DNS names from compose)
for id in 1 2 3; do
  cfg="$NETDIR/node$id/config/config.toml"
  sed -i "s|^persistent_peers = \".*\"|persistent_peers = \"\"|g" "$cfg"
done

echo "Initialized devnet configs in $NETDIR"
