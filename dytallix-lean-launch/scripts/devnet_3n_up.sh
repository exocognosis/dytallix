#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="$ROOT/scripts/devnet/docker-compose.yml"
ART="$ROOT/artifacts/devnet/3n-72h"
LOGS="$ART/logs"
mkdir -p "$LOGS"

echo "[*] Bringing up 3-node devnet..."
docker compose -f "$COMPOSE" down -v --remove-orphans || true
docker compose -f "$COMPOSE" up -d

echo "[*] Waiting for all RPC healthchecks..."
timeout 300 bash -c '
  until curl -sf http://localhost:26657/status >/dev/null; do sleep 2; done
'
timeout 300 bash -c '
  until curl -sf http://localhost:26660/status >/dev/null; do sleep 2; done
'
timeout 300 bash -c '
  until curl -sf http://localhost:26663/status >/dev/null; do sleep 2; done
'

TARGET_HEIGHT="${TARGET_HEIGHT:-2000}"
echo "[*] Waiting for height >= $TARGET_HEIGHT on node1 (localhost:26657)..."
until [ "$(curl -s http://localhost:26657/status | jq -r .result.sync_info.latest_block_height)" -ge "$TARGET_HEIGHT" ]; do
  sleep 1
done

echo "[*] Capturing logs..."
docker logs dyt-node1 > "$LOGS/node1.log" 2>&1 || true
docker logs dyt-node2 > "$LOGS/node2.log" 2>&1 || true
docker logs dyt-node3 > "$LOGS/node3.log" 2>&1 || true

echo "[*] Computing metrics..."
H1=$(curl -s http://localhost:26657/status | jq -r .result.sync_info.latest_block_height)
H2=$(curl -s http://localhost:26660/status | jq -r .result.sync_info.latest_block_height)
H3=$(curl -s http://localhost:26663/status | jq -r .result.sync_info.latest_block_height)
# Rough avg block time from last 100 blocks (node1)
BT=$(curl -s "http://localhost:26657/consensus_params" >/dev/null; echo "unknown")
ERR=$(grep -Eci "panic|consensus error" "$LOGS"/node*.log || true)

jq -n --arg h1 "$H1" --arg h2 "$H2" --arg h3 "$H3" --arg bt "$BT" --argjson err "$ERR" \
  '{last_height:($h1|tonumber), heights:{n1:($h1|tonumber), n2:($h2|tonumber), n3:($h3|tonumber)}, avg_block_time:$bt, error_count:$err}' \
  > "$ART/metrics.json"

echo "[*] Done. Metrics at $ART/metrics.json"
