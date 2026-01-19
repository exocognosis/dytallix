#!/bin/bash
# Quick verification test for refactored server

echo "🧪 Testing Refactored Server Code"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
  local name=$1
  local url=$2
  local expected=$3
  
  echo -n "Testing $name... "
  
  response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null)
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [ "$http_code" = "$expected" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}✗ FAIL${NC} (Expected HTTP $expected, got $http_code)"
    ((FAILED++))
    return 1
  fi
}

# Check if server is running
echo "Checking if server is running on port 3001..."
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Server is running"
  echo ""
else
  echo -e "${YELLOW}⚠${NC} Server is not running on port 3001"
  echo "Please start the server with: node server/index.js"
  echo ""
  exit 1
fi

# Run tests
echo "Running endpoint tests..."
echo ""

test_endpoint "API Status" "http://localhost:3001/api/status" "200"
test_endpoint "Metrics" "http://localhost:3001/metrics" "200"
test_endpoint "Blockchain Status" "http://localhost:3001/status" "200"
test_endpoint "Recent Blocks" "http://localhost:3001/api/blocks?limit=5" "200"

echo ""
echo "=================================="
echo "Test Results:"
echo -e "${GREEN}Passed: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
  echo -e "${RED}Failed: $FAILED${NC}"
else
  echo -e "Failed: $FAILED"
fi
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  echo "The refactored server is working correctly."
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  echo "Please check the server logs for errors."
  exit 1
fi
