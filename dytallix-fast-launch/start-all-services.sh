#!/bin/bash

# Dytallix Master Service Manager
# Starts all services with FIXED ports - no more random port assignment!

set -e

# Fixed port configuration
FRONTEND_PORT=3000
BACKEND_PORT=8787
BLOCKCHAIN_PORT=3030
QUANTUMVAULT_PORT=3031
WEBSOCKET_PORT=9000

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
    
    if [ -n "$directory" ]; then
        cd "$directory"
    fi
    
    # Start service in background and capture PID
    eval "$command" > "logs/${service_name,,}.log" 2>&1 &
    local pid=$!
    
    # Wait a moment and check if service started
    sleep 3
    if kill -0 $pid 2>/dev/null; then
        echo -e "${GREEN}✅ ${service_name} started successfully (PID: $pid)${NC}"
        echo $pid > "logs/${service_name,,}.pid"
    else
        echo -e "${RED}❌ ${service_name} failed to start${NC}"
        tail -10 "logs/${service_name,,}.log"
        return 1
    fi
    
    cd - >/dev/null 2>&1 || true
}

# Stop all existing services
echo -e "${YELLOW}🛑 Stopping existing services...${NC}"
./stop-services.sh 2>/dev/null || true

# Export environment variables
export PORT=$BACKEND_PORT
export FRONTEND_PORT=$FRONTEND_PORT
export BLOCKCHAIN_PORT=$BLOCKCHAIN_PORT
export QUANTUMVAULT_PORT=$QUANTUMVAULT_PORT
export WEBSOCKET_PORT=$WEBSOCKET_PORT

# Start services in order
echo -e "${BLUE}🔧 Starting services...${NC}"

# 1. Blockchain Core (Rust)
start_service "Blockchain" $BLOCKCHAIN_PORT \
    "cargo run --bin blockchain-core" \
    "../blockchain-core"

# 2. QuantumVault API (Node.js)
start_service "QuantumVault" $QUANTUMVAULT_PORT \
    "PORT=$QUANTUMVAULT_PORT node server.js" \
    "services/quantumvault-api"

# 3. Backend API (Node.js)
start_service "Backend" $BACKEND_PORT \
    "PORT=$BACKEND_PORT node server/index.js" \
    "."

# 4. Frontend (Vite)
start_service "Frontend" $FRONTEND_PORT \
    "npm run dev -- --port $FRONTEND_PORT --host 0.0.0.0" \
    "frontend"

echo ""
echo -e "${GREEN}🎉 All services started successfully!${NC}"
echo "=============================================="
echo -e "Frontend:     ${GREEN}http://localhost:${FRONTEND_PORT}${NC}"
echo -e "Backend API:  ${GREEN}http://localhost:${BACKEND_PORT}${NC}"
echo -e "Blockchain:   ${GREEN}http://localhost:${BLOCKCHAIN_PORT}${NC}"
echo -e "QuantumVault: ${GREEN}http://localhost:${QUANTUMVAULT_PORT}${NC}"
echo "=============================================="
echo ""
echo -e "${BLUE}📋 Service Management:${NC}"
echo "  • View logs: tail -f logs/[service].log"
echo "  • Stop all:  ./stop-services.sh"
echo "  • Check status: ps aux | grep -E '(node|cargo|vite)'"
echo ""
echo -e "${YELLOW}🔗 No more random ports! All services now use fixed ports.${NC}"

# Wait for user input to keep services running
echo "Press Ctrl+C to stop all services..."
trap './stop-services.sh; exit' INT

# Keep script running
while true; do
    sleep 1
done
