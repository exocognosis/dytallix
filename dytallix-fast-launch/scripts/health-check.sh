#!/usr/bin/env bash
# Dytallix Fast Launch - Health Check
# Validates all services are running and healthy
set -euo pipefail

NODE_URL="${NODE_URL:-http://localhost:3030}"
API_URL="${API_URL:-http://localhost:8787}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

passed=0
failed=0

check() {
  local name="$1" url="$2" jq_check="${3:-}"
  echo -n "Checking $name... "
  
  if response=$(curl -sf "$url" 2>/dev/null); then
    if [ -n "$jq_check" ]; then
      if echo "$response" | jq -e "$jq_check" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((passed++))
        return 0
      else
        echo -e "${RED}❌ FAIL${NC} (invalid response)"
        echo "  Response: $response"
        ((failed++))
        return 1
      fi
    else
      echo -e "${GREEN}✅ PASS${NC}"
      ((passed++))
      return 0
    fi
  else
    echo -e "${RED}❌ FAIL${NC} (unreachable)"
    ((failed++))
    return 1
  fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Dytallix Fast Launch - Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Node checks
echo "🔗 Blockchain Node ($NODE_URL)"
check "Node Health" "$NODE_URL/health"
check "Node Stats" "$NODE_URL/stats" '.height'
check "Node Status" "$NODE_URL/status" '.result.node_info.network'

# API checks
echo ""
echo "🌐 API/Faucet Server ($API_URL)"
check "API Health" "$API_URL/api/status" '.ok'
check "Faucet Endpoint" "$API_URL/api/faucet/config"

# Frontend checks  
echo ""
echo "🎨 Frontend ($FRONTEND_URL)"
check "Frontend Serving" "$FRONTEND_URL"

# Additional validations
echo ""
echo "🔍 Additional Validations"

# Check if node is producing blocks
height=$(curl -sf "$NODE_URL/stats" 2>/dev/null | jq -r '.height // 0' || echo "0")
if [ "$height" -gt "0" ]; then
  echo -e "Block Height: ${GREEN}$height${NC} ✅"
  ((passed++))
else
  echo -e "Block Height: ${RED}$height${NC} ❌ (not producing blocks)"
  ((failed++))
fi

# Check network info
network=$(curl -sf "$NODE_URL/status" 2>/dev/null | jq -r '.result.node_info.network // "unknown"' || echo "unknown")
echo "Network: $network"

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Summary: ${GREEN}${passed} passed${NC}, ${RED}${failed} failed${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$failed" -gt 0 ]; then
  exit 1
fi

exit 0
