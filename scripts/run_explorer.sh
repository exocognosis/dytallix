#!/bin/bash

set -euo pipefail

# Dytallix Explorer Launcher Script
# This script builds and runs the indexer and API services

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
INDEXER_BIN="$ROOT_DIR/target/release/indexer"
API_BIN="$ROOT_DIR/target/release/dytallix-explorer-api"
UI_PATH="$ROOT_DIR/web/pages/explorer/index.html"

# Default configuration
export DYT_RPC_BASE="${DYT_RPC_BASE:-http://localhost:3030}"
export DYT_INDEX_DB="${DYT_INDEX_DB:-$ROOT_DIR/explorer.db}"
export DYT_BACKFILL_BLOCKS="${DYT_BACKFILL_BLOCKS:-100}"
export DYT_POLL_INTERVAL_MS="${DYT_POLL_INTERVAL_MS:-5000}"
export DYT_API_PORT="${DYT_API_PORT:-8080}"

echo "🚀 Dytallix Explorer Launcher"
echo "================================"
echo "RPC Base: $DYT_RPC_BASE"
echo "Database: $DYT_INDEX_DB"
echo "API Port: $DYT_API_PORT"
echo "Backfill: $DYT_BACKFILL_BLOCKS blocks"
echo "Poll Interval: $DYT_POLL_INTERVAL_MS ms"
echo ""

# Function to cleanup background processes
cleanup() {
    echo "🛑 Shutting down services..."
    if [[ -n "${INDEXER_PID:-}" ]] && kill -0 "$INDEXER_PID" 2>/dev/null; then
        echo "Stopping indexer (PID: $INDEXER_PID)"
        kill "$INDEXER_PID" || true
    fi
    if [[ -n "${API_PID:-}" ]] && kill -0 "$API_PID" 2>/dev/null; then
        echo "Stopping API service (PID: $API_PID)"
        kill "$API_PID" || true
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Build the services
echo "🔨 Building explorer services..."
cd "$ROOT_DIR"

if ! cargo build --release -p dytallix-explorer-indexer -p dytallix-explorer-api; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build completed successfully"
echo ""

# Check if node is running
echo "🔍 Checking node connectivity..."
if ! curl -s --max-time 5 "$DYT_RPC_BASE/blocks/latest" > /dev/null; then
    echo "⚠️  Warning: Cannot connect to node at $DYT_RPC_BASE"
    echo "   Make sure the Dytallix node is running and accessible"
    echo "   You can continue, but the indexer may fail to sync"
    echo ""
fi

# Start indexer service
echo "🔄 Starting indexer service..."
"$INDEXER_BIN" &
INDEXER_PID=$!
echo "✅ Indexer started (PID: $INDEXER_PID)"

# Wait a moment for indexer to initialize
sleep 2

# Start API service  
echo "🌐 Starting API service..."
"$API_BIN" &
API_PID=$!
echo "✅ API service started (PID: $API_PID)"

# Wait for API to be ready
echo "⏳ Waiting for API service to be ready..."
for i in {1..10}; do
    if curl -s --max-time 2 "http://localhost:$DYT_API_PORT/explorer/blocks?limit=1" > /dev/null 2>&1; then
        echo "✅ API service is ready"
        break
    fi
    if [[ $i -eq 10 ]]; then
        echo "❌ API service failed to start"
        cleanup
    fi
    sleep 1
done

echo ""
echo "🎉 Explorer is running!"
echo "================================"
echo "Services:"
echo "  • Indexer: Running (PID: $INDEXER_PID)"
echo "  • API: http://localhost:$DYT_API_PORT (PID: $API_PID)"
echo ""
echo "Endpoints:"
echo "  • Blocks: http://localhost:$DYT_API_PORT/explorer/blocks"
echo "  • Transactions: http://localhost:$DYT_API_PORT/explorer/txs"
echo "  • Transaction detail: http://localhost:$DYT_API_PORT/explorer/tx/{hash}"
echo ""
echo "Web UI:"

# Try to open the UI in browser
if command -v open > /dev/null 2>&1; then
    # macOS
    echo "  • Opening in browser..."
    open "file://$UI_PATH"
elif command -v xdg-open > /dev/null 2>&1; then
    # Linux
    echo "  • Opening in browser..."
    xdg-open "file://$UI_PATH"
else
    echo "  • Open manually: file://$UI_PATH"
fi

echo ""
echo "📊 Monitoring:"
echo "  • Database: $DYT_INDEX_DB"
echo "  • Logs: Check terminal output"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user interrupt
wait