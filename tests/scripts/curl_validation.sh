#!/bin/bash
# Quick cURL-based API validation for Dytallix
# Tests all core endpoints with timing and status code reporting

BASE_URL="http://localhost:3030"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

echo "========================================="
echo "Dytallix API Quick Validation - $TIMESTAMP"
echo "Base URL: $BASE_URL"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test an endpoint
test_endpoint() {
    local name="$1"
    local endpoint="$2"
    local method="${3:-GET}"
    local data="$4"
    
    echo -n "Testing $name... "
    
    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        result=$(curl -s -w "%{http_code},%{time_total}" \
                     -H "Content-Type: application/json" \
                     -d "$data" \
                     -X POST \
                     "$BASE_URL$endpoint")
    else
        result=$(curl -s -w "%{http_code},%{time_total}" "$BASE_URL$endpoint")
    fi
    
    # Extract status code and time
    if [[ $result =~ .*([0-9]{3}),([0-9.]+)$ ]]; then
        status_code="${BASH_REMATCH[1]}"
        response_time="${BASH_REMATCH[2]}"
        
        if [ "$status_code" = "200" ]; then
            echo -e "${GREEN}✓ PASS${NC} (${status_code}, ${response_time}s)"
        else
            echo -e "${RED}✗ FAIL${NC} (${status_code}, ${response_time}s)"
        fi
    else
        echo -e "${RED}✗ ERROR${NC} (Connection failed)"
    fi
}

# Test all endpoints
echo "1. Core Health & Status Endpoints:"
test_endpoint "Health Check" "/health"
test_endpoint "System Status" "/status"
test_endpoint "Blockchain Stats" "/stats"
echo ""

echo "2. Blockchain Data Endpoints:"
test_endpoint "Latest Blocks" "/blocks"
test_endpoint "Blocks with Limit" "/blocks?limit=5"
test_endpoint "Latest Block" "/blocks/latest"
test_endpoint "Specific Block" "/blocks/1234"
echo ""

echo "3. Transaction Endpoints:"
test_endpoint "Recent Transactions" "/transactions"
test_endpoint "Transactions with Limit" "/transactions?limit=5"
test_endpoint "Specific Transaction" "/transaction/0x1234567890abcdef"
echo ""

echo "4. Network & Account Endpoints:"
test_endpoint "Network Peers" "/peers"
test_endpoint "Account Balance" "/balance/dyt1test123456789"
echo ""

echo "5. Transaction Submission:"
test_endpoint "Submit Transaction" "/submit" "POST" '{"from":"dyt1sender123","to":"dyt1receiver456","amount":1000,"fee":10}'
echo ""

echo "6. Security & Error Handling:"
test_endpoint "Invalid Endpoint" "/nonexistent"
test_endpoint "SQL Injection Test" "/balance/'; DROP TABLE users; --"
test_endpoint "XSS Test" "/balance/<script>alert('xss')</script>"
echo ""

echo "========================================="
echo "Validation Complete - $TIMESTAMP"
echo "========================================="