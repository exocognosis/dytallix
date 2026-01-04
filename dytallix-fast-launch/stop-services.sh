#!/bin/bash

# DYTALLIX SERVICES STOP SCRIPT
# Cleanly stops all services running on fixed ports

# Note: Not using 'set -e' here to allow proper error handling
set -u  # Exit on undefined variables
set -o pipefail  # Catch errors in pipes

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Get script directory and source .env for port configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
if [ -f "$SCRIPT_DIR/.env" ]; then
    echo -e "${BLUE}Loading port configuration from .env${NC}"
    set -a
    source "$SCRIPT_DIR/.env"
    set +a
fi

# Port configuration (with fallback defaults if .env not found)
FRONTEND_PORT=${FRONTEND_PORT:-3000}
BACKEND_PORT=${BACKEND_API_PORT:-3001}
BLOCKCHAIN_PORT=${BLOCKCHAIN_NODE_PORT:-3003}
QUANTUMVAULT_PORT=${QUANTUMVAULT_API_PORT:-3002}
FAUCET_PORT=${FAUCET_PORT:-3005}
WEBSOCKET_PORT=${WEBSOCKET_PORT:-3004}

# Initialize counters for summary report
STOPPED_COUNT=0
FAILED_COUNT=0
NOT_RUNNING_COUNT=0

# Setup trap for clean termination
trap 'echo -e "\n${YELLOW}⚠️  Script interrupted. Cleaning up...${NC}"; exit 130' INT TERM

echo -e "${BLUE}🛑 Stopping Dytallix Services${NC}"
echo -e "${BLUE}==============================${NC}"

# Function to stop service on port with enhanced error handling and logging
stop_service() {
    local port=$1
    local service=$2
    
    echo -e "${BLUE}Checking $service on port $port...${NC}"
    
    if ! lsof -i :$port >/dev/null 2>&1; then
        echo -e "${YELLOW}  ℹ️  $service not running on port $port${NC}"
        ((NOT_RUNNING_COUNT++))
        return 0
    fi
    
    echo -e "${BLUE}  🛑 Stopping $service on port $port...${NC}"
    local pids=$(lsof -ti :$port 2>/dev/null)
    
    if [ -z "$pids" ]; then
        echo -e "${YELLOW}  ⚠️  Could not retrieve process IDs${NC}"
        ((FAILED_COUNT++))
        return 1
    fi
    
    # First, try graceful shutdown with SIGTERM
    echo "  📋 Process IDs: $pids"
    echo "  ⏳ Attempting graceful shutdown (SIGTERM)..."
    
    if echo "$pids" | xargs kill -TERM 2>/dev/null; then
        # Wait up to 5 seconds for graceful shutdown
        local timeout=5
        local elapsed=0
        while [ $elapsed -lt $timeout ]; do
            if ! lsof -i :$port >/dev/null 2>&1; then
                echo -e "  ${GREEN}✓ Stopped gracefully${NC}"
                ((STOPPED_COUNT++))
                return 0
            fi
            sleep 1
            ((elapsed++))
        done
        
        # If still running, force kill
        if lsof -i :$port >/dev/null 2>&1; then
            echo "  ⚠️  Graceful shutdown timeout. Force killing..."
            if echo "$pids" | xargs kill -9 2>/dev/null; then
                sleep 1
                if ! lsof -i :$port >/dev/null 2>&1; then
                    echo -e "  ${GREEN}✓ Force stopped${NC}"
                    ((STOPPED_COUNT++))
                    return 0
                else
                    echo -e "  ${RED}✗ Failed to stop (process may be hung)${NC}"
                    ((FAILED_COUNT++))
                    return 1
                fi
            else
                echo -e "  ${RED}✗ Failed to send SIGKILL${NC}"
                ((FAILED_COUNT++))
                return 1
            fi
        fi
    else
        echo -e "  ${RED}✗ Failed to send SIGTERM${NC}"
        ((FAILED_COUNT++))
        return 1
    fi
}

# Stop all services
stop_service $FRONTEND_PORT "Frontend"
stop_service $BACKEND_PORT "Backend API" 
stop_service $BLOCKCHAIN_PORT "Blockchain Node"
stop_service $QUANTUMVAULT_PORT "QuantumVault API"
stop_service $FAUCET_PORT "Faucet API"
stop_service $WEBSOCKET_PORT "WebSocket"

# Summary report
echo ""
echo -e "${BLUE}==============================${NC}"
echo -e "${BLUE}📊 Stop Services Summary${NC}"
echo -e "${BLUE}==============================${NC}"
echo -e "${GREEN}✓ Stopped:      $STOPPED_COUNT${NC}"
echo -e "${YELLOW}ℹ️  Not running:  $NOT_RUNNING_COUNT${NC}"
echo -e "${RED}✗ Failed:       $FAILED_COUNT${NC}"
echo -e "${BLUE}==============================${NC}"

if [ $FAILED_COUNT -eq 0 ]; then
    echo -e "\n${GREEN}✅ All services stopped successfully${NC}"
    EXIT_CODE=0
else
    echo -e "\n${YELLOW}⚠️  Some services failed to stop. Check logs above.${NC}"
    EXIT_CODE=1
fi

# Clean up log files if requested
if [ "${1:-}" = "--clean-logs" ]; then
    echo -e "${BLUE}🧹 Cleaning log files...${NC}"
    if rm -f logs/*.log 2>/dev/null; then
        echo -e "${GREEN}✅ Log files cleaned${NC}"
    else
        echo -e "${YELLOW}⚠️  No log files to clean or permission denied${NC}"
    fi
fi

echo -e "${BLUE}Run ./start-all-services.sh to restart services${NC}"

exit $EXIT_CODE
