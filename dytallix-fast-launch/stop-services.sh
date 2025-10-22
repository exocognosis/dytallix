#!/bin/bash

# DYTALLIX SERVICES STOP SCRIPT
# Cleanly stops all services running on fixed ports

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

echo -e "${BLUE}🛑 Stopping Dytallix Services${NC}"
echo -e "${BLUE}==============================${NC}"

# Function to stop service on port
stop_service() {
    local port=$1
    local service=$2
    
    if lsof -i :$port >/dev/null 2>&1; then
        echo -e "${BLUE}Stopping $service on port $port...${NC}"
        local pids=$(lsof -ti :$port)
        if [ ! -z "$pids" ]; then
            echo "$pids" | xargs kill -TERM 2>/dev/null || true
            sleep 2
            # Force kill if still running
            if lsof -i :$port >/dev/null 2>&1; then
                echo "   Force killing..."
                echo "$pids" | xargs kill -9 2>/dev/null || true
            fi
            echo -e "   ${GREEN}✓ Stopped${NC}"
        fi
    else
        echo -e "${YELLOW}$service not running on port $port${NC}"
    fi
}

# Stop all services
stop_service $FRONTEND_PORT "Frontend"
stop_service $BACKEND_PORT "Backend API" 
stop_service $BLOCKCHAIN_PORT "Blockchain Node"
stop_service $QUANTUMVAULT_PORT "QuantumVault API"

echo -e "\n${GREEN}✅ All services stopped${NC}"

# Clean up log files if requested
if [ "$1" = "--clean-logs" ]; then
    echo -e "${BLUE}🧹 Cleaning log files...${NC}"
    rm -f logs/*.log
    echo -e "${GREEN}✅ Log files cleaned${NC}"
fi

echo -e "${BLUE}Run ./start-fixed-ports.sh to restart services${NC}"
