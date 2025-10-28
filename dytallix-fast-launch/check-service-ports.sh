#!/bin/bash

# Dytallix Service Health Check - Updated Port Scheme
# Verifies all services are running on their assigned ports

echo "🔍 Dytallix Service Health Check (Updated Port Scheme)"
echo "======================================================"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_service() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Checking $name ($url)... "
    
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "$expected_status"; then
        echo -e "${GREEN}✅ Connected${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed${NC}"
        return 1
    fi
}

# Check all services with new port scheme
echo -e "${YELLOW}Testing New Port Configuration:${NC}"
echo ""

check_service "Frontend" "http://localhost:3000" "200"
check_service "Backend API" "http://localhost:3001/health" "200"  
check_service "QuantumVault API" "http://localhost:3002/health" "200"
check_service "Blockchain Node" "http://localhost:3003/status" "200"

echo ""
echo -e "${YELLOW}Docker Network (if running):${NC}"
echo ""

check_service "Seed Node" "http://localhost:3010/status" "200"
check_service "Validator 1" "http://localhost:3011/status" "200"
check_service "Validator 2" "http://localhost:3012/status" "200"
check_service "Validator 3" "http://localhost:3013/status" "200"
check_service "RPC Node" "http://localhost:3014/status" "200"

echo ""
echo -e "${YELLOW}Port Migration Summary:${NC}"
echo "- Frontend: 3000 (unchanged)"
echo "- Backend API: 3001 (was 8787)"
echo "- QuantumVault API: 3002 (was 3031)"  
echo "- Blockchain Node: 3003 (was 3030)"
echo "- WebSocket: 3004 (was 9000)"
echo ""
echo "📖 Full documentation: UNIFIED_PORT_CONFIG.md"
