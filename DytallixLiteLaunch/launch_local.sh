#!/usr/bin/env bash
# Launch DytallixLiteLaunch locally (node only, Rust API)
set -euo pipefail

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
info() { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR"
NODE_DIR="$ROOT_DIR/node"
FAUCET_DIR="$ROOT_DIR/faucet"

# Pick docker compose command
if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  error "docker compose or docker-compose not found"
  exit 1
fi

# Basic checks
if ! command -v docker >/dev/null 2>&1; then
  error "Docker is not installed"
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  error "Docker daemon is not running"
  exit 1
fi

# Ensure .env files exist where provided
create_env_if_missing() {
  local dir="$1"
  if [[ -f "$dir/.env.example" && ! -f "$dir/.env" ]]; then
    cp "$dir/.env.example" "$dir/.env"
    info "Created $dir/.env from .env.example"
  fi
}
create_env_if_missing "$ROOT_DIR"
create_env_if_missing "$NODE_DIR"
create_env_if_missing "$FAUCET_DIR"

# Start blockchain node
if [[ -f "$NODE_DIR/docker-compose.yml" ]]; then
  info "Starting Dytallix node (Rust API on :3030)..."
  (cd "$NODE_DIR" && "${COMPOSE_CMD[@]}" up -d --build)
else
  error "Node compose file not found at $NODE_DIR/docker-compose.yml"
  exit 1
fi

# Wait for node API to come up
API_URL="http://localhost:3030/health"
info "Waiting for node API ($API_URL)..."
READY=0
for i in {1..30}; do
  if curl -sf "$API_URL" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 2
  [[ $i -eq 10 ]] && warn "Still waiting for node API..."
done
if [[ $READY -eq 1 ]]; then
  success "Node API is responding"
else
  warn "Node API is not responding yet; continuing"
fi

# Faucet currently expects Tendermint ports (26657/1317); skip for Rust API mode
if [[ -f "$FAUCET_DIR/docker-compose.faucet.yml" ]]; then
  warn "Skipping faucet start: requires Tendermint RPC/REST (26657/1317) not provided by Rust API node"
fi

cat <<EOF
${GREEN}DytallixLiteLaunch (Rust API mode) is starting${NC}

Endpoints:
  - Node HTTP API:      http://localhost:3030
  - Health:             http://localhost:3030/health

Useful:
  - View node logs: (cd "$NODE_DIR" && ${COMPOSE_CMD[*]} logs -f)
  - Stop services:  (cd "$NODE_DIR" && ${COMPOSE_CMD[*]} down)
EOF
