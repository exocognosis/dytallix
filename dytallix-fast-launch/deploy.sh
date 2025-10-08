#!/usr/bin/env bash
# Dytallix Fast Launch - Mission Critical Deployment
# Deploys: Node, API/Faucet, Frontend, Evidence Generation
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT_DIR/logs"
PID_DIR="$ROOT_DIR/.pids"
EVID_DIR="$ROOT_DIR/launch-evidence"

mkdir -p "$LOG_DIR" "$PID_DIR" "$EVID_DIR"

# Configuration
NODE_PORT="${NODE_PORT:-3030}"
API_PORT="${API_PORT:-8787}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
RPC_URL="http://localhost:${NODE_PORT}"
API_URL="http://localhost:${API_PORT}"

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $*"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')]${NC} ⚠️  $*"; }
error() { echo -e "${RED}[$(date '+%H:%M:%S')]${NC} ❌ $*"; exit 1; }

# Health check helper
wait_for_service() {
  local name="$1" url="$2" max_wait="${3:-60}"
  log "Waiting for $name at $url..."
  for i in $(seq 1 $max_wait); do
    if curl -sf "$url" >/dev/null 2>&1; then
      log "✅ $name is ready"
      return 0
    fi
    sleep 1
  done
  error "$name failed to start after ${max_wait}s"
}

# Cleanup function
cleanup() {
  log "Stopping services..."
  if [ -f "$PID_DIR/node.pid" ]; then kill $(cat "$PID_DIR/node.pid") 2>/dev/null || true; fi
  if [ -f "$PID_DIR/api.pid" ]; then kill $(cat "$PID_DIR/api.pid") 2>/dev/null || true; fi
  if [ -f "$PID_DIR/frontend.pid" ]; then kill $(cat "$PID_DIR/frontend.pid") 2>/dev/null || true; fi
  rm -f "$PID_DIR"/*.pid
}

trap cleanup EXIT INT TERM

# ============================================================================
# 1. PRE-FLIGHT CHECKS
# ============================================================================
log "🔍 Pre-flight checks..."

# Check required commands
for cmd in node npm cargo jq curl; do
  if ! command -v $cmd >/dev/null 2>&1; then
    error "$cmd is not installed"
  fi
done

# Check if ports are available
for port in $NODE_PORT $API_PORT $FRONTEND_PORT; do
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    error "Port $port is already in use"
  fi
done

# ============================================================================
# 2. INSTALL DEPENDENCIES
# ============================================================================
log "📦 Installing dependencies..."

# Root dependencies (frontend)
if [ ! -d "$ROOT_DIR/node_modules" ]; then
  log "Installing frontend dependencies..."
  cd "$ROOT_DIR" && npm install >"$LOG_DIR/npm-frontend.log" 2>&1 || error "Frontend npm install failed"
fi

# Server dependencies
if [ -d "$ROOT_DIR/server" ] && [ ! -d "$ROOT_DIR/server/node_modules" ]; then
  log "Installing server dependencies..."
  cd "$ROOT_DIR/server" && npm install >"$LOG_DIR/npm-server.log" 2>&1 || error "Server npm install failed"
fi

# ============================================================================
# 3. BUILD NODE (if needed)
# ============================================================================
log "🔧 Building blockchain node..."

if [ -d "$ROOT_DIR/node" ] && [ -f "$ROOT_DIR/node/Cargo.toml" ]; then
  cd "$ROOT_DIR/node"
  if [ ! -f "target/release/dytallix-lean-node" ] && [ ! -f "target/debug/dytallix-lean-node" ]; then
    log "Building node (this may take a few minutes)..."
    cargo build --release >"$LOG_DIR/node-build.log" 2>&1 || {
      warn "Release build failed, trying debug build..."
      cargo build >"$LOG_DIR/node-build-debug.log" 2>&1 || error "Node build failed"
    }
  else
    log "Node binary already exists"
  fi
fi

# ============================================================================
# 4. START BLOCKCHAIN NODE
# ============================================================================
log "🚀 Starting blockchain node on port $NODE_PORT..."

cd "$ROOT_DIR/node" || error "Node directory not found"

export DYT_CHAIN_ID="${DYT_CHAIN_ID:-dyt-local-1}"
export DYT_DATA_DIR="${DYT_DATA_DIR:-$ROOT_DIR/data}"
export DYT_GENESIS_FILE="${DYT_GENESIS_FILE:-$ROOT_DIR/genesis.json}"
export DYT_BLOCK_INTERVAL_MS="${DYT_BLOCK_INTERVAL_MS:-2000}"

mkdir -p "$DYT_DATA_DIR"

# Start node
if [ -f "target/release/dytallix-lean-node" ]; then
  NODE_BIN="target/release/dytallix-lean-node"
elif [ -f "target/debug/dytallix-lean-node" ]; then
  NODE_BIN="target/debug/dytallix-lean-node"
else
  error "Node binary not found"
fi

RUST_LOG=info ./"$NODE_BIN" --rpc ":$NODE_PORT" >"$LOG_DIR/node.log" 2>&1 &
echo $! > "$PID_DIR/node.pid"

wait_for_service "Node" "$RPC_URL/health" 60

# ============================================================================
# 5. START API/FAUCET SERVER
# ============================================================================
log "🚀 Starting API/Faucet server on port $API_PORT..."

cd "$ROOT_DIR/server" || cd "$ROOT_DIR" || error "Server directory not found"

export PORT="$API_PORT"
export RPC_HTTP_URL="$RPC_URL"
export ALLOWED_ORIGIN="http://localhost:${FRONTEND_PORT}"
export NODE_ENV="${NODE_ENV:-development}"

# Load .env if exists
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  source "$ROOT_DIR/.env"
  set +a
fi

node index.js >"$LOG_DIR/api.log" 2>&1 &
echo $! > "$PID_DIR/api.pid"

wait_for_service "API" "$API_URL/api/status" 60

# ============================================================================
# 6. START FRONTEND
# ============================================================================
log "🚀 Starting frontend on port $FRONTEND_PORT..."

cd "$ROOT_DIR"

export VITE_RPC_HTTP_URL="$RPC_URL"
export VITE_API_URL="$API_URL"
export VITE_CHAIN_ID="$DYT_CHAIN_ID"

npm run dev >"$LOG_DIR/frontend.log" 2>&1 &
echo $! > "$PID_DIR/frontend.pid"

wait_for_service "Frontend" "http://localhost:${FRONTEND_PORT}" 60

# ============================================================================
# 7. RUN HEALTH CHECKS
# ============================================================================
log "🏥 Running health checks..."

# Node health
NODE_STATUS=$(curl -sf "$RPC_URL/stats" | jq -r '.height // 0' 2>/dev/null || echo "0")
if [ "$NODE_STATUS" = "0" ]; then
  warn "Node may not be producing blocks"
else
  log "✅ Node at height: $NODE_STATUS"
fi

# API health
API_STATUS=$(curl -sf "$API_URL/api/status" | jq -r '.ok // false' 2>/dev/null || echo "false")
if [ "$API_STATUS" != "true" ]; then
  warn "API health check returned: $API_STATUS"
else
  log "✅ API is healthy"
fi

# Frontend health
if curl -sf "http://localhost:${FRONTEND_PORT}" >/dev/null 2>&1; then
  log "✅ Frontend is serving"
else
  warn "Frontend may not be ready"
fi

# ============================================================================
# 8. GENERATE EVIDENCE (Optional)
# ============================================================================
if [ "${GENERATE_EVIDENCE:-true}" = "true" ]; then
  log "📊 Generating deployment evidence..."
  
  # Create evidence directory structure
  mkdir -p "$EVID_DIR"/{node,api,frontend,metrics}
  
  # Capture node info
  curl -sf "$RPC_URL/stats" > "$EVID_DIR/node/stats.json" 2>/dev/null || true
  curl -sf "$RPC_URL/status" > "$EVID_DIR/node/status.json" 2>/dev/null || true
  
  # Capture API info
  curl -sf "$API_URL/api/status" > "$EVID_DIR/api/status.json" 2>/dev/null || true
  
  # System metrics
  {
    echo "# Deployment Evidence - $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo ""
    echo "## Services"
    echo "- Node RPC: $RPC_URL (Height: $NODE_STATUS)"
    echo "- API/Faucet: $API_URL"
    echo "- Frontend: http://localhost:${FRONTEND_PORT}"
    echo ""
    echo "## PIDs"
    echo "- Node: $(cat $PID_DIR/node.pid 2>/dev/null || echo 'N/A')"
    echo "- API: $(cat $PID_DIR/api.pid 2>/dev/null || echo 'N/A')"
    echo "- Frontend: $(cat $PID_DIR/frontend.pid 2>/dev/null || echo 'N/A')"
  } > "$EVID_DIR/DEPLOYMENT_SUMMARY.md"
  
  log "✅ Evidence written to $EVID_DIR"
fi

# ============================================================================
# DEPLOYMENT COMPLETE
# ============================================================================
echo ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "✅ DYTALLIX FAST LAUNCH DEPLOYMENT COMPLETE"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Access Points:"
echo "   Frontend:    http://localhost:${FRONTEND_PORT}"
echo "   Faucet:      http://localhost:${FRONTEND_PORT}/faucet"
echo "   API:         $API_URL"
echo "   RPC:         $RPC_URL"
echo ""
echo "📊 Monitoring:"
echo "   Node Stats:  $RPC_URL/stats"
echo "   API Status:  $API_URL/api/status"
echo "   Logs:        $LOG_DIR/"
echo ""
echo "📝 Documentation:"
echo "   Developer Docs: http://localhost:${FRONTEND_PORT}/dev-resources"
echo "   API Docs:       $API_URL/api/docs"
echo ""
echo "🔧 Control:"
echo "   Stop:  Press Ctrl+C"
echo "   Logs:  tail -f $LOG_DIR/*.log"
echo ""
log "System is ready for development and testing!"
echo ""

# Keep script running
wait
