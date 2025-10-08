#!/usr/bin/env bash
# Dytallix Fast Launch - Full Stack E2E Orchestration
# Starts: Rust node, Backend API server, Frontend (Vite)
# Optionally starts: Faucet via docker-compose
#
# Usage:
#   scripts/full-stack-e2e.sh start [--with-faucet] [--ws|--no-ws]
#   scripts/full-stack-e2e.sh stop
#   scripts/full-stack-e2e.sh status
#   scripts/full-stack-e2e.sh logs
#
# Notes:
# - Designed for local macOS dev; requires bash, curl, jq, npm, cargo. Docker optional for faucet.
# - Creates ./e2e-artifacts for logs and PIDs.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ART_DIR="$ROOT_DIR/e2e-artifacts"
LOG_DIR="$ART_DIR/logs"
PID_DIR="$ART_DIR/pids"
TMP_DIR="$ART_DIR/tmp"
mkdir -p "$LOG_DIR" "$PID_DIR" "$TMP_DIR"

# Ports
NODE_HTTP_PORT="3030"
BACKEND_PORT="8787"
FRONTEND_PORT="5173"

# Env wiring
export RPC_HTTP_URL="http://localhost:${NODE_HTTP_PORT}"
export VITE_RPC_HTTP_URL="$RPC_HTTP_URL"
export VITE_API_URL="http://localhost:${BACKEND_PORT}"
export ALLOWED_ORIGIN="http://localhost:${FRONTEND_PORT}"

# Load .env if present (allows overriding defaults without code edits)
if [ -f "$ROOT_DIR/.env" ]; then
  # shellcheck disable=SC1090
  set -a; . "$ROOT_DIR/.env"; set +a
fi

# Centralized default for WebSocket enablement (can be overridden by .env or CLI flags)
export DYT_WS_ENABLED="${DYT_WS_ENABLED:-true}"

# Helpers
log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "$LOG_DIR/orchestrator.log"; }
need() { command -v "$1" >/dev/null 2>&1 || { log "Missing dependency: $1"; exit 1; }; }
port_in_use() { lsof -iTCP:"$1" -sTCP:LISTEN -nP >/dev/null 2>&1; }
write_pid() { echo "$2" > "$PID_DIR/$1.pid"; }
read_pid() { [ -f "$PID_DIR/$1.pid" ] && cat "$PID_DIR/$1.pid" | tr -d '\n' || true; }
rm_pid() { rm -f "$PID_DIR/$1.pid"; }

# Normalize boolean-like values to "true"/"false"
normalize_bool() {
  local v="${1:-}"; local lower
  lower="$(printf '%s' "$v" | tr '[:upper:]' '[:lower:]')"
  case "$lower" in
    1|true|yes|on|y) echo "true" ;;
    0|false|no|off|n|"") echo "false" ;;
    *) echo "$lower" ;;
  esac
}

# Health checks
wait_http_ok() {
  local name="$1" url="$2" timeout="${3:-60}" interval=1
  for ((i=1;i<=timeout;i++)); do
    if curl -fsS "$url" >/dev/null 2>&1; then 
      log "$name ready at $url"
      return 0
    fi
    sleep "$interval"
  done
  log "Timeout waiting for $name at $url"
  return 1
}

ensure_npm_install() {
  local dir="$1"
  if [ ! -d "$dir/node_modules" ]; then
    log "Installing npm dependencies in $dir"
    (cd "$dir" && npm install >/dev/null 2>"$LOG_DIR/npm-install-$(basename "$dir").err") || {
      log "npm install failed in $dir (see logs)"
      return 1
    }
  fi
}

start_node() {
  if port_in_use "$NODE_HTTP_PORT"; then 
    log "Node port $NODE_HTTP_PORT already in use"
    return 0
  fi
  
  log "Starting Rust node on :$NODE_HTTP_PORT"
  (
    cd "$ROOT_DIR/node"
    # Minimal env for node
    export DYT_CHAIN_ID="${DYT_CHAIN_ID:-dytallix-testnet-1}"
    export DYT_DATA_DIR="${DYT_DATA_DIR:-$ART_DIR/node-data}"
    export DYT_BLOCK_INTERVAL_MS="${DYT_BLOCK_INTERVAL_MS:-2000}"
    export DYT_EMPTY_BLOCKS="${DYT_EMPTY_BLOCKS:-true}"
    # DYT_WS_ENABLED inherited from top-level
    mkdir -p "$DYT_DATA_DIR"

    # Pre-build to avoid long first-run compile delays
    if [ ! -d target ] || [ -z "$(ls -A target/debug 2>/dev/null || true)" ]; then
      log "Building node (first run may take several minutes)"
      cargo build --quiet --bin dytallix-fast-node >"$LOG_DIR/node.build.out" 2>"$LOG_DIR/node.build.err" || {
        log "Node build failed; see $LOG_DIR/node.build.err"
        exit 1
      }
    fi

    # Run node (explicit bin since package defines multiple binaries)
    cargo run --quiet --bin dytallix-fast-node >"$LOG_DIR/node.out" 2>"$LOG_DIR/node.err" &
    write_pid node $!
  )

  # Allow extended time on first build/start
  local node_wait="${NODE_START_TIMEOUT:-600}"
  local ok=0
  for ((i=1;i<=node_wait;i++)); do
    if curl -fsS "$RPC_HTTP_URL/stats" >/dev/null 2>&1 || curl -fsS "$RPC_HTTP_URL/api/stats" >/dev/null 2>&1; then
      log "node ready at $RPC_HTTP_URL"
      ok=1
      break
    fi
    sleep 1
  done
  
  if [ "$ok" -ne 1 ]; then
    log "Timeout waiting for node at $RPC_HTTP_URL (waited ${node_wait}s)"
    return 1
  fi
}

start_backend() {
  if port_in_use "$BACKEND_PORT"; then 
    log "Backend port $BACKEND_PORT already in use"
    return 0
  fi
  
  log "Starting backend server on :$BACKEND_PORT"
  ensure_npm_install "$ROOT_DIR"
  (
    cd "$ROOT_DIR"
    export PORT="$BACKEND_PORT"
    export ALLOWED_ORIGIN
    export RPC_HTTP_URL
    # Propagate WS flag for backend awareness
    export WS_ENABLED="$DYT_WS_ENABLED"
    export BACKEND_WS_ENABLED="$DYT_WS_ENABLED"
    npm run server >"$LOG_DIR/backend.out" 2>"$LOG_DIR/backend.err" &
    write_pid backend $!
  )
  wait_http_ok "backend" "http://localhost:${BACKEND_PORT}/api/status" 60
}

start_frontend() {
  if port_in_use "$FRONTEND_PORT"; then 
    log "Frontend port $FRONTEND_PORT already in use"
    return 0
  fi
  
  log "Starting frontend (Vite) on :$FRONTEND_PORT"
  ensure_npm_install "$ROOT_DIR"
  (
    cd "$ROOT_DIR"
    export VITE_RPC_HTTP_URL
    export VITE_API_URL
    # Propagate WS flag for frontend awareness
    export VITE_WS_ENABLED="$DYT_WS_ENABLED"
    npm run dev >"$LOG_DIR/frontend.out" 2>"$LOG_DIR/frontend.err" &
    write_pid frontend $!
  )
  wait_http_ok "frontend" "http://localhost:${FRONTEND_PORT}" 60
}

DOCKER_COMPOSE_BIN=""
ensure_docker_compose() {
  if command -v docker >/dev/null 2>&1; then
    if docker compose version >/dev/null 2>&1; then 
      DOCKER_COMPOSE_BIN="docker compose"
    elif command -v docker-compose >/dev/null 2>&1; then 
      DOCKER_COMPOSE_BIN="docker-compose"
    fi
  fi
}

start_faucet() {
  ensure_docker_compose
  local compose_file="$ROOT_DIR/docker-compose.faucet.yml"
  
  if [ -z "$DOCKER_COMPOSE_BIN" ]; then
    log "Docker Compose not available; skipping faucet"
    return 0
  fi
  
  if [ ! -f "$compose_file" ]; then
    log "Faucet compose file not found; skipping"
    return 0
  fi
  
  log "Starting faucet via docker compose"
  (cd "$ROOT_DIR" && $DOCKER_COMPOSE_BIN -f "$compose_file" up -d)
}

stop_proc() {
  local name="$1"
  local pid
  pid=$(read_pid "$name" || true)
  
  if [ -n "${pid:-}" ] && kill -0 "$pid" >/dev/null 2>&1; then
    log "Stopping $name (pid=$pid)"
    kill "$pid" >/dev/null 2>&1 || true
    
    # Wait for graceful shutdown
    for i in {1..20}; do 
      if ! kill -0 "$pid" >/dev/null 2>&1; then
        break
      fi
      sleep 0.3
    done
    
    # Force kill if still running
    kill -9 "$pid" >/dev/null 2>&1 || true
  fi
  rm_pid "$name"
}

stop() {
  log "Stopping services"
  for svc in frontend backend node; do 
    stop_proc "$svc"
  done
}

status() {
  echo "Service Status:"
  echo "---------------"
  echo "- node:         $(curl -fsS "$RPC_HTTP_URL/stats" >/dev/null 2>&1 && echo "✓ up" || echo "✗ down")"
  echo "- backend:      $(curl -fsS "http://localhost:${BACKEND_PORT}/api/status" >/dev/null 2>&1 && echo "✓ up" || echo "✗ down")"
  echo "- frontend:     $(curl -fsS "http://localhost:${FRONTEND_PORT}" >/dev/null 2>&1 && echo "✓ up" || echo "✗ down")"
}

logs() {
  log "Tailing logs (Ctrl-C to stop)"
  tail -n +1 -F \
    "$LOG_DIR/orchestrator.log" \
    "$LOG_DIR/node.out" "$LOG_DIR/node.err" \
    "$LOG_DIR/backend.out" "$LOG_DIR/backend.err" \
    "$LOG_DIR/frontend.out" "$LOG_DIR/frontend.err" 2>/dev/null || true
}

start_all() {
  local with_faucet="${WITH_FAUCET:-0}"
  
  # Validate deps
  need curl
  need jq
  need npm
  need cargo
  
  log "========================================"
  log "Dytallix Fast Launch - Starting Services"
  log "========================================"
  
  # Core services
  start_node
  start_backend
  start_frontend
  
  # Optional faucet
  if [ "$with_faucet" = "1" ]; then 
    start_faucet
  else 
    log "Faucet disabled (enable with --with-faucet)"
  fi
  
  log "========================================"
  log "All services launched successfully!"
  log "========================================"
  echo ""
  status
  echo ""
  log "Access the application at: http://localhost:${FRONTEND_PORT}"
  log "Node RPC at: $RPC_HTTP_URL"
  log "Backend API at: http://localhost:${BACKEND_PORT}"
}

# CLI argument parsing
cmd="${1:-}"; shift || true
WITH_FAUCET=0

while [ $# -gt 0 ]; do
  case "$1" in
    --with-faucet) WITH_FAUCET=1 ;;
    --no-ws|--disable-ws) DYT_WS_ENABLED=false ;;
    --ws|--enable-ws) DYT_WS_ENABLED=true ;;
    *) ;;
  esac
  shift || true
done

# Normalize and export WS flag after parsing CLI (CLI > .env > default)
DYT_WS_ENABLED="$(normalize_bool "${DYT_WS_ENABLED:-true}")"
export DYT_WS_ENABLED

case "$cmd" in
  start) start_all ;;
  stop) stop ;;
  status) status ;;
  logs) logs ;;
  *) 
    echo "Dytallix Fast Launch Orchestrator"
    echo ""
    echo "Usage: $0 {start|stop|status|logs} [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  start   - Start all services (node, backend, frontend)"
    echo "  stop    - Stop all running services"
    echo "  status  - Check status of all services"
    echo "  logs    - Tail logs from all services"
    echo ""
    echo "Options:"
    echo "  --with-faucet     Start the faucet service (requires Docker)"
    echo "  --ws              Enable WebSocket support (default)"
    echo "  --no-ws           Disable WebSocket support"
    echo ""
    exit 1
    ;;
esac
