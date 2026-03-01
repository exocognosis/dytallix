#!/bin/bash
set -e

# Configuration
ARCHIVE_NAME="quantumvault-deploy.tar.gz"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)" # Assumes script is in QuantumVaultMVP or root?
# Actually, let's assume this script runs from QuantumVaultMVP directory (where deploy script is).
# So ROOT_DIR should be up one level if we are in QuantumVaultMVP.

echo "📦 Packaging QuantumVault MVP & Dependencies..."

# Clean previous archive
rm -f $ARCHIVE_NAME

# Create temp directory
mkdir -p temp_deploy
cp ecosystem.config.js temp_deploy/
cp nginx-quantumvault.conf temp_deploy/

# Copy Backend
echo "Copying Backend..."
mkdir -p temp_deploy/backend
rsync -av --exclude node_modules --exclude dist backend/ temp_deploy/backend/

# Copy Frontend
echo "Copying Frontend..."
mkdir -p temp_deploy/frontend
rsync -av --exclude node_modules --exclude .next --exclude .env.local frontend/ temp_deploy/frontend/

# Copy Blockchain Core (Dependency)
echo "Copying Blockchain Core..."
mkdir -p temp_deploy/blockchain-core
# Assuming blockchain-core is peer of QuantumVaultMVP
rsync -av --exclude target --exclude .git ../blockchain-core/ temp_deploy/blockchain-core/

# Copy PQC Crypto (Dependency)
echo "Copying PQC Crypto..."
mkdir -p temp_deploy/pqc-crypto
rsync -av --exclude target --exclude .git ../pqc-crypto/ temp_deploy/pqc-crypto/

# Copy Smart Contracts (Dependency)
echo "Copying Smart Contracts..."
mkdir -p temp_deploy/smart-contracts
rsync -av --exclude target --exclude .git ../smart-contracts/ temp_deploy/smart-contracts/

# Copy Fast Launch Node (The Application)
echo "Copying Fast Launch Node..."
mkdir -p temp_deploy/dytallix-fast-launch/node
rsync -av --exclude target --exclude .git ../dytallix-fast-launch/node/ temp_deploy/dytallix-fast-launch/node/

# Copy Fast Launch Server (API)
echo "Copying Fast Launch API Server..."
mkdir -p temp_deploy/dytallix-fast-launch/server
rsync -av --exclude node_modules --exclude .env --exclude .venv ../dytallix-fast-launch/server/ temp_deploy/dytallix-fast-launch/server/

# Copy Main Frontend (Wallet/Explorer)
echo "Copying Main Frontend..."
mkdir -p temp_deploy/main-frontend
rsync -av --exclude node_modules --exclude dist --exclude .next ../dytallix-fast-launch/build/ temp_deploy/main-frontend/

# Create Archive
echo "Creating Archive..."
tar -czf $ARCHIVE_NAME -C temp_deploy .

# Cleanup
rm -rf temp_deploy

echo "✅ Package created: $ARCHIVE_NAME"
echo "👉 Now run: ./deploy-quantumvault.sh"
