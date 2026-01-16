#!/bin/bash

# Quick Fix Script: Restart Blockchain on Hetzner
# This script attempts to restart the blockchain using multiple strategies

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SERVER_IP="178.156.187.81"
SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
SSH_USER="root"

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Dytallix Blockchain Recovery Script         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Server:${NC} $SERVER_IP"
echo ""

# Function to execute remote command
remote_exec() {
    ssh $SSH_OPTS "$SSH_USER@$SERVER_IP" "$1"
}

# Check SSH connectivity
echo -e "${YELLOW}[1/6] Testing SSH connection...${NC}"
if remote_exec "echo 'Connected'" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Connected${NC}"
else
    echo -e "${RED}❌ Cannot connect to server${NC}"
    exit 1
fi

# Check current status
echo -e "\n${YELLOW}[2/6] Checking current blockchain status...${NC}"
if remote_exec "curl -sf http://localhost:3003/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Blockchain is already running!${NC}"
    exit 0
else
    echo -e "${RED}❌ Blockchain is not running${NC}"
fi

# Strategy 1: Try starting existing containers
echo -e "\n${YELLOW}[3/6] Attempting to start existing containers...${NC}"
COMPOSE_DIR="/opt/dytallix-fast-launch"
if remote_exec "cd $COMPOSE_DIR && docker-compose ps -q 2>/dev/null | wc -l" | grep -q '^0$'; then
    echo -e "${YELLOW}No containers found. Will need to build or pull images.${NC}"
    
    # Check if we can use a pre-built image
    echo -e "\n${YELLOW}[4/6] Checking for pre-built images...${NC}"
    
    # Option A: Check if Rust binary exists (compiled separately)
    if remote_exec "[ -f /opt/dytallix/target/release/dytallix-node ]"; then
        echo -e "${GREEN}✅ Found pre-built binary${NC}"
        echo -e "${YELLOW}Starting blockchain with existing binary...${NC}"
        
        # Start blockchain directly with nohup
        remote_exec "nohup /opt/dytallix/target/release/dytallix-node > /var/log/dytallix-node.log 2>&1 &"
        sleep 5
        
    # Option B: Try to use rust cargo directly if available
    elif remote_exec "[ -d /opt/dytallix/blockchain-core ]"; then
        echo -e "${YELLOW}Building and starting from source...${NC}"
        
        # First, add swap if not exists
        echo -e "${BLUE}Adding temporary swap space...${NC}"
        remote_exec "
            if [ ! -f /swapfile ]; then
                fallocate -l 4G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=4096
                chmod 600 /swapfile
                mkswap /swapfile
                swapon /swapfile
            fi
        " || echo "Swap already configured or failed to add"
        
        # Build in the background with lower memory usage
        echo -e "${YELLOW}Building blockchain (this may take 10-15 minutes)...${NC}"
        remote_exec "
            cd /opt/dytallix/blockchain-core && 
            CARGO_BUILD_JOBS=2 cargo build --release --bin dytallix-node &&
            nohup /opt/dytallix/target/release/dytallix-node > /var/log/dytallix-node.log 2>&1 &
        " &
        
        echo -e "${YELLOW}Build started in background. Check progress with:${NC}"
        echo "  ssh $SSH_USER@$SERVER_IP 'tail -f /var/log/dytallix-node.log'"
        
    else
        echo -e "${RED}❌ No source code or binary found${NC}"
        echo ""
        echo -e "${YELLOW}Manual intervention required:${NC}"
        echo "1. Deploy the blockchain code to the server"
        echo "2. Or build locally and copy the binary"
        echo "3. Or use Docker with pre-built images"
        exit 1
    fi
else
    # Containers exist, try starting them
    echo -e "${GREEN}Found existing containers, starting them...${NC}"
    remote_exec "cd $COMPOSE_DIR && docker-compose start"
fi

# Wait and verify
echo -e "\n${YELLOW}[5/6] Waiting for blockchain to start (30 seconds)...${NC}"
sleep 30

echo -e "\n${YELLOW}[6/6] Verifying blockchain is running...${NC}"
if remote_exec "curl -sf http://localhost:3003/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ SUCCESS! Blockchain is now running${NC}"
    echo ""
    echo -e "${BLUE}Blockchain Status:${NC}"
    remote_exec "curl -s http://localhost:3003/status | jq '.'"
    echo ""
    echo -e "${GREEN}✅ Recovery complete!${NC}"
else
    echo -e "${RED}❌ Blockchain still not responding${NC}"
    echo ""
    echo -e "${YELLOW}Checking logs for errors...${NC}"
    remote_exec "tail -50 /var/log/dytallix-node.log 2>/dev/null || journalctl -u dytallix* -n 50 || docker-compose logs --tail=50"
    echo ""
    echo -e "${YELLOW}Manual debugging required. Connect to server:${NC}"
    echo "  ssh $SSH_USER@$SERVER_IP"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
