#!/usr/bin/env bash
set -euo pipefail

# Dytallix 3-validator devnet (lean node) spin-up
# - Generates keys for 3 validators
# - Writes genesis + evidence files
# - Starts 3 nodes via docker-compose.devnet.yml

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EVIDENCE_DIR="$ROOT_DIR/launch-evidence/devnet"
CONFIG_DIR="$ROOT_DIR/configs/devnet"
DATA_DIR="$ROOT_DIR/.devnet"
COMPOSE_FILE="$ROOT_DIR/docker-compose.devnet.yml"

mkdir -p "$EVIDENCE_DIR" "$CONFIG_DIR" "$DATA_DIR" \
         "$CONFIG_DIR/node1" "$CONFIG_DIR/node2" "$CONFIG_DIR/node3" \
         "$DATA_DIR/node1" "$DATA_DIR/node2" "$DATA_DIR/node3"

log() { echo "[devnet] $*"; }
die() { echo "[devnet] ERROR: $*" >&2; exit 1; }

need_cmd() { command -v "$1" >/dev/null 2>&1 || die "Missing dependency: $1"; }

# Dependencies
need_cmd docker
if ! docker compose version >/dev/null 2>&1; then
  need_cmd docker-compose
fi
need_cmd python3
need_cmd jq

CHAIN_ID="${CHAIN_ID:-dyt-devnet-1}"
BLOCK_MS="${BLOCK_MS:-2000}"
FEATURES_GOV="${FEATURES_GOV:-true}"
FEATURES_STAKE="${FEATURES_STAKE:-true}"

# Build image if missing
if ! docker image inspect dytallix-node:latest >/dev/null 2>&1; then
  log "Building docker image dytallix-node:latest ..."
  docker build -t dytallix-node:latest "$ROOT_DIR"
else
  log "Using existing image dytallix-node:latest"
fi

# Generate 3 validator keys using wallet CLI (idempotent)
log "Generating validator keys (val1..val3) ..."
python3 "$ROOT_DIR/wallet/cli.py" keygen --name val1 >/dev/null 2>&1 || true
python3 "$ROOT_DIR/wallet/cli.py" keygen --name val2 >/dev/null 2>&1 || true
python3 "$ROOT_DIR/wallet/cli.py" keygen --name val3 >/dev/null 2>&1 || true

WALLET_KEYS="$HOME/.dytallix-wallet/keys.json"
[ -f "$WALLET_KEYS" ] || die "Wallet keys not found at $WALLET_KEYS"

ADDR1=$(jq -r '.val1.address' "$WALLET_KEYS")
ADDR2=$(jq -r '.val2.address' "$WALLET_KEYS")
ADDR3=$(jq -r '.val3.address' "$WALLET_KEYS")
PK1=$(jq -r '.val1.public_key' "$WALLET_KEYS")
PK2=$(jq -r '.val2.public_key' "$WALLET_KEYS")
PK3=$(jq -r '.val3.public_key' "$WALLET_KEYS")

[ "$ADDR1" != "null" ] || die "val1 address missing in $WALLET_KEYS"
[ "$ADDR2" != "null" ] || die "val2 address missing in $WALLET_KEYS"
[ "$ADDR3" != "null" ] || die "val3 address missing in $WALLET_KEYS"

# Evidence: node_addrs.json
jq -n \
  --arg a1 "$ADDR1" --arg a2 "$ADDR2" --arg a3 "$ADDR3" \
  --arg p1 "$PK1"   --arg p2 "$PK2"   --arg p3 "$PK3" \
  --arg cid "$CHAIN_ID" \
  '{chain_id:$cid, validators:[
     {id:"val1", address:$a1, public_key_hex:$p1},
     {id:"val2", address:$a2, public_key_hex:$p2},
     {id:"val3", address:$a3, public_key_hex:$p3}
   ]}' > "$EVIDENCE_DIR/node_addrs.json"

log "Wrote $EVIDENCE_DIR/node_addrs.json"

# Genesis (lean-node uses this optionally to seed balances; provided for evidence)
GENESIS_TMP=$(mktemp)
jq -n \
  --arg cid "$CHAIN_ID" \
  --arg a1 "$ADDR1" --arg a2 "$ADDR2" --arg a3 "$ADDR3" \
  '{
     chain_id:$cid,
     dgt_allocations:{
       ($a1): "1000000000000",
       ($a2): "1000000000000",
       ($a3): "1000000000000"
     },
     drt_allocations:{
       ($a1): "5000000000000",
       ($a2): "5000000000000",
       ($a3): "5000000000000"
     },
     governance:{ enabled:true, quorum_bps:3333, voting_period_blocks:1000 },
     staking:{ enabled:true, unbonding_period_blocks:10000 }
   }' > "$GENESIS_TMP"

cp "$GENESIS_TMP" "$EVIDENCE_DIR/genesis.json"
cp "$GENESIS_TMP" "$CONFIG_DIR/node1/genesis.json"
cp "$GENESIS_TMP" "$CONFIG_DIR/node2/genesis.json"
cp "$GENESIS_TMP" "$CONFIG_DIR/node3/genesis.json"
rm -f "$GENESIS_TMP"
log "Wrote genesis to $EVIDENCE_DIR/genesis.json and node configs"

# Minimal alerts config to avoid warnings
for N in 1 2 3; do
  cat > "$CONFIG_DIR/node${N}/alerts.yaml" << 'YAML'
enabled: false
evaluation_interval_secs: 10
log_on_fire: true
rules:
  tps_drop:
    enabled: false
    threshold: 1
    consecutive: 3
  oracle_timeout:
    enabled: false
    threshold_ms: 5000
    consecutive: 3
  validator_offline:
    enabled: false
    offline_secs: 60
    consecutive: 3
YAML
done

# Bring up docker compose
log "Starting 3-node devnet via $COMPOSE_FILE ..."
if docker compose version >/dev/null 2>&1; then
  docker compose -f "$COMPOSE_FILE" up -d
else
  docker-compose -f "$COMPOSE_FILE" up -d
fi

# Wait for nodes to respond
log "Waiting for nodes to report /stats ..."
wait_http() {
  local url="$1"; local name="$2"; local tries=120
  until curl -sf "$url" >/dev/null 2>&1; do
    tries=$((tries-1)); [ $tries -le 0 ] && die "Timeout waiting for $name at $url";
    sleep 1
  done
}
wait_http http://localhost:3030/stats node1
wait_http http://localhost:3031/stats node2
wait_http http://localhost:3032/stats node3

# Initial status snapshot
"$ROOT_DIR/scripts/devnet/status.sh" | tee "$EVIDENCE_DIR/status.txt"

log "Devnet is up. Endpoints:"
echo "  - node1: http://localhost:3030  (alt: http://localhost:26657)"
echo "  - node2: http://localhost:3031  (alt: http://localhost:26660)"
echo "  - node3: http://localhost:3032  (alt: http://localhost:26663)"

exit 0

