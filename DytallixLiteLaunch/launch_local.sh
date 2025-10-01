#!/usr/bin/env bash
# Launch DytallixLiteLaunch locally (node + faucet)
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
  info "Starting Dytallix node..."
  (cd "$NODE_DIR" && "${COMPOSE_CMD[@]}" up -d)
else
  error "Node compose file not found at $NODE_DIR/docker-compose.yml"
  exit 1
fi

# Wait for node RPC to come up
info "Waiting for node RPC (http://localhost:26657/status)..."
READY=0
for i in {1..30}; do
  if curl -sf "http://localhost:26657/status" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 2
  [[ $i -eq 10 ]] && warn "Still waiting for node..."
done
if [[ $READY -eq 1 ]]; then
  success "Node is responding"
else
  warn "Node is not responding yet; continuing"
fi

# Start faucet if available
if [[ -f "$FAUCET_DIR/docker-compose.faucet.yml" ]]; then
  info "Starting faucet..."
  (cd "$FAUCET_DIR" && "${COMPOSE_CMD[@]}" -f docker-compose.faucet.yml up -d)
else
  warn "Faucet compose not found; skipping"
fi

cat <<EOF
${GREEN}DytallixLiteLaunch is starting${NC}

Endpoints:
  - Node RPC:           http://localhost:26657
  - REST API (node):    http://localhost:1317
  - gRPC (node):        localhost:9090
  - Prometheus metrics: http://localhost:9464
  - Faucet:             http://localhost:8787 (if enabled)

Useful:
  - View node logs: (cd "$NODE_DIR" && ${COMPOSE_CMD[*]} logs -f)
  - Stop services:  (cd "$NODE_DIR" && ${COMPOSE_CMD[*]} down) && (cd "$FAUCET_DIR" && ${COMPOSE_CMD[*]} -f docker-compose.faucet.yml down)
EOF
