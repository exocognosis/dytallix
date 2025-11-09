#!/bin/bash

# Dytallix Master Service Manager - Remote Server Edition
# Starts all services with FIXED ports on Hetzner server

set -e

# Fixed port configuration
FRONTEND_PORT=3000
BACKEND_PORT=3001
BLOCKCHAIN_PORT=3003
QUANTUMVAULT_PORT=3002
WEBSOCKET_PORT=3004

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base directory for remote server
BASE_DIR="/opt/dytallix-fast-launch"
LOG_DIR="/var/log/dytallix"

# Create logs directory
mkdir -p "$LOG_DIR"

echo -e "${BLUE}🚀 Dytallix Service Manager - Remote Server Edition${NC}"
echo "=============================================="
echo -e "Server IP:    ${GREEN}178.156.187.81${NC}"
echo -e "Frontend:     ${GREEN}http://178.156.187.81:${FRONTEND_PORT}${NC}"
echo -e "Backend API:  ${GREEN}http://178.156.187.81:${BACKEND_PORT}${NC}"
echo -e "Blockchain:   ${GREEN}http://178.156.187.81:${BLOCKCHAIN_PORT}${NC}"
echo -e "QuantumVault: ${GREEN}http://178.156.187.81:${QUANTUMVAULT_PORT}${NC}"
echo -e "WebSocket:    ${GREEN}ws://178.156.187.81:${WEBSOCKET_PORT}${NC}"
echo "=============================================="

# Function to check if port is in use
check_port() {
    local port=$1
    local service_name=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port $port is already in use (${service_name})${NC}"
        echo "   Killing existing process..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Function to start a service
start_service() {
    local service_name=$1
    local port=$2
    local command=$3
    local directory=$4
    
    echo -e "${BLUE}Starting ${service_name} on port ${port}...${NC}"
    check_port $port "$service_name"
    
    if [ -n "$directory" ]; then
        cd "$directory"
    fi
    
    # Start service in background and capture PID
    local log_name=$(echo "$service_name" | tr '[:upper:]' '[:lower:]')
    nohup bash -c "$command" > "$LOG_DIR/${log_name}.log" 2>&1 &
    local pid=$!
    
    # Wait a moment and check if service started
    sleep 5
    if kill -0 $pid 2>/dev/null; then
        echo -e "${GREEN}✅ ${service_name} started successfully (PID: $pid)${NC}"
        echo $pid > "$LOG_DIR/${log_name}.pid"
    else
        echo -e "${RED}❌ ${service_name} failed to start${NC}"
        echo "Last 20 lines of log:"
        tail -20 "$LOG_DIR/${log_name}.log" 2>/dev/null || echo "No log available"
        return 1
    fi
    
    cd - >/dev/null 2>&1 || true
}

# Stop all existing services
echo -e "${YELLOW}🛑 Stopping existing services...${NC}"

# Kill old processes
pkill -f "dytallix-node" 2>/dev/null || true
pkill -f "quantumvault-api" 2>/dev/null || true
pkill -f "server/index.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 3

# Export environment variables
export PORT=$BACKEND_PORT
export FRONTEND_PORT=$FRONTEND_PORT
export BLOCKCHAIN_PORT=$BLOCKCHAIN_PORT
export QUANTUMVAULT_PORT=$QUANTUMVAULT_PORT
export WEBSOCKET_PORT=$WEBSOCKET_PORT
export NODE_ENV=production

# Start services in order
echo -e "${BLUE}🔧 Starting services...${NC}"

# Check if Rust/Cargo is available
if command -v cargo >/dev/null 2>&1; then
    # 1. Blockchain Core (Rust)
    start_service "Blockchain" $BLOCKCHAIN_PORT \
        "cd /opt/dytallix-main && cargo run --package dytallix-node --bin dytallix-node --release" \
        "/opt/dytallix-main"
else
    echo -e "${YELLOW}⚠️  Cargo not found, skipping blockchain service${NC}"
fi

# 2. QuantumVault API (Node.js)
if [ -d "$BASE_DIR/services/quantumvault-api" ]; then
    start_service "QuantumVault" $QUANTUMVAULT_PORT \
        "cd $BASE_DIR/services/quantumvault-api && PORT=$QUANTUMVAULT_PORT node server.js" \
        "$BASE_DIR/services/quantumvault-api"
else
    echo -e "${YELLOW}⚠️  QuantumVault directory not found${NC}"
fi

# 3. Backend API (Node.js)
if [ -d "$BASE_DIR/server" ]; then
    start_service "Backend" $BACKEND_PORT \
        "cd $BASE_DIR && PORT=$BACKEND_PORT node server/index.js" \
        "$BASE_DIR"
else
    echo -e "${YELLOW}⚠️  Backend directory not found${NC}"
fi

# 4. Frontend (Vite) - Build and serve with production build
if [ -d "$BASE_DIR/frontend" ]; then
    # Check if we should build or use dev server
    if [ -d "$BASE_DIR/frontend/dist" ]; then
        echo -e "${BLUE}Using production build...${NC}"
        start_service "Frontend" $FRONTEND_PORT \
            "cd $BASE_DIR/frontend && npx serve -s dist -l $FRONTEND_PORT" \
            "$BASE_DIR/frontend"
    else
        echo -e "${BLUE}Using dev server...${NC}"
        start_service "Frontend" $FRONTEND_PORT \
            "cd $BASE_DIR/frontend && npm run dev -- --port $FRONTEND_PORT --host 0.0.0.0" \
            "$BASE_DIR/frontend"
    fi
else
    echo -e "${YELLOW}⚠️  Frontend directory not found${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Services started on remote server!${NC}"
echo "=============================================="
echo -e "Public URL:   ${GREEN}https://dytallix.com${NC}"
echo -e "Server IP:    ${GREEN}178.156.187.81${NC}"
echo ""
echo -e "Frontend:     ${GREEN}http://178.156.187.81:${FRONTEND_PORT}${NC}"
echo -e "Backend API:  ${GREEN}http://178.156.187.81:${BACKEND_PORT}${NC}"
echo -e "Blockchain:   ${GREEN}http://178.156.187.81:${BLOCKCHAIN_PORT}${NC}"
echo -e "QuantumVault: ${GREEN}http://178.156.187.81:${QUANTUMVAULT_PORT}${NC}"
echo "=============================================="
echo ""
echo -e "${BLUE}📋 Service Management:${NC}"
echo "  • View logs: tail -f $LOG_DIR/[service].log"
echo "  • Check status: systemctl status dytallix-*"
echo "  • Restart: $BASE_DIR/start-all-services-remote.sh"
echo ""
echo -e "${YELLOW}🔗 Services are running in the background with nohup${NC}"
echo ""
echo "To check service health:"
echo "  curl http://localhost:3000"
echo "  curl http://localhost:3001/health"
echo "  curl http://localhost:3002/health"
echo "  curl http://localhost:3003/health"
