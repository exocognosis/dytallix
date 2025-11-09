#!/bin/bash

# Dytallix Master Service Manager
# Starts all services with FIXED ports - no more random port assignment!
# Updated to serve new web structure from PR #223:
#   - Homepage at /
#   - Developer pages at /build/
#   - Enterprise pages at /quantumvault/ (alias for legacy /quantumshield/)

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

# Create logs directory
mkdir -p logs

echo -e "${BLUE}🚀 Dytallix Service Manager - Fixed Port Edition${NC}"
echo "=============================================="
echo -e "Frontend:     ${GREEN}http://localhost:${FRONTEND_PORT}${NC}"
echo -e "Backend API:  ${GREEN}http://localhost:${BACKEND_PORT}${NC}"
echo -e "Blockchain:   ${GREEN}http://localhost:${BLOCKCHAIN_PORT}${NC}"
echo -e "QuantumVault: ${GREEN}http://localhost:${QUANTUMVAULT_PORT}${NC}"
echo -e "WebSocket:    ${GREEN}ws://localhost:${WEBSOCKET_PORT}${NC}"
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
    
    # Create logs directory in the fast-launch root
    local base_dir="/Users/rickglenn/Downloads/dytallix-main/dytallix-fast-launch"
    mkdir -p "$base_dir/logs"
    
    if [ -n "$directory" ]; then
        cd "$directory"
    fi
    
    # Start service in background and capture PID
    local log_name=$(echo "$service_name" | tr '[:upper:]' '[:lower:]')
    eval "$command" > "$base_dir/logs/${log_name}.log" 2>&1 &
    local pid=$!
    
    # Wait a moment and check if service started
    sleep 3
    if kill -0 $pid 2>/dev/null; then
        echo -e "${GREEN}✅ ${service_name} started successfully (PID: $pid)${NC}"
        echo $pid > "$base_dir/logs/${log_name}.pid"
    else
        echo -e "${RED}❌ ${service_name} failed to start${NC}"
        tail -10 "$base_dir/logs/${log_name}.log"
        return 1
    fi
    
    cd - >/dev/null 2>&1 || true
}

# Stop all existing services
echo -e "${YELLOW}🛑 Stopping existing services...${NC}"
./stop-services.sh 2>/dev/null || true

# Export environment variables (avoid setting global PORT to prevent conflicts)
export FRONTEND_PORT=$FRONTEND_PORT
export BACKEND_PORT=$BACKEND_PORT
export BLOCKCHAIN_PORT=$BLOCKCHAIN_PORT
export QUANTUMVAULT_PORT=$QUANTUMVAULT_PORT
export WEBSOCKET_PORT=$WEBSOCKET_PORT

# Start services in order
echo -e "${BLUE}🔧 Starting services...${NC}"

# 1. Blockchain Core (Rust)
start_service "Blockchain" $BLOCKCHAIN_PORT \
    "DYT_RPC_PORT=$BLOCKCHAIN_PORT cargo run --release --package dytallix-fast-node --bin dytallix-fast-node" \
    "/Users/rickglenn/Downloads/dytallix-main/dytallix-fast-launch"

# 2. QuantumVault API (Node.js)
start_service "QuantumVault" $QUANTUMVAULT_PORT \
    "PORT=$QUANTUMVAULT_PORT BLOCKCHAIN_API_URL=http://localhost:$BLOCKCHAIN_PORT node server.js" \
    "/Users/rickglenn/Downloads/dytallix-main/dytallix-fast-launch/services/quantumvault-api"

# 3. Backend API (Node.js)
start_service "Backend" $BACKEND_PORT \
    "PORT=$BACKEND_PORT node server/index.js" \
    "/Users/rickglenn/Downloads/dytallix-main/dytallix-fast-launch"

# 4. Frontend (Static Server for new web structure - PR #223)
start_service "Frontend" $FRONTEND_PORT \
    "PORT=$FRONTEND_PORT node serve-static.js" \
    "/Users/rickglenn/Downloads/dytallix-main/dytallix-fast-launch"

echo ""
echo -e "${GREEN}🎉 All services started successfully!${NC}"
echo "=============================================="
echo -e "Frontend:     ${GREEN}http://localhost:${FRONTEND_PORT}${NC}"
echo -e "  • Homepage: ${GREEN}http://localhost:${FRONTEND_PORT}/${NC}"
echo -e "  • Build:    ${GREEN}http://localhost:${FRONTEND_PORT}/build/${NC}"
echo -e "  • Shield:   ${GREEN}http://localhost:${FRONTEND_PORT}/quantumvault/${NC} (alias, legacy /quantumshield redirects)"
echo -e "Backend API:  ${GREEN}http://localhost:${BACKEND_PORT}${NC}"
echo -e "Blockchain:   ${GREEN}http://localhost:${BLOCKCHAIN_PORT}${NC}"
echo -e "QuantumVault: ${GREEN}http://localhost:${QUANTUMVAULT_PORT}${NC}"
echo "=============================================="
echo ""
echo -e "${BLUE}📋 Service Management:${NC}"
echo "  • View logs: tail -f logs/[service].log"
echo "  • Stop all:  ./stop-services.sh"
echo "  • Check status: ps aux | grep -E '(node|cargo)'"
echo ""
echo -e "${YELLOW}🔗 No more random ports! All services now use fixed ports.${NC}"
echo -e "${YELLOW}✨ New web structure from PR #223 with dual-audience experience${NC}"

# Wait for user input to keep services running
echo "Press Ctrl+C to stop all services..."
trap './stop-services.sh; exit' INT

# Keep script running
while true; do
    sleep 1
done
