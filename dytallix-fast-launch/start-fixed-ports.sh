#!/bin/bash

# DYTALLIX FIXED PORT STARTUP SCRIPT
# This script starts all services on their designated fixed ports
# No more port chaos!

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Fixed ports configuration
FRONTEND_PORT=3000
BACKEND_PORT=8787
BLOCKCHAIN_PORT=3030
QUANTUMVAULT_PORT=3031

echo -e "${BLUE}🚀 Starting Dytallix Services with Fixed Ports${NC}"
echo -e "${BLUE}===============================================${NC}"
echo -e "Frontend:      http://localhost:${FRONTEND_PORT}"
echo -e "Backend API:   http://localhost:${BACKEND_PORT}"
echo -e "Blockchain:    http://localhost:${BLOCKCHAIN_PORT}"
echo -e "QuantumVault:  http://localhost:${QUANTUMVAULT_PORT}"
echo -e "${BLUE}===============================================${NC}"

# Function to check if port is available
check_port() {
    local port=$1
    local service=$2
    if lsof -i :$port >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Warning: Port $port is already in use (may be previous $service instance)${NC}"
        echo "   Killing processes on port $port..."
        lsof -ti :$port | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local port=$1
    local service=$2
    echo -n "   Waiting for $service to start on port $port..."
    for i in {1..30}; do
        if curl -s http://localhost:$port >/dev/null 2>&1; then
            echo -e " ${GREEN}✓${NC}"
            return 0
        fi
        echo -n "."
        sleep 1
    done
    echo -e " ${RED}✗ Timeout${NC}"
    return 1
}

# Change to the project root
cd "$(dirname "$0")"

# Load environment variables
if [ -f ".env.local" ]; then
    source .env.local
fi

echo -e "\n${BLUE}🔍 Checking ports...${NC}"
check_port $FRONTEND_PORT "Frontend"
check_port $BACKEND_PORT "Backend API"
check_port $BLOCKCHAIN_PORT "Blockchain Node"
check_port $QUANTUMVAULT_PORT "QuantumVault API"

echo -e "\n${BLUE}🏗️  Starting services...${NC}"

# Start Blockchain Node (if not already running)
echo -e "${BLUE}1. Starting Blockchain Node on port ${BLOCKCHAIN_PORT}...${NC}"
if [ -d "blockchain-core" ]; then
    cd blockchain-core
    BLOCKCHAIN_PORT=$BLOCKCHAIN_PORT nohup cargo run > ../logs/blockchain.log 2>&1 &
    BLOCKCHAIN_PID=$!
    echo "   Blockchain PID: $BLOCKCHAIN_PID"
    cd ..
else
    echo -e "${RED}   ✗ blockchain-core directory not found${NC}"
fi

# Start QuantumVault API
echo -e "${BLUE}2. Starting QuantumVault API on port ${QUANTUMVAULT_PORT}...${NC}"
if [ -d "services/quantumvault-api" ]; then
    cd services/quantumvault-api
    PORT=$QUANTUMVAULT_PORT nohup node server.js > ../../logs/quantumvault.log 2>&1 &
    QUANTUMVAULT_PID=$!
    echo "   QuantumVault PID: $QUANTUMVAULT_PID"
    cd ../..
else
    echo -e "${RED}   ✗ services/quantumvault-api directory not found${NC}"
fi

# Wait a moment for services to initialize
sleep 2

# Start Backend API Proxy
echo -e "${BLUE}3. Starting Backend API on port ${BACKEND_PORT}...${NC}"
if [ -f "api-proxy.js" ]; then
    PORT=$BACKEND_PORT nohup node api-proxy.js > logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo "   Backend PID: $BACKEND_PID"
else
    echo -e "${RED}   ✗ api-proxy.js not found${NC}"
fi

# Start Frontend (Vite dev server) - this one shows output
echo -e "${BLUE}4. Starting Frontend on port ${FRONTEND_PORT}...${NC}"
if [ -d "frontend" ]; then
    cd frontend
    echo -e "${GREEN}   Frontend will start with live output...${NC}"
    VITE_PORT=$FRONTEND_PORT npm run dev
else
    echo -e "${RED}   ✗ frontend directory not found${NC}"
fi

# Note: The script will end here because npm run dev runs in foreground
# The other services continue running in background

echo -e "\n${GREEN}✅ All services started on their fixed ports!${NC}"
echo -e "${BLUE}Press Ctrl+C to stop the frontend server${NC}"
echo -e "${BLUE}Other services will continue running in background${NC}"
