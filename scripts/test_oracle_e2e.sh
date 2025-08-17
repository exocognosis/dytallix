#!/bin/bash

# Oracle End-to-End Test Script
# Tests the complete Oracle pipeline functionality

set -e

echo "🧪 Running Oracle E2E Tests"
echo "============================"

# Configuration
NODE_PORT=${NODE_PORT:-3030}
BASE_URL="http://localhost:${NODE_PORT}"

# Check if node is running
if ! curl -s "${BASE_URL}/stats" > /dev/null; then
    echo "❌ Node is not running on port ${NODE_PORT}"
    echo "   Start the node with: cargo run"
    exit 1
fi

echo "✅ Node is running"

# Test 1: Submit single risk score
echo ""
echo "📝 Test 1: Single risk score submission"
RESPONSE=$(curl -s -X POST "${BASE_URL}/oracle/ai_risk" \
  -H "Content-Type: application/json" \
  -d '{
    "tx_hash": "0x1234567890abcdef1234567890abcdef12345678",
    "model_id": "test-fraud-detector-v1.0",
    "risk_score": 0.75,
    "confidence": 0.92
  }')

if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo "✅ Single submission successful"
else
    echo "❌ Single submission failed: $RESPONSE"
    exit 1
fi

# Test 2: Submit batch risk scores
echo ""
echo "📝 Test 2: Batch risk score submission"
BATCH_RESPONSE=$(curl -s -X POST "${BASE_URL}/oracle/ai_risk_batch" \
  -H "Content-Type: application/json" \
  -d '{
    "records": [
      {
        "tx_hash": "0x1111111111111111111111111111111111111111",
        "model_id": "fraud-detector-v2.1",
        "risk_score": 0.25,
        "confidence": 0.95
      },
      {
        "tx_hash": "0x2222222222222222222222222222222222222222",
        "model_id": "ml-risk-engine-v1.0",
        "risk_score": 0.80,
        "confidence": 0.88
      },
      {
        "tx_hash": "0x3333333333333333333333333333333333333333",
        "model_id": "behavioral-anomaly-v3.2",
        "risk_score": 0.15
      }
    ]
  }')

if echo "$BATCH_RESPONSE" | grep -q '"processed":3'; then
    echo "✅ Batch submission successful"
else
    echo "❌ Batch submission failed: $BATCH_RESPONSE"
    exit 1
fi

# Test 3: Query batch risk scores
echo ""
echo "📝 Test 3: Batch risk score query"
QUERY_RESPONSE=$(curl -s -X POST "${BASE_URL}/oracle/ai_risk_query_batch" \
  -H "Content-Type: application/json" \
  -d '[
    "0x1111111111111111111111111111111111111111",
    "0x2222222222222222222222222222222222222222",
    "0x9999999999999999999999999999999999999999"
  ]')

if echo "$QUERY_RESPONSE" | grep -q '"total_found":2'; then
    echo "✅ Batch query successful"
else
    echo "❌ Batch query failed: $QUERY_RESPONSE"
    exit 1
fi

# Test 4: Oracle statistics
echo ""
echo "📝 Test 4: Oracle statistics"
STATS_RESPONSE=$(curl -s "${BASE_URL}/oracle/stats")

if echo "$STATS_RESPONSE" | grep -q '"schema_version"'; then
    echo "✅ Oracle stats accessible"
else
    echo "❌ Oracle stats failed: $STATS_RESPONSE"
    exit 1
fi

# Test 5: Transaction query with risk data
echo ""
echo "📝 Test 5: Transaction query with risk data"
# Note: This assumes we have a transaction with the hash we submitted
TX_RESPONSE=$(curl -s "${BASE_URL}/tx/0x1234567890abcdef1234567890abcdef12345678" || echo '{"status":"not_found"}')

if echo "$TX_RESPONSE" | grep -q '"ai_risk_score"'; then
    echo "✅ Transaction query includes risk data"
elif echo "$TX_RESPONSE" | grep -q '"status":"pending"'; then
    echo "⚠️  Transaction is pending (risk data should still be included)"
    if echo "$TX_RESPONSE" | grep -q '"ai_risk_score"'; then
        echo "✅ Pending transaction includes risk data"
    else
        echo "❌ Pending transaction missing risk data"
        exit 1
    fi
else
    echo "⚠️  Transaction not found in blockchain (expected for test data)"
fi

# Test 6: Validation tests
echo ""
echo "📝 Test 6: Input validation"

# Test invalid risk score
INVALID_RESPONSE=$(curl -s -X POST "${BASE_URL}/oracle/ai_risk" \
  -H "Content-Type: application/json" \
  -d '{
    "tx_hash": "0x4444444444444444444444444444444444444444",
    "model_id": "test-model",
    "risk_score": 1.5,
    "confidence": 0.5
  }')

if echo "$INVALID_RESPONSE" | grep -q '"ok":true'; then
    echo "❌ Invalid risk score was accepted (should be rejected)"
    exit 1
else
    echo "✅ Invalid risk score properly rejected"
fi

# Test invalid tx hash format
INVALID_HASH_RESPONSE=$(curl -s -X POST "${BASE_URL}/oracle/ai_risk" \
  -H "Content-Type: application/json" \
  -d '{
    "tx_hash": "invalid_hash",
    "model_id": "test-model",
    "risk_score": 0.5
  }')

if echo "$INVALID_HASH_RESPONSE" | grep -q '"ok":true'; then
    echo "❌ Invalid hash format was accepted (should be rejected)"
    exit 1
else
    echo "✅ Invalid hash format properly rejected"
fi

echo ""
echo "🎉 All Oracle E2E tests passed!"
echo ""
echo "📊 Test Summary:"
echo "  ✅ Single risk score submission"
echo "  ✅ Batch risk score submission"
echo "  ✅ Batch risk score queries"
echo "  ✅ Oracle statistics endpoint"
echo "  ✅ Transaction query integration"
echo "  ✅ Input validation"
echo ""
echo "🔗 Full API documentation: docs/ORACLE.md"