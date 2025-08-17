#!/bin/bash

# Dytallix Oracle CLI Examples
# This script demonstrates how to use the Oracle functionality

set -e

echo "🔮 Dytallix Oracle CLI Examples"
echo "================================"

# Check if dcli is available
if ! command -v dcli &> /dev/null; then
    echo "❌ dcli command not found. Please build and install the CLI first:"
    echo "   cd cli && cargo install --path ."
    exit 1
fi

# Set the RPC endpoint (adjust as needed)
export DYTALLIX_RPC="http://localhost:3030"

echo ""
echo "📊 Getting Oracle statistics..."
dcli oracle stats || echo "⚠️  Oracle stats failed - make sure node is running"

echo ""
echo "📝 Example 1: Submit a single AI risk score"
echo "dcli oracle submit --tx-hash 0x1234567890abcdef --model-id fraud-detector-v2.1 --risk-score 0.75 --confidence 0.92"

# Create a sample batch file
cat > /tmp/oracle_batch_example.json << 'EOF'
[
    {
        "tx_hash": "0x1111111111111111",
        "model_id": "fraud-detector-v2.1",
        "risk_score": 0.25,
        "confidence": 0.95
    },
    {
        "tx_hash": "0x2222222222222222", 
        "model_id": "ml-risk-engine-v1.0",
        "risk_score": 0.80,
        "confidence": 0.88
    },
    {
        "tx_hash": "0x3333333333333333",
        "model_id": "behavioral-anomaly-v3.2",
        "risk_score": 0.15,
        "confidence": 0.92
    }
]
EOF

echo ""
echo "📝 Example 2: Submit batch risk scores from file"
echo "dcli oracle submit-batch --file /tmp/oracle_batch_example.json"

echo ""
echo "📝 Example 3: Query a risk score"
echo "dcli oracle query 0x1111111111111111"

echo ""
echo "📋 Available Commands:"
echo "  dcli oracle submit     - Submit single risk score"
echo "  dcli oracle submit-batch - Submit multiple risk scores from JSON file"
echo "  dcli oracle query      - Query risk score for a transaction"
echo "  dcli oracle stats      - Get oracle system statistics"

echo ""
echo "📄 Batch file format example created at: /tmp/oracle_batch_example.json"
echo "   You can modify this file and use it with: dcli oracle submit-batch --file /tmp/oracle_batch_example.json"

echo ""
echo "🔗 For more information, see: docs/ORACLE.md"

echo ""
echo "✅ Oracle CLI examples completed!"