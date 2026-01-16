#!/bin/bash

# Dytallix System Test Script
# Tests all running services and displays their capabilities

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo "🧪 Testing Dytallix System"
echo "=========================="
echo

# Test function
test_endpoint() {
    local service=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Testing $service... "
    
    local response=$(curl -s -w "%{http_code}" -o /dev/null "$url" 2>/dev/null || echo "000")
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL (HTTP $response)${NC}"
        return 1
    fi
}

# Test with JSON payload
test_json_endpoint() {
    local service=$1
    local url=$2
    local payload=$3
    
    echo -n "Testing $service... "
    
    local response=$(curl -s -X POST "$url" \
        -H "Content-Type: application/json" \
        -d "$payload" \
        -w "%{http_code}" \
        -o /dev/null 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ PASS${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL (HTTP $response)${NC}"
        return 1
    fi
}

# Display response content
test_and_show() {
    local service=$1
    local url=$2
    
    echo -e "${BLUE}Testing $service:${NC}"
    echo "URL: $url"
    
    local response=$(curl -s "$url" 2>/dev/null || echo '{"error":"connection failed"}')
    echo -e "${CYAN}Response:${NC}"
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    echo
}

echo "🔍 Basic Health Checks:"
echo "======================="

# Test blockchain node
test_endpoint "Blockchain Health" "http://localhost:3030/health"
test_endpoint "Blockchain Stats" "http://localhost:3030/stats"

# Test AI services
test_endpoint "AI Services Health" "http://localhost:8000/health"

# Test frontend
test_endpoint "Frontend" "http://localhost:3000"

echo
echo "🤖 AI Services Functionality:"
echo "============================="

# Test fraud detection
test_json_endpoint "Fraud Detection" "http://localhost:8000/fraud_detection" \
    '{"transaction":{"amount":1000,"from":"alice","to":"bob","timestamp":"2025-01-01T12:00:00Z"}}'

# Test risk scoring
test_json_endpoint "Risk Scoring" "http://localhost:8000/risk_scoring" \
    '{"address":"dytallix1abc123","transaction_history":[]}'

# Test transaction analysis
test_json_endpoint "Transaction Analysis" "http://localhost:8000/analyze_transaction" \
    '{"transaction":{"amount":500,"from":"charlie","to":"david","gas_price":20}}'

echo
echo "📊 Detailed Service Responses:"
echo "=============================="

# Show detailed responses
test_and_show "Blockchain Health" "http://localhost:3030/health"
test_and_show "Blockchain Stats" "http://localhost:3030/stats"
test_and_show "AI Services Health" "http://localhost:8000/health"

echo "🌐 Frontend Pages Test:"
echo "======================"

# Test frontend pages (just check if they load)
for page in "" "wallet" "explorer" "analytics" "contracts" "settings"; do
    local url="http://localhost:3000/$page"
    test_endpoint "Frontend /$page" "$url"
done

echo
echo "🔍 Advanced AI Tests:"
echo "===================="

echo "Testing Fraud Detection with suspicious transaction..."
curl -s -X POST "http://localhost:8000/fraud_detection" \
    -H "Content-Type: application/json" \
    -d '{"transaction":{"amount":1000000,"from":"unknown","to":"suspicious","timestamp":"2025-01-01T00:00:00Z"}}' | \
    python3 -m json.tool 2>/dev/null || echo "Failed to parse response"

echo
echo "Testing Risk Scoring for high-risk scenario..."
curl -s -X POST "http://localhost:8000/risk_scoring" \
    -H "Content-Type: application/json" \
    -d '{"address":"dytallix1suspicious","transaction_history":[{"amount":1000000,"type":"large_transfer"}]}' | \
    python3 -m json.tool 2>/dev/null || echo "Failed to parse response"

echo
echo "🎯 System Performance:"
echo "====================="

# Check response times
echo "Measuring response times..."

for i in {1..3}; do
    echo -n "Round $i: "
    
    # Time blockchain health check
    blockchain_time=$(curl -w "%{time_total}" -s -o /dev/null "http://localhost:3030/health" 2>/dev/null || echo "0")
    
    # Time AI services health check
    ai_time=$(curl -w "%{time_total}" -s -o /dev/null "http://localhost:8000/health" 2>/dev/null || echo "0")
    
    # Time frontend
    frontend_time=$(curl -w "%{time_total}" -s -o /dev/null "http://localhost:3000" 2>/dev/null || echo "0")
    
    echo "Blockchain: ${blockchain_time}s, AI: ${ai_time}s, Frontend: ${frontend_time}s"
    sleep 1
done

echo
echo "✅ System Test Complete!"
echo
echo "🌐 Open these URLs in your browser:"
echo "=================================="
echo "• Main Dashboard:     http://localhost:3000"
echo "• Wallet:            http://localhost:3000/wallet"
echo "• Block Explorer:    http://localhost:3000/explorer"
echo "• Analytics:         http://localhost:3000/analytics"
echo "• Smart Contracts:   http://localhost:3000/contracts"
echo
echo "🔗 API Endpoints:"
echo "================"
echo "• Blockchain API:    http://localhost:3030"
echo "• AI Services API:   http://localhost:8000"
echo
echo "📚 Try these API calls:"
echo "======================"
echo "curl http://localhost:3030/health"
echo "curl http://localhost:8000/health"
echo 'curl -X POST http://localhost:8000/fraud_detection -H "Content-Type: application/json" -d '"'"'{"transaction":{"amount":1000,"from":"alice","to":"bob"}}'"'"
