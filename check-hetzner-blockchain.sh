#!/bin/bash

# Script to check the blockchain status on Hetzner server
# Run this locally to SSH into the server and check the blockchain

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SERVER_IP="178.156.187.81"
SSH_USER="root"

echo -e "${BLUE}🔍 Dytallix Blockchain Status Checker${NC}"
echo "=========================================="
echo -e "Server: ${GREEN}${SERVER_IP}${NC}"
echo ""

# Try to use SSH agent or default credentials
SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
echo -e "${YELLOW}Attempting SSH connection (using SSH agent or default credentials)...${NC}"

echo -e "${BLUE}📊 Checking blockchain status on Hetzner server...${NC}"
echo ""

# Create a comprehensive check script to run on the remote server
ssh $SSH_OPTS "${SSH_USER}@${SERVER_IP}" << 'ENDSSH'

echo "=========================================="
echo "🔍 BLOCKCHAIN STATUS CHECK"
echo "=========================================="
echo ""

# Check Docker containers
echo "1️⃣ Docker Containers Status:"
echo "----------------------------"
if command -v docker &> /dev/null; then
    docker ps -a --filter "name=blockchain" --filter "name=dytallix" --filter "name=tendermint" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
else
    echo "❌ Docker not found"
fi

# Check systemd services
echo "2️⃣ Systemd Services:"
echo "----------------------------"
if systemctl list-units --type=service --all | grep -i dytallix; then
    systemctl status dytallix* --no-pager 2>/dev/null || echo "No dytallix systemd services found"
else
    echo "ℹ️  No dytallix systemd services found"
fi
echo ""

# Check PM2 processes
echo "3️⃣ PM2 Processes:"
echo "----------------------------"
if command -v pm2 &> /dev/null; then
    pm2 list
    echo ""
    pm2 logs dytallix-node --lines 20 --nostream 2>/dev/null || echo "No PM2 process named 'dytallix-node'"
else
    echo "ℹ️  PM2 not installed"
fi
echo ""

# Check blockchain RPC endpoint
echo "4️⃣ Blockchain RPC Status:"
echo "----------------------------"
if curl -s --connect-timeout 5 http://localhost:26657/status > /dev/null 2>&1; then
    echo "✅ RPC endpoint is responding"
    curl -s http://localhost:26657/status | jq '.result | {network: .node_info.network, latest_block_height: .sync_info.latest_block_height, catching_up: .sync_info.catching_up}'
elif curl -s --connect-timeout 5 http://localhost:3003/health > /dev/null 2>&1; then
    echo "✅ Blockchain API responding on port 3003"
    curl -s http://localhost:3003/health | jq '.'
else
    echo "❌ RPC endpoint not responding on port 26657 or 3003"
fi
echo ""

# Check ports in use
echo "5️⃣ Blockchain Ports:"
echo "----------------------------"
echo "Checking ports 26656, 26657, 3003, 3030..."
netstat -tlnp 2>/dev/null | grep -E ':(26656|26657|3003|3030)' || echo "ℹ️  No blockchain ports in use"
echo ""

# Check recent logs
echo "6️⃣ Recent System Logs:"
echo "----------------------------"
if [ -f /var/log/dytallix/blockchain.log ]; then
    echo "Last 30 lines of blockchain.log:"
    tail -30 /var/log/dytallix/blockchain.log
elif [ -f /opt/dytallix/logs/blockchain.log ]; then
    echo "Last 30 lines of blockchain.log:"
    tail -30 /opt/dytallix/logs/blockchain.log
else
    echo "Checking journalctl for blockchain-related logs:"
    journalctl -u dytallix* --no-pager -n 30 2>/dev/null || echo "No recent logs found"
fi
echo ""

# Check disk space
echo "7️⃣ Disk Space:"
echo "----------------------------"
df -h / | grep -v Filesystem
echo ""

# Check memory
echo "8️⃣ Memory Usage:"
echo "----------------------------"
free -h
echo ""

# Check for crash reports or core dumps
echo "9️⃣ Crash Reports:"
echo "----------------------------"
if [ -d /var/crash ]; then
    ls -lh /var/crash/ 2>/dev/null || echo "No crash reports"
else
    echo "No crash directory found"
fi
echo ""

# Check if blockchain data directory exists
echo "🔟 Blockchain Data:"
echo "----------------------------"
if [ -d /root/.dytallix ]; then
    echo "Dytallix data directory: /root/.dytallix"
    du -sh /root/.dytallix
elif [ -d /opt/dytallix/data ]; then
    echo "Dytallix data directory: /opt/dytallix/data"
    du -sh /opt/dytallix/data
else
    echo "❌ Blockchain data directory not found"
fi
echo ""

echo "=========================================="
echo "✅ Status check complete!"
echo "=========================================="

ENDSSH

echo ""
echo -e "${YELLOW}💡 Common Issues and Solutions:${NC}"
echo "----------------------------------------"
echo "1. Docker container stopped:"
echo "   ssh $SSH_OPTS $SSH_USER@$SERVER_IP 'cd /root/dytallix/docker-compose && docker-compose up -d'"
echo ""
echo "2. PM2 process stopped:"
echo "   ssh $SSH_OPTS $SSH_USER@$SERVER_IP 'pm2 restart dytallix-node'"
echo ""
echo "3. Out of disk space:"
echo "   ssh $SSH_OPTS $SSH_USER@$SERVER_IP 'docker system prune -a'"
echo ""
echo "4. View live logs:"
echo "   ssh $SSH_OPTS $SSH_USER@$SERVER_IP 'docker logs -f <container_name>'"
echo ""
echo "5. Connect to server for manual investigation:"
echo "   ssh $SSH_OPTS $SSH_USER@$SERVER_IP"
echo ""
