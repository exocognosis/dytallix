#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.devnet.yml"
DATA_DIR="$ROOT_DIR/.devnet"

log() { echo "[devnet] $*"; }

log "Stopping devnet containers ..."
if docker compose version >/dev/null 2>&1; then
  docker compose -f "$COMPOSE_FILE" down -v --remove-orphans || true
else
  docker-compose -f "$COMPOSE_FILE" down -v --remove-orphans || true
fi

log "Cleaning local data directories ..."
rm -rf "$DATA_DIR/node1" "$DATA_DIR/node2" "$DATA_DIR/node3" 2>/dev/null || true
mkdir -p "$DATA_DIR/node1" "$DATA_DIR/node2" "$DATA_DIR/node3"

log "Teardown complete"

