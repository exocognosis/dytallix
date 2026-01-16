#!/bin/bash
##############################################################################
# Dytallix Node Upgrade Script - Enable Contracts Feature
##############################################################################
#
# This script redeploys the testnet node with smart contracts enabled.
#
# Server: 178.156.187.81 (Hetzner CPX21, Ashburn VA)
# 
# What it does:
#   1. Connects to the server via SSH
#   2. Stops the running node
#   3. Pulls latest code
#   4. Rebuilds with --features contracts
#   5. Restarts the node
#   6. Verifies contracts endpoint is available
#
# Usage:
#   ./scripts/upgrade-node-with-contracts.sh
#
##############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Server configuration
SERVER_IP="178.156.187.81"
SERVER_USER="root"
DEPLOY_DIR="/opt/dytallix-fast-launch"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Dytallix Node Upgrade - Enable Smart Contracts        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Server:${NC} $SERVER_IP"
echo -e "${GREEN}Feature:${NC} contracts"
echo ""

# Step 1: Check SSH connectivity
echo -e "${YELLOW}[1/6] Checking SSH connectivity...${NC}"
if ssh -o ConnectTimeout=5 "$SERVER_USER@$SERVER_IP" "echo 'connected'" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ SSH connection successful${NC}"
else
    echo -e "${RED}✗ Failed to connect to server${NC}"
    echo "Make sure you have SSH access: ssh $SERVER_USER@$SERVER_IP"
    exit 1
fi

# Step 2: Check current status
echo -e "\n${YELLOW}[2/6] Checking current node status...${NC}"
CURRENT_HEIGHT=$(curl -s "http://$SERVER_IP:3030/status" | grep -o '"latest_height":[0-9]*' | cut -d: -f2 || echo "unknown")
echo -e "${GREEN}✓ Current block height: $CURRENT_HEIGHT${NC}"

# Step 3: Stop node and rebuild
echo -e "\n${YELLOW}[3/6] Stopping node and rebuilding with contracts...${NC}"
ssh "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
set -e

echo "Changing to deploy directory..."
cd /opt/dytallix-fast-launch

# Find and stop the node process
echo "Stopping node..."
if [ -f .pids/node.pid ]; then
    PID=$(cat .pids/node.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        sleep 3
        echo "✓ Node stopped (PID: $PID)"
    fi
    rm -f .pids/node.pid
fi

# Also check for any other running instances
pkill -f "dytallix-fast-node" 2>/dev/null || true
sleep 2

# Pull latest code
echo "Pulling latest code..."
git pull origin main 2>/dev/null || echo "Git pull skipped (not a git repo or no changes)"

# Build with contracts feature
echo "Building with contracts feature (this may take 5-10 minutes)..."
RUSTFLAGS="--cfg tokio_unstable" cargo build --release -p dytallix-fast-node --features "contracts,metrics,oracle"

echo "✓ Build complete"
ENDSSH

echo -e "${GREEN}✓ Node rebuilt with contracts${NC}"

# Step 4: Start the node
echo -e "\n${YELLOW}[4/6] Starting node...${NC}"
ssh "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
set -e
cd /opt/dytallix-fast-launch

# Set environment
export DYT_CHAIN_ID="dytallix-testnet-1"
export DYT_DATA_DIR="/opt/dytallix-fast-launch/data"
export DYT_GENESIS_FILE="/opt/dytallix-fast-launch/genesis.json"
export DYT_BLOCK_INTERVAL_MS="3000"
export DYT_RPC_PORT="3030"
export RUST_LOG="info"

mkdir -p "$DYT_DATA_DIR" ".pids" "logs"

# Start node in background
nohup ./target/release/dytallix-fast-node > logs/node.log 2>&1 &
echo $! > .pids/node.pid

echo "✓ Node started (PID: $(cat .pids/node.pid))"
ENDSSH

echo -e "${GREEN}✓ Node started${NC}"

# Step 5: Wait for node to come up
echo -e "\n${YELLOW}[5/6] Waiting for node to start...${NC}"
for i in {1..30}; do
    if curl -s "http://$SERVER_IP:3030/status" > /dev/null 2>&1; then
        NEW_HEIGHT=$(curl -s "http://$SERVER_IP:3030/status" | grep -o '"latest_height":[0-9]*' | cut -d: -f2)
        echo -e "${GREEN}✓ Node is up! Block height: $NEW_HEIGHT${NC}"
        break
    fi
    echo "  Waiting... ($i/30)"
    sleep 2
done

# Step 6: Verify contracts endpoint
echo -e "\n${YELLOW}[6/6] Verifying contracts endpoint...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$SERVER_IP:3030/contracts/deploy" -X POST -H "Content-Type: application/json" -d '{"code":"00"}')

if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Contracts endpoint is active (HTTP $HTTP_CODE)${NC}"
    echo -e "${GREEN}  Smart contracts are now enabled!${NC}"
elif [ "$HTTP_CODE" = "404" ]; then
    echo -e "${RED}✗ Contracts endpoint still returns 404${NC}"
    echo "  The node may not have been rebuilt correctly."
    echo "  Check logs: ssh $SERVER_USER@$SERVER_IP 'tail -50 /opt/dytallix-fast-launch/logs/node.log'"
    exit 1
else
    echo -e "${YELLOW}⚠ Unexpected HTTP code: $HTTP_CODE${NC}"
fi

# Summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Upgrade Complete!                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Testnet RPC:${NC} https://dytallix.com/rpc"
echo -e "${GREEN}Contracts:${NC} Enabled ✓"
echo ""
echo "Test contract deployment:"
echo "  cd sdk/typescript && node examples/deploy_contract.js my_contract.wasm"
echo ""
