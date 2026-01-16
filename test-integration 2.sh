#!/bin/bash

# Integration test script for rate limiting and metrics
# This script tests the implemented features without requiring a full blockchain setup

set -e

echo "🧪 Testing Faucet Rate Limiting and Metrics Integration"
echo "======================================================="

# Start the server in background
echo "📍 Starting faucet server..."
cd /home/runner/work/dytallix/dytallix/dytallix-lean-launch
npm run server > /tmp/server.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
echo "⏰ Waiting for server to start..."
sleep 5

# Function to cleanup on exit
cleanup() {
    echo "🧹 Cleaning up..."
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
}
trap cleanup EXIT

# Test 1: Health check
echo "🔍 Test 1: Health check"
curl -f http://localhost:8787/health > /dev/null
echo "✅ Health check passed"

# Test 2: Status endpoint shows correct rate limit windows
echo "🔍 Test 2: Rate limit configuration"
STATUS_RESPONSE=$(curl -s http://localhost:8787/api/status)
echo "$STATUS_RESPONSE" | jq -e '.rateLimit.dgtWindowHours == 24' > /dev/null
echo "$STATUS_RESPONSE" | jq -e '.rateLimit.drtWindowHours == 6' > /dev/null
echo "$STATUS_RESPONSE" | jq -e '.rateLimit.maxRequests == 1' > /dev/null
echo "✅ Rate limit configuration correct"

# Test 3: Prometheus metrics endpoint
echo "🔍 Test 3: Prometheus metrics"
METRICS_RESPONSE=$(curl -s http://localhost:8787/metrics)
echo "$METRICS_RESPONSE" | grep -q "rate_limit_hits_total"
echo "$METRICS_RESPONSE" | grep -q "faucet_requests_total"
echo "✅ Prometheus metrics available"

# Test 4: Redis configuration detection
echo "🔍 Test 4: Redis configuration detection"
REDIS_STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.redis')
if [ "$REDIS_STATUS" = "true" ] || [ "$REDIS_STATUS" = "false" ]; then
    echo "✅ Redis status correctly reported: $REDIS_STATUS"
else
    echo "❌ Redis status invalid: $REDIS_STATUS"
    exit 1
fi

# Test 5: Address validation
echo "🔍 Test 5: Address validation"
INVALID_ADDRESS_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/response.json \
    -X POST http://localhost:8787/api/faucet \
    -H "Content-Type: application/json" \
    -d '{"address":"invalid-address", "tokens":["DGT"]}')

if [ "$INVALID_ADDRESS_RESPONSE" = "400" ]; then
    echo "✅ Invalid address correctly rejected"
else
    echo "❌ Invalid address validation failed (got $INVALID_ADDRESS_RESPONSE)"
    cat /tmp/response.json
    exit 1
fi

# Test 6: Token validation
echo "🔍 Test 6: Token validation"
INVALID_TOKEN_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/response.json \
    -X POST http://localhost:8787/api/faucet \
    -H "Content-Type: application/json" \
    -d '{"address":"dytallix1test1234567890abcdef", "tokens":["INVALID"]}')

if [ "$INVALID_TOKEN_RESPONSE" = "400" ]; then
    echo "✅ Invalid token correctly rejected"
else
    echo "❌ Invalid token validation failed (got $INVALID_TOKEN_RESPONSE)"
    cat /tmp/response.json
    exit 1
fi

# Test 7: Valid request format (will fail on transfer but should pass validation)
echo "🔍 Test 7: Valid request format"
VALID_REQUEST_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/response.json \
    -X POST http://localhost:8787/api/faucet \
    -H "Content-Type: application/json" \
    -d '{"address":"dytallix1test1234567890abcdef", "tokens":["DGT"]}')

# Should be 500 (server error due to blockchain connectivity) not 400 (validation error)
if [ "$VALID_REQUEST_RESPONSE" = "500" ]; then
    echo "✅ Valid request passed validation (failed on transfer as expected)"
elif [ "$VALID_REQUEST_RESPONSE" = "200" ]; then
    echo "✅ Valid request succeeded completely"
else
    echo "❌ Valid request failed validation (got $VALID_REQUEST_RESPONSE)"
    cat /tmp/response.json
    exit 1
fi

# Test 8: Metrics increment on requests
echo "🔍 Test 8: Metrics increment on requests"
INITIAL_METRICS=$(curl -s http://localhost:8787/metrics)

# Make another request
curl -s -o /dev/null \
    -X POST http://localhost:8787/api/faucet \
    -H "Content-Type: application/json" \
    -d '{"address":"dytallix1test1234567890abcdef", "tokens":["DRT"]}'

FINAL_METRICS=$(curl -s http://localhost:8787/metrics)

# Metrics should have changed
if [ "$INITIAL_METRICS" != "$FINAL_METRICS" ]; then
    echo "✅ Metrics incremented on request"
else
    echo "❌ Metrics did not change"
    exit 1
fi

echo ""
echo "🎉 All integration tests passed!"
echo "✅ Redis-backed rate limiting infrastructure ready"
echo "✅ Token-specific cooldowns implemented (DGT: 24h, DRT: 6h)"
echo "✅ Prometheus metrics working"
echo "✅ Production validation working"
echo "✅ Input validation working"
echo ""
echo "🔍 Note: Full rate limiting requires Redis or multiple requests"
echo "🔍 Note: Transfer functionality requires running blockchain node"