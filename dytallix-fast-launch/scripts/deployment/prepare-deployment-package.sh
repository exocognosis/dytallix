#!/usr/bin/env bash
# Dytallix Fast Launch - Deployment Package Preparation
# This script creates a clean deployment package ready for remote server transfer
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PACKAGE_NAME="dytallix-fast-launch-${TIMESTAMP}"
BUILD_DIR="${ROOT_DIR}/build"
PACKAGE_DIR="${BUILD_DIR}/${PACKAGE_NAME}"

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

# Banner
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║   Dytallix Fast Launch - Deployment Package Builder      ║
║   Preparing files for remote server deployment           ║
╚═══════════════════════════════════════════════════════════╝
EOF

log "Starting deployment package preparation..."
log "Package name: ${PACKAGE_NAME}"

# Create package directory
mkdir -p "${PACKAGE_DIR}"

# Copy core configuration files
log "Copying core configuration files..."
cp "${ROOT_DIR}/.env.example" "${PACKAGE_DIR}/"
cp "${ROOT_DIR}/package.json" "${PACKAGE_DIR}/"
cp "${ROOT_DIR}/package-lock.json" "${PACKAGE_DIR}/"
cp "${ROOT_DIR}/Cargo.toml" "${PACKAGE_DIR}/"
cp "${ROOT_DIR}/Cargo.lock" "${PACKAGE_DIR}/"
cp "${ROOT_DIR}/Makefile" "${PACKAGE_DIR}/" 2>/dev/null || warn "Makefile not found"
cp "${ROOT_DIR}/genesis.json" "${PACKAGE_DIR}/"

# Copy Docker files
log "Copying Docker configuration..."
cp "${ROOT_DIR}/Dockerfile" "${PACKAGE_DIR}/"
cp "${ROOT_DIR}/docker-compose.yml" "${PACKAGE_DIR}/"
cp "${ROOT_DIR}/docker-compose.faucet.yml" "${PACKAGE_DIR}/"
cp "${ROOT_DIR}/docker-compose.observability.yml" "${PACKAGE_DIR}/"

# Copy deployment script
log "Copying deployment scripts..."
cp "${ROOT_DIR}/deploy.sh" "${PACKAGE_DIR}/"
chmod +x "${PACKAGE_DIR}/deploy.sh"

# Copy scripts directory
log "Copying scripts directory..."
mkdir -p "${PACKAGE_DIR}/scripts"
rsync -av --exclude='*.log' "${ROOT_DIR}/scripts/" "${PACKAGE_DIR}/scripts/"
chmod +x "${PACKAGE_DIR}/scripts/"*.sh 2>/dev/null || true
chmod +x "${PACKAGE_DIR}/scripts/deployment/"*.sh 2>/dev/null || true
chmod +x "${PACKAGE_DIR}/scripts/evidence/"*.sh 2>/dev/null || true

# Copy node source
log "Copying node source code..."
mkdir -p "${PACKAGE_DIR}/node"
rsync -av \
  --exclude='target' \
  --exclude='*.log' \
  --exclude='data' \
  --exclude='launch-evidence' \
  --exclude='node' \
  "${ROOT_DIR}/node/" "${PACKAGE_DIR}/node/"

# Copy server source
log "Copying server source code..."
mkdir -p "${PACKAGE_DIR}/server"
rsync -av \
  --exclude='node_modules' \
  --exclude='*.log' \
  "${ROOT_DIR}/server/" "${PACKAGE_DIR}/server/"

# Copy frontend source
log "Copying frontend source code..."
mkdir -p "${PACKAGE_DIR}/frontend"
rsync -av \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='*.log' \
  "${ROOT_DIR}/frontend/" "${PACKAGE_DIR}/frontend/"

# Copy CLI source if exists
if [ -d "${ROOT_DIR}/cli" ]; then
  log "Copying CLI source code..."
  mkdir -p "${PACKAGE_DIR}/cli"
  rsync -av \
    --exclude='target' \
    --exclude='*.log' \
    "${ROOT_DIR}/cli/" "${PACKAGE_DIR}/cli/"
fi

# Copy SDK source if exists
if [ -d "${ROOT_DIR}/sdk" ]; then
  log "Copying SDK source code..."
  mkdir -p "${PACKAGE_DIR}/sdk"
  rsync -av \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='*.log' \
    "${ROOT_DIR}/sdk/" "${PACKAGE_DIR}/sdk/"
fi

# Copy documentation
log "Copying documentation..."
cp "${ROOT_DIR}/README.md" "${PACKAGE_DIR}/"
cp "${ROOT_DIR}/BUILDER_GUIDE.md" "${PACKAGE_DIR}/" 2>/dev/null || warn "BUILDER_GUIDE.md not found"
cp "${ROOT_DIR}/DEPLOYMENT_SUMMARY.md" "${PACKAGE_DIR}/" 2>/dev/null || warn "DEPLOYMENT_SUMMARY.md not found"
cp "${ROOT_DIR}/FAST_LAUNCH_SUMMARY.md" "${PACKAGE_DIR}/" 2>/dev/null || warn "FAST_LAUNCH_SUMMARY.md not found"
cp "${ROOT_DIR}/FINAL_CHECKLIST.md" "${PACKAGE_DIR}/" 2>/dev/null || warn "FINAL_CHECKLIST.md not found"
cp "${ROOT_DIR}/DEPLOYMENT_FILES_LIST.md" "${PACKAGE_DIR}/" 2>/dev/null || warn "DEPLOYMENT_FILES_LIST.md not found"

# Copy docs directory if exists
if [ -d "${ROOT_DIR}/docs" ]; then
  log "Copying docs directory..."
  mkdir -p "${PACKAGE_DIR}/docs"
  rsync -av "${ROOT_DIR}/docs/" "${PACKAGE_DIR}/docs/"
fi

# Create runtime directories
log "Creating runtime directories..."
mkdir -p "${PACKAGE_DIR}/logs"
mkdir -p "${PACKAGE_DIR}/data"
mkdir -p "${PACKAGE_DIR}/launch-evidence"
mkdir -p "${PACKAGE_DIR}/.pids"

# Create deployment info file
log "Creating deployment info file..."
cat > "${PACKAGE_DIR}/DEPLOYMENT_INFO.txt" << EOF
Dytallix Fast Launch Deployment Package
========================================

Package Created: $(date)
Version: $(git describe --tags --always 2>/dev/null || echo "unknown")
Branch: $(git branch --show-current 2>/dev/null || echo "unknown")
Commit: $(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

Package Contents:
- Core configuration files
- Docker configurations
- Deployment scripts
- Node source code
- Server source code  
- Frontend source code
- Documentation

Next Steps:
1. Transfer this package to your remote server
2. Extract and navigate to the directory
3. Copy .env.example to .env and configure
4. Run ./deploy.sh to start deployment

For more information, see DEPLOYMENT_FILES_LIST.md
EOF

# Create quick start script
log "Creating quick start script..."
cat > "${PACKAGE_DIR}/quick-start.sh" << 'EOF'
#!/usr/bin/env bash
# Dytallix Fast Launch - Quick Start Script
set -e

echo "🚀 Dytallix Fast Launch - Quick Start"
echo "======================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "⚠️  .env file not found!"
  echo "Creating .env from .env.example..."
  cp .env.example .env
  echo "✅ .env created. Please edit it with your configuration."
  echo ""
  read -p "Press Enter after editing .env to continue..."
fi

# Check Docker
if ! command -v docker &> /dev/null; then
  echo "❌ Docker not found. Please install Docker first."
  exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
  echo "❌ Docker Compose not found. Please install Docker Compose first."
  exit 1
fi

echo "✅ Prerequisites check passed"
echo ""
echo "Starting deployment..."
./deploy.sh
EOF
chmod +x "${PACKAGE_DIR}/quick-start.sh"

# Create .gitignore for the package
cat > "${PACKAGE_DIR}/.gitignore" << 'EOF'
# Environment files
.env
.env.local
.env.staging
.env.production

# Dependencies
node_modules/
target/

# Build outputs
dist/
build/

# Logs
*.log
logs/

# Runtime data
data/
.pids/

# Evidence
launch-evidence/
e2e-artifacts/
EOF

# Calculate package size
PACKAGE_SIZE=$(du -sh "${PACKAGE_DIR}" | cut -f1)

log "Package preparation complete!"
info "Package location: ${PACKAGE_DIR}"
info "Package size: ${PACKAGE_SIZE}"
echo ""

# Create tarball
log "Creating compressed archive..."
cd "${BUILD_DIR}"
tar -czf "${PACKAGE_NAME}.tar.gz" "${PACKAGE_NAME}"
TARBALL_SIZE=$(du -sh "${PACKAGE_NAME}.tar.gz" | cut -f1)

log "✅ Deployment package ready!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Package: ${BUILD_DIR}/${PACKAGE_NAME}.tar.gz"
echo "📊 Archive size: ${TARBALL_SIZE}"
echo "📁 Extracted size: ${PACKAGE_SIZE}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Transfer to remote server:"
echo "  scp ${PACKAGE_NAME}.tar.gz user@server:/opt/"
echo ""
echo "On remote server:"
echo "  cd /opt"
echo "  tar -xzf ${PACKAGE_NAME}.tar.gz"
echo "  cd ${PACKAGE_NAME}"
echo "  ./quick-start.sh"
echo ""

# Create rsync command example
cat > "${BUILD_DIR}/TRANSFER_COMMANDS.txt" << EOF
# Transfer deployment package to remote server

## Option 1: Using SCP (Compressed)
scp ${PACKAGE_NAME}.tar.gz user@server:/opt/
ssh user@server "cd /opt && tar -xzf ${PACKAGE_NAME}.tar.gz"

## Option 2: Using rsync (Direct)
rsync -avz --progress ${PACKAGE_NAME}/ user@server:/opt/dytallix-fast-launch/

## Option 3: Using rsync with SSH key
rsync -avz --progress -e "ssh -i ~/.ssh/your-key.pem" ${PACKAGE_NAME}/ user@server:/opt/dytallix-fast-launch/

## After transfer, on remote server:
ssh user@server
cd /opt/${PACKAGE_NAME}  # or /opt/dytallix-fast-launch
./quick-start.sh
EOF

log "Transfer commands saved to: ${BUILD_DIR}/TRANSFER_COMMANDS.txt"
echo ""
log "🎉 All done! Ready for deployment."
