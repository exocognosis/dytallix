#!/bin/bash

# Transfer Updated QuantumVault Files to Hetzner
# Updates the server with dytallix.com configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Server configuration
SERVER_IP="178.156.187.81"
SERVER_USER="root"
LOCAL_DIR="/Users/rickglenn/Downloads/dytallix-main"

echo -e "${BLUE}🚀 Transferring Updated QuantumVault Files to Hetzner${NC}"
echo -e "${BLUE}Server: ${SERVER_IP}${NC}"
echo ""

# Test SSH connection
echo -e "${YELLOW}🔍 Testing SSH connection...${NC}"
if ! ssh -o ConnectTimeout=10 "$SERVER_USER@$SERVER_IP" "echo 'Connection successful'" 2>/dev/null; then
    echo -e "${RED}❌ Cannot connect to server${NC}"
    echo "Please ensure:"
    echo "  1. SSH key is properly configured"
    echo "  2. Server is accessible: ping $SERVER_IP"
    echo "  3. Try manual connection: ssh $SERVER_USER@$SERVER_IP"
    exit 1
fi
echo -e "${GREEN}✅ SSH connection successful${NC}"
echo ""

# Create updated files list
echo -e "${YELLOW}📋 Files to be transferred:${NC}"
FILES_TO_TRANSFER=(
    "dytallix-fast-launch/.env.example"
    "dytallix-fast-launch/.env.hetzner"
    "dytallix-fast-launch/frontend/src/routes/QuantumVault.jsx"
    "dytallix-fast-launch/frontend/src/lib/quantum/api.js"
    "dytallix-fast-launch/frontend/src/components/quantum/UploadCard.jsx"
    "dytallix-fast-launch/services/quantumvault-api/server.js"
    "dytallix-fast-launch/services/quantumvault-api/package.json"
    "blockchain-core/src/api/mod.rs"
    "quantumvault-integration-test.js"
    "quantumvault-demo.js"
    "QUANTUMVAULT_INTEGRATION.md"
    "QUANTUMVAULT_FRONTEND_BACKEND_INTEGRATION_COMPLETE.md"
    "start-quantumvault.sh"
)

for file in "${FILES_TO_TRANSFER[@]}"; do
    if [[ -f "$LOCAL_DIR/$file" ]]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (missing)"
    fi
done
echo ""

# Create backup on server
echo -e "${YELLOW}💼 Creating backup on server...${NC}"
ssh "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
    # Create backup directory with timestamp
    BACKUP_DIR="/opt/dytallix-backup-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup existing files
    if [ -d "/opt/dytallix-fast-launch" ]; then
        cp -r /opt/dytallix-fast-launch "$BACKUP_DIR/"
        echo "✅ Backup created at $BACKUP_DIR"
    else
        echo "⚠️  No existing deployment found to backup"
    fi
    
    # Create deployment directory
    mkdir -p /opt/dytallix-fast-launch
ENDSSH
echo -e "${GREEN}✅ Backup created${NC}"
echo ""

# Transfer updated configuration files
echo -e "${YELLOW}📤 Transferring configuration files...${NC}"

# Transfer .env files
scp "$LOCAL_DIR/dytallix-fast-launch/.env.example" "$SERVER_USER@$SERVER_IP:/opt/dytallix-fast-launch/"
scp "$LOCAL_DIR/dytallix-fast-launch/.env.hetzner" "$SERVER_USER@$SERVER_IP:/opt/dytallix-fast-launch/"

# Copy .env.hetzner to .env for production use
ssh "$SERVER_USER@$SERVER_IP" "cd /opt/dytallix-fast-launch && cp .env.hetzner .env"

echo -e "${GREEN}✅ Configuration files transferred${NC}"

# Transfer frontend files
echo -e "${YELLOW}📤 Transferring frontend files...${NC}"
ssh "$SERVER_USER@$SERVER_IP" "mkdir -p /opt/dytallix-fast-launch/frontend/src/routes"
ssh "$SERVER_USER@$SERVER_IP" "mkdir -p /opt/dytallix-fast-launch/frontend/src/lib/quantum"
ssh "$SERVER_USER@$SERVER_IP" "mkdir -p /opt/dytallix-fast-launch/frontend/src/components/quantum"

scp "$LOCAL_DIR/dytallix-fast-launch/frontend/src/routes/QuantumVault.jsx" "$SERVER_USER@$SERVER_IP:/opt/dytallix-fast-launch/frontend/src/routes/"
scp "$LOCAL_DIR/dytallix-fast-launch/frontend/src/lib/quantum/api.js" "$SERVER_USER@$SERVER_IP:/opt/dytallix-fast-launch/frontend/src/lib/quantum/"
scp "$LOCAL_DIR/dytallix-fast-launch/frontend/src/components/quantum/UploadCard.jsx" "$SERVER_USER@$SERVER_IP:/opt/dytallix-fast-launch/frontend/src/components/quantum/"

echo -e "${GREEN}✅ Frontend files transferred${NC}"

# Transfer backend files
echo -e "${YELLOW}📤 Transferring backend files...${NC}"
ssh "$SERVER_USER@$SERVER_IP" "mkdir -p /opt/dytallix-fast-launch/services/quantumvault-api"
ssh "$SERVER_USER@$SERVER_IP" "mkdir -p /opt/dytallix-fast-launch/blockchain-core/src/api"

scp "$LOCAL_DIR/dytallix-fast-launch/services/quantumvault-api/server.js" "$SERVER_USER@$SERVER_IP:/opt/dytallix-fast-launch/services/quantumvault-api/"
scp "$LOCAL_DIR/dytallix-fast-launch/services/quantumvault-api/package.json" "$SERVER_USER@$SERVER_IP:/opt/dytallix-fast-launch/services/quantumvault-api/"
scp "$LOCAL_DIR/blockchain-core/src/api/mod.rs" "$SERVER_USER@$SERVER_IP:/opt/dytallix-fast-launch/blockchain-core/src/api/"

echo -e "${GREEN}✅ Backend files transferred${NC}"

# Transfer testing and documentation
echo -e "${YELLOW}📤 Transferring testing and documentation...${NC}"
scp "$LOCAL_DIR/quantumvault-integration-test.js" "$SERVER_USER@$SERVER_IP:/opt/dytallix-fast-launch/"
scp "$LOCAL_DIR/quantumvault-demo.js" "$SERVER_USER@$SERVER_IP:/opt/dytallix-fast-launch/"
scp "$LOCAL_DIR/QUANTUMVAULT_INTEGRATION.md" "$SERVER_USER@$SERVER_IP:/opt/dytallix-fast-launch/"
scp "$LOCAL_DIR/QUANTUMVAULT_FRONTEND_BACKEND_INTEGRATION_COMPLETE.md" "$SERVER_USER@$SERVER_IP:/opt/dytallix-fast-launch/"
scp "$LOCAL_DIR/start-quantumvault.sh" "$SERVER_USER@$SERVER_IP:/opt/dytallix-fast-launch/"

echo -e "${GREEN}✅ Documentation and testing files transferred${NC}"

# Update dependencies and rebuild
echo -e "${YELLOW}🔧 Updating dependencies on server...${NC}"
ssh "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
    cd /opt/dytallix-fast-launch

    # Update Node.js dependencies for QuantumVault API
    if [ -d "services/quantumvault-api" ]; then
        echo "📦 Updating QuantumVault API dependencies..."
        cd services/quantumvault-api
        npm install
        cd ../..
    fi

    # Update frontend dependencies if they exist
    if [ -d "frontend" ]; then
        echo "📦 Updating frontend dependencies..."
        cd frontend
        if [ -f "package.json" ]; then
            npm install
        fi
        cd ..
    fi

    # Make scripts executable
    chmod +x start-quantumvault.sh
    chmod +x quantumvault-integration-test.js
    chmod +x quantumvault-demo.js

    echo "✅ Dependencies updated"
ENDSSH
echo -e "${GREEN}✅ Dependencies updated${NC}"

# Test the configuration
echo -e "${YELLOW}🧪 Testing configuration...${NC}"
ssh "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
    cd /opt/dytallix-fast-launch
    
    # Check if .env file exists and has correct content
    if [ -f ".env" ]; then
        echo "✅ .env file exists"
        if grep -q "dytallix.com" .env; then
            echo "✅ Configuration updated to use dytallix.com"
        else
            echo "⚠️  Configuration may not be updated correctly"
        fi
    else
        echo "❌ .env file missing"
    fi
    
    # Check if QuantumVault API files exist
    if [ -f "services/quantumvault-api/server.js" ]; then
        echo "✅ QuantumVault API server.js exists"
    else
        echo "❌ QuantumVault API server.js missing"
    fi
    
    # Check if blockchain core API file exists
    if [ -f "blockchain-core/src/api/mod.rs" ]; then
        echo "✅ Blockchain core API file exists"
    else
        echo "❌ Blockchain core API file missing"
    fi
ENDSSH

# Display next steps
echo ""
echo -e "${BLUE}🎉 File transfer completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Connect to the server:"
echo "   ssh $SERVER_USER@$SERVER_IP"
echo ""
echo "2. Navigate to the deployment directory:"
echo "   cd /opt/dytallix-fast-launch"
echo ""
echo "3. Rebuild the blockchain core (if needed):"
echo "   cd blockchain-core && cargo build --release --features api"
echo ""
echo "4. Start/restart services:"
echo "   ./start-quantumvault.sh"
echo ""
echo "5. Test the integration:"
echo "   node quantumvault-integration-test.js"
echo ""
echo "6. Run the demo:"
echo "   node quantumvault-demo.js"
echo ""
echo -e "${GREEN}✅ All files transferred and ready for deployment!${NC}"
echo ""
echo -e "${BLUE}🌐 Expected URLs after deployment:${NC}"
echo "  • Frontend: https://dytallix.com"
echo "  • API: https://api.dytallix.com"  
echo "  • RPC: https://rpc.dytallix.com"
echo "  • QuantumVault: https://quantumvault.dytallix.com"
