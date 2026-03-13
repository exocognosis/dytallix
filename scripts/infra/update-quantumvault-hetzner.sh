#!/bin/bash

# Quick update script for QuantumVault.jsx on Hetzner server
# This script updates only the QuantumVault.jsx file without full redeployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_NAME="dytallix-production"
SSH_KEY="~/.ssh/dytallix_deploy"

echo -e "${BLUE}🚀 Updating QuantumVault.jsx on Hetzner Server${NC}"
echo ""

# Get server IP
if command -v hcloud &> /dev/null && [ -n "$HETZNER_TOKEN" ]; then
    SERVER_IP=$(hcloud server describe $SERVER_NAME -o format='{{.PublicNet.IPv4.IP}}' 2>/dev/null || echo "")
fi

# If hcloud failed or not available, prompt for IP
if [ -z "$SERVER_IP" ]; then
    echo -e "${YELLOW}⚠️  Please enter your Hetzner server IP address:${NC}"
    read -p "Server IP: " SERVER_IP
fi

echo -e "${GREEN}🌐 Server IP: $SERVER_IP${NC}"

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ SSH key not found at $SSH_KEY${NC}"
    echo "Please ensure your SSH key exists or update the SSH_KEY variable in this script"
    exit 1
fi

echo ""
echo -e "${BLUE}� Connecting to Hetzner server...${NC}"
echo -e "${YELLOW}💡 Once connected, you can manually update the QuantumVault.jsx file${NC}"
echo ""
echo -e "${BLUE}📝 Manual update steps:${NC}"
echo "  1️⃣  Navigate to: cd /opt/dytallix/dytallix-main"
echo "  2️⃣  Backup current file: cp dytallix-fast-launch/frontend/src/routes/QuantumVault.jsx dytallix-fast-launch/frontend/src/routes/QuantumVault.jsx.backup"
echo "  3️⃣  Edit the file: nano dytallix-fast-launch/frontend/src/routes/QuantumVault.jsx"
echo "  4️⃣  Rebuild frontend: cd dytallix-fast-launch/frontend && npm run build"
echo "  5️⃣  Restart services: sudo systemctl restart dytallix"
echo ""
echo -e "${GREEN}� Connecting via SSH...${NC}"
echo ""

# SSH into the server
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no dytallix@$SERVER_IP
