#!/usr/bin/env bash
# Dytallix Fast Launch - Remote Server Deployment Script
# Run this script on the remote server after transferring the deployment package
set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $*"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')]${NC} ⚠️  $*"; }
error() { echo -e "${RED}[$(date '+%H:%M:%S')]${NC} ❌ $*"; exit 1; }
info() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} ℹ️  $*"; }
step() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} 📋 $*"; }

# Banner
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║   Dytallix Fast Launch - Remote Server Deployment        ║
║   Automated deployment on remote infrastructure           ║
╚═══════════════════════════════════════════════════════════╝
EOF

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Configuration
SERVER_IP="${SERVER_IP:-}"
SERVER_USER="${SERVER_USER:-root}"
SERVER_PORT="${SERVER_PORT:-22}"
SSH_KEY="${SSH_KEY:-}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/dytallix-fast-launch}"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --server|-s)
      SERVER_IP="$2"
      shift 2
      ;;
    --user|-u)
      SERVER_USER="$2"
      shift 2
      ;;
    --port|-p)
      SERVER_PORT="$2"
      shift 2
      ;;
    --key|-k)
      SSH_KEY="$2"
      shift 2
      ;;
    --path|-d)
      DEPLOY_PATH="$2"
      shift 2
      ;;
    --help|-h)
      cat << EOF
Usage: $0 [OPTIONS]

Deploy Dytallix Fast Launch to a remote server.

OPTIONS:
  -s, --server <IP>      Remote server IP address (required)
  -u, --user <USER>      SSH user (default: root)
  -p, --port <PORT>      SSH port (default: 22)
  -k, --key <PATH>       SSH private key path (optional)
  -d, --path <PATH>      Deployment path on server (default: /opt/dytallix-fast-launch)
  -h, --help             Show this help message

EXAMPLES:
  # Basic deployment
  $0 --server 192.168.1.100

  # With SSH key
  $0 --server 192.168.1.100 --key ~/.ssh/id_rsa

  # Custom user and path
  $0 --server 192.168.1.100 --user ubuntu --path /home/ubuntu/dytallix

ENVIRONMENT VARIABLES:
  SERVER_IP              Same as --server
  SERVER_USER            Same as --user
  SERVER_PORT            Same as --port
  SSH_KEY                Same as --key
  DEPLOY_PATH            Same as --path

EOF
      exit 0
      ;;
    *)
      error "Unknown option: $1. Use --help for usage information."
      ;;
  esac
done

# Validate required parameters
if [ -z "$SERVER_IP" ]; then
  error "Server IP is required. Use --server <IP> or set SERVER_IP environment variable."
fi

# Build SSH command
SSH_CMD="ssh"
if [ -n "$SSH_KEY" ]; then
  SSH_CMD="$SSH_CMD -i $SSH_KEY"
fi
SSH_CMD="$SSH_CMD -p $SERVER_PORT"

SCP_CMD="scp"
if [ -n "$SSH_KEY" ]; then
  SCP_CMD="$SCP_CMD -i $SSH_KEY"
fi
SCP_CMD="$SCP_CMD -P $SERVER_PORT"

RSYNC_CMD="rsync -avz --progress"
if [ -n "$SSH_KEY" ]; then
  RSYNC_CMD="$RSYNC_CMD -e 'ssh -i $SSH_KEY -p $SERVER_PORT'"
fi

log "Deployment Configuration:"
info "  Server: ${SERVER_USER}@${SERVER_IP}:${SERVER_PORT}"
info "  Deploy Path: ${DEPLOY_PATH}"
info "  SSH Key: ${SSH_KEY:-<default>}"
echo ""

# Step 1: Test SSH connection
step "Step 1: Testing SSH connection..."
if ! $SSH_CMD ${SERVER_USER}@${SERVER_IP} "echo 'SSH connection successful'" > /dev/null 2>&1; then
  error "Failed to connect to server. Please check your SSH configuration."
fi
log "✅ SSH connection successful"
echo ""

# Step 2: Check server prerequisites
step "Step 2: Checking server prerequisites..."
$SSH_CMD ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
  # Check Docker
  if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker not found. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
    rm get-docker.sh
  fi
  
  # Check Docker Compose
  if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    echo "⚠️  Docker Compose not found. Installing..."
    if docker compose version &> /dev/null 2>&1; then
      echo "✅ Docker Compose (plugin) is available"
    else
      curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
      chmod +x /usr/local/bin/docker-compose
    fi
  fi
  
  echo "✅ Prerequisites check passed"
  docker --version
  docker-compose --version 2>/dev/null || docker compose version
ENDSSH
echo ""

# Step 3: Prepare deployment package
step "Step 3: Preparing deployment package..."
if [ ! -f "${ROOT_DIR}/scripts/deployment/prepare-deployment-package.sh" ]; then
  error "Deployment package script not found. Please run from dytallix-fast-launch directory."
fi

cd "$ROOT_DIR"
bash scripts/deployment/prepare-deployment-package.sh
echo ""

# Find the latest package
BUILD_DIR="${ROOT_DIR}/../build"
LATEST_PACKAGE=$(ls -t "${BUILD_DIR}"/dytallix-fast-launch-*.tar.gz 2>/dev/null | head -1)

if [ -z "$LATEST_PACKAGE" ]; then
  error "No deployment package found. Package preparation may have failed."
fi

PACKAGE_NAME=$(basename "$LATEST_PACKAGE" .tar.gz)
log "Using package: $PACKAGE_NAME"
echo ""

# Step 4: Transfer package to server
step "Step 4: Transferring deployment package to server..."
log "Transferring ${LATEST_PACKAGE}..."

$SCP_CMD "$LATEST_PACKAGE" ${SERVER_USER}@${SERVER_IP}:/tmp/
log "✅ Package transferred successfully"
echo ""

# Step 5: Extract and setup on server
step "Step 5: Extracting and setting up on server..."
$SSH_CMD ${SERVER_USER}@${SERVER_IP} << ENDSSH
  # Create deployment directory
  mkdir -p $DEPLOY_PATH
  
  # Extract package
  cd /tmp
  tar -xzf ${PACKAGE_NAME}.tar.gz
  
  # Move to deployment location
  rm -rf ${DEPLOY_PATH}.old 2>/dev/null || true
  if [ -d "$DEPLOY_PATH" ]; then
    mv $DEPLOY_PATH ${DEPLOY_PATH}.old
  fi
  mv ${PACKAGE_NAME} $DEPLOY_PATH
  
  # Cleanup
  rm ${PACKAGE_NAME}.tar.gz
  
  echo "✅ Package extracted to $DEPLOY_PATH"
ENDSSH
echo ""

# Step 6: Configure environment
step "Step 6: Configuring environment..."
$SSH_CMD ${SERVER_USER}@${SERVER_IP} << ENDSSH
  cd $DEPLOY_PATH
  
  # Create .env from example if it doesn't exist
  if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  .env file created from template. Please review and update configuration."
  else
    echo "✅ Using existing .env file"
  fi
ENDSSH
echo ""

# Step 7: Ask if user wants to deploy now
warn "Deployment package is ready on the server!"
echo ""
echo "Next steps:"
echo "1. SSH to the server: $SSH_CMD ${SERVER_USER}@${SERVER_IP}"
echo "2. Navigate to: cd $DEPLOY_PATH"
echo "3. Review and edit .env file: nano .env"
echo "4. Start deployment: ./deploy.sh"
echo ""

read -p "Do you want to start the deployment now? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  step "Step 8: Starting deployment..."
  $SSH_CMD ${SERVER_USER}@${SERVER_IP} << ENDSSH
    cd $DEPLOY_PATH
    ./deploy.sh
ENDSSH
  
  log "🎉 Deployment complete!"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 Service Access Information:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Node RPC:     http://${SERVER_IP}:3030"
  echo "  API/Faucet:   http://${SERVER_IP}:8787"
  echo "  Frontend:     http://${SERVER_IP}:5173"
  echo "  Prometheus:   http://${SERVER_IP}:9090"
  echo "  Grafana:      http://${SERVER_IP}:3000"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Check deployment status:"
  echo "  $SSH_CMD ${SERVER_USER}@${SERVER_IP} 'cd $DEPLOY_PATH && docker-compose ps'"
  echo ""
else
  log "Deployment skipped. To deploy manually:"
  echo "  $SSH_CMD ${SERVER_USER}@${SERVER_IP}"
  echo "  cd $DEPLOY_PATH"
  echo "  nano .env  # Review configuration"
  echo "  ./deploy.sh"
fi

echo ""
log "✨ All done!"
