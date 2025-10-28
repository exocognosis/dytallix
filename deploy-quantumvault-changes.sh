#!/bin/bash

# Deploy QuantumVault Changes to Hetzner Server
# This script syncs all QuantumVault code changes while excluding .md documentation files

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_NAME="dytallix-production"
SERVER_IP="178.156.187.81"
SERVER_USER="dytallix"
SSH_KEY="${HOME}/.ssh/dytallix_deploy"
REMOTE_PATH="/opt/dytallix/dytallix-main"
LOCAL_PATH="$(pwd)"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Deploy QuantumVault Changes to Hetzner Server            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verify we're in the correct directory
if [ ! -d "dytallix-fast-launch/services/quantumvault-api" ]; then
    echo -e "${RED}❌ Error: Not in the correct directory${NC}"
    echo "Please run this script from the dytallix-main root directory"
    exit 1
fi

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ SSH key not found at $SSH_KEY${NC}"
    echo "Please ensure your SSH key exists or update the SSH_KEY variable"
    exit 1
fi

# Test SSH connection
echo -e "${BLUE}🔌 Testing SSH connection to $SERVER_IP...${NC}"
if ! ssh -i "$SSH_KEY" -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "echo 'Connection successful'" > /dev/null 2>&1; then
    echo -e "${RED}❌ Failed to connect to server${NC}"
    echo "Please check your SSH key and server connectivity"
    exit 1
fi
echo -e "${GREEN}✅ SSH connection successful${NC}"
echo ""

# Create rsync exclude file
EXCLUDE_FILE=$(mktemp)
cat > "$EXCLUDE_FILE" << 'EOF'
# Exclude QuantumVault documentation files
services/quantumvault-api/*.md
services/quantumvault-api/README.md
services/quantumvault-api/README-old.md
services/quantumvault-api/API-V2-DOCUMENTATION.md
services/quantumvault-api/IMPLEMENTATION-COMPLETE.md
services/quantumvault-api/QUANTUMVAULT-UNIFIED.md
services/quantumvault-api/PHASE-1-SUMMARY.md
services/quantumvault-api/PHASE-5-COMPLETE.md

# Exclude other documentation and development files
*.log
*.tmp
.DS_Store
node_modules/
.git/
.env
.env.local
EOF

echo -e "${BLUE}📋 Files to exclude from deployment:${NC}"
echo -e "${YELLOW}  • services/quantumvault-api/*.md (7 documentation files)${NC}"
echo -e "${YELLOW}  • node_modules/, .git/, .env files${NC}"
echo ""

# Show what will be synced
echo -e "${BLUE}📦 QuantumVault files to be deployed:${NC}"
echo -e "${GREEN}Backend:${NC}"
echo "  • services/quantumvault-api/server-v2.js"
echo "  • services/quantumvault-api/blockchain-service.js"
echo "  • services/quantumvault-api/kms-service.js"
echo "  • services/quantumvault-api/crypto-service.js"
echo "  • services/quantumvault-api/monitoring-service.js"
echo "  • services/quantumvault-api/security-middleware.js"
echo "  • services/quantumvault-api/package.json"
echo ""
echo -e "${GREEN}Frontend:${NC}"
echo "  • frontend/src/routes/QuantumVault.jsx"
echo "  • frontend/src/components/quantum/*"
echo "  • frontend/src/App.jsx (navigation updates)"
echo ""

# Prompt for confirmation
read -p "$(echo -e ${YELLOW}Continue with deployment? [y/N]: ${NC})" -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Deployment cancelled${NC}"
    rm "$EXCLUDE_FILE"
    exit 0
fi

echo ""
echo -e "${BLUE}🚀 Starting deployment...${NC}"
echo ""

# Sync QuantumVault backend
echo -e "${BLUE}[1/4] Syncing QuantumVault API backend...${NC}"
rsync -avz \
    --exclude-from="$EXCLUDE_FILE" \
    -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
    "$LOCAL_PATH/dytallix-fast-launch/services/quantumvault-api/" \
    "$SERVER_USER@$SERVER_IP:$REMOTE_PATH/dytallix-fast-launch/services/quantumvault-api/" \
    --delete-excluded

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend synced successfully${NC}"
else
    echo -e "${RED}❌ Backend sync failed${NC}"
    rm "$EXCLUDE_FILE"
    exit 1
fi
echo ""

# Sync frontend routes
echo -e "${BLUE}[2/4] Syncing frontend routes...${NC}"
rsync -avz \
    -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
    "$LOCAL_PATH/dytallix-fast-launch/frontend/src/routes/QuantumVault.jsx" \
    "$SERVER_USER@$SERVER_IP:$REMOTE_PATH/dytallix-fast-launch/frontend/src/routes/"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Routes synced successfully${NC}"
else
    echo -e "${RED}❌ Routes sync failed${NC}"
    rm "$EXCLUDE_FILE"
    exit 1
fi
echo ""

# Sync frontend components
echo -e "${BLUE}[3/4] Syncing frontend components...${NC}"
rsync -avz \
    -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
    "$LOCAL_PATH/dytallix-fast-launch/frontend/src/components/quantum/" \
    "$SERVER_USER@$SERVER_IP:$REMOTE_PATH/dytallix-fast-launch/frontend/src/components/quantum/"

rsync -avz \
    -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
    "$LOCAL_PATH/dytallix-fast-launch/frontend/src/App.jsx" \
    "$SERVER_USER@$SERVER_IP:$REMOTE_PATH/dytallix-fast-launch/frontend/src/"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Components synced successfully${NC}"
else
    echo -e "${RED}❌ Components sync failed${NC}"
    rm "$EXCLUDE_FILE"
    exit 1
fi
echo ""

# Deploy and restart services on the server
echo -e "${BLUE}[4/4] Deploying and restarting services on server...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
set -e

echo "📦 Installing backend dependencies..."
cd /opt/dytallix/dytallix-main/dytallix-fast-launch/services/quantumvault-api
npm install --production

echo "🔨 Building frontend..."
cd /opt/dytallix/dytallix-main/dytallix-fast-launch/frontend
npm install
npm run build

echo "🔄 Restarting QuantumVault API service..."
sudo systemctl restart quantumvault-api || pm2 restart quantumvault-api || echo "Service not running, skipping restart"

echo "🔄 Restarting frontend service..."
sudo systemctl restart dytallix-frontend || pm2 restart frontend || echo "Frontend service not running, skipping restart"

echo "✅ Deployment complete!"
ENDSSH

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Services restarted successfully${NC}"
else
    echo -e "${RED}❌ Service restart failed${NC}"
    rm "$EXCLUDE_FILE"
    exit 1
fi

# Cleanup
rm "$EXCLUDE_FILE"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ QuantumVault Deployment Complete!                     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Deployment Summary:${NC}"
echo "  • Backend files synced (excluding .md docs)"
echo "  • Frontend routes and components updated"
echo "  • Dependencies installed"
echo "  • Services restarted"
echo ""
echo -e "${BLUE}🌐 Access Points:${NC}"
echo "  • Frontend: http://$SERVER_IP:8787/#/quantumvault"
echo "  • API: http://$SERVER_IP:3031/health"
echo "  • SSH: ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP"
echo ""
echo -e "${YELLOW}💡 Next Steps:${NC}"
echo "  1️⃣  Verify deployment: curl http://$SERVER_IP:3031/health"
echo "  2️⃣  Test frontend: Open http://$SERVER_IP:8787/#/quantumvault in browser"
echo "  3️⃣  Check logs: ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP 'pm2 logs quantumvault-api'"
echo ""
