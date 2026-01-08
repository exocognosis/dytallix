#!/bin/bash

# Test script to verify blockchain status endpoints

set -e

BLOCKCHAIN_URL="http://localhost:3003"

echo "🔍 Testing Dytallix Blockchain Status Endpoints"
echo "================================================"
echo ""

# Function to test an endpoint
test_endpoint() {
    local endpoint=$1
    local name=$2
    
    echo "Testing $name endpoint: $BLOCKCHAIN_URL$endpoint"
    
    if command -v jq >/dev/null 2>&1; then
        response=$(curl -s "$BLOCKCHAIN_URL$endpoint" 2>&1)
        if [ $? -eq 0 ]; then
            echo "✅ Response received:"
            echo "$response" | jq '.'
        else
            echo "❌ Failed to connect"
            echo "$response"
        fi
    else
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BLOCKCHAIN_URL$endpoint" 2>&1)
        if [ $? -eq 0 ]; then
            echo "✅ Response received:"
            echo "$response"
        else
            echo "❌ Failed to connect"
            echo "$response"
        fi
    fi
    echo ""
}

# Check if the blockchain node is running
echo "Checking if blockchain node is running..."
if ! lsof -Pi :3003 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Warning: No process is listening on port 3003"
    echo "   The blockchain node may not be running."
    echo "   Start it with: ./start-all-services.sh"
    echo ""
fi

# Test both endpoints
test_endpoint "/status" "Status"
test_endpoint "/health" "Health"

echo "================================================"
echo "Test complete!"
echo ""
echo "To start the QuantumVault demo:"
echo "  1. Ensure all services are running: ./start-all-services.sh"
echo "  2. Open http://localhost:3000/quantumvault/ in your browser"
echo "  3. Click 'Refresh Status' to test the connection"
