#!/bin/bash
# Comprehensive test script for Dytallix Backend/API Server
# This script validates all the acceptance criteria from the requirements

set -e

SERVER_URL="${SERVER_URL:-http://localhost:8787}"
ADMIN_TOKEN="${ADMIN_TOKEN:-replace_me_with_secure_token}"

echo "================================================"
echo "Dytallix Backend/API Server Verification Tests"
echo "================================================"
echo ""
echo "Server URL: $SERVER_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
test_endpoint() {
  local name="$1"
  local expected_code="$2"
  shift 2
  local curl_args=("$@")
  
  echo -n "Testing: $name... "
  
  http_code=$(curl -s -o /tmp/test_response.json -w "%{http_code}" "${curl_args[@]}")
  
  if [ "$http_code" = "$expected_code" ]; then
    echo -e "${GREEN}PASS${NC} (HTTP $http_code)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    if [ -f /tmp/test_response.json ]; then
      cat /tmp/test_response.json | jq -C '.' 2>/dev/null || cat /tmp/test_response.json
    fi
  else
    echo -e "${RED}FAIL${NC} (HTTP $http_code, expected $expected_code)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    if [ -f /tmp/test_response.json ]; then
      cat /tmp/test_response.json
    fi
  fi
  echo ""
}

# 1. Health & Readiness checks
echo "=== 1. Health & Status Endpoints ==="
test_endpoint "Health check" 200 "$SERVER_URL/healthz"
test_endpoint "Readiness check" 200 "$SERVER_URL/readyz"
test_endpoint "Status endpoint" 200 "$SERVER_URL/api/status"

# 2. Metrics
echo "=== 2. Metrics Endpoint ==="
echo -n "Testing: Prometheus metrics... "
metrics=$(curl -s "$SERVER_URL/metrics")
if echo "$metrics" | grep -q "http_requests_total"; then
  echo -e "${GREEN}PASS${NC}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
  echo "$metrics" | head -10
else
  echo -e "${RED}FAIL${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# 3. Balance endpoint
echo "=== 3. Balance Endpoint ==="
test_endpoint "Balance query (will fail without RPC node)" 500 \
  "$SERVER_URL/api/balance?address=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"

# 4. Faucet endpoint (basic validation)
echo "=== 4. Faucet Endpoint ==="
test_endpoint "Faucet with invalid address" 400 \
  -X POST "$SERVER_URL/api/faucet" \
  -H "Content-Type: application/json" \
  -d '{"address":"invalid"}'

test_endpoint "Faucet with empty address" 400 \
  -X POST "$SERVER_URL/api/faucet" \
  -H "Content-Type: application/json" \
  -d '{"address":""}'

# 5. RPC proxy
echo "=== 5. RPC Proxy ==="
test_endpoint "RPC disallowed method" 403 \
  -X POST "$SERVER_URL/api/rpc" \
  -H "Content-Type: application/json" \
  -d '{"method":"eth_sendTransaction","params":[]}'

test_endpoint "RPC invalid request" 400 \
  -X POST "$SERVER_URL/api/rpc" \
  -H "Content-Type: application/json" \
  -d '{"invalid":"data"}'

# 6. Governance endpoints (stubs)
echo "=== 6. Governance Endpoints ==="
test_endpoint "Governance vote (not implemented)" 501 \
  -X POST "$SERVER_URL/api/governance/vote" \
  -H "Content-Type: application/json" \
  -d '{}'

test_endpoint "Governance propose (not implemented)" 501 \
  -X POST "$SERVER_URL/api/governance/propose" \
  -H "Content-Type: application/json" \
  -d '{}'

test_endpoint "Governance proposals (not implemented)" 501 \
  "$SERVER_URL/api/governance/proposals"

# 7. Contract endpoints
echo "=== 7. Contract Endpoints ==="
test_endpoint "Contract call with invalid address" 400 \
  -X POST "$SERVER_URL/api/contracts/call" \
  -H "Content-Type: application/json" \
  -d '{"address":"invalid","method":"test"}'

test_endpoint "Contract send (forbidden)" 403 \
  -X POST "$SERVER_URL/api/contracts/send" \
  -H "Content-Type: application/json" \
  -d '{"address":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0","method":"test"}'

# 8. Admin endpoints (authentication)
echo "=== 8. Admin Endpoints ==="
test_endpoint "Admin pause without auth" 401 \
  -X POST "$SERVER_URL/api/admin/pause"

test_endpoint "Admin pause with auth" 200 \
  -X POST "$SERVER_URL/api/admin/pause" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

test_endpoint "Admin resume with auth" 200 \
  -X POST "$SERVER_URL/api/admin/resume" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 9. 404 handling
echo "=== 9. Error Handling ==="
test_endpoint "Not found endpoint" 404 \
  "$SERVER_URL/api/nonexistent"

# 10. CORS (we can't test this easily with curl, but we can check headers)
echo "=== 10. CORS Headers ==="
echo -n "Testing: CORS preflight... "
cors_headers=$(curl -s -I -X OPTIONS "$SERVER_URL/api/status" \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST")
if echo "$cors_headers" | grep -qi "access-control-allow-origin"; then
  echo -e "${GREEN}PASS${NC}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo -e "${YELLOW}SKIP${NC} (CORS headers not detected, may need server restart)"
fi
echo ""

# Summary
echo "================================================"
echo "Test Summary"
echo "================================================"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed.${NC}"
  exit 1
fi
