#!/bin/bash
# Script to create a clean public repository structure for DytallixHQ/Dytallix

set -e

PUBLIC_REPO_DIR="./public-repo-clean"
WORK_DIR="/tmp/dytallix-public-prep"

echo "🔨 Preparing public Dytallix repository..."

# Create work directory
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

# Copy only the files/dirs we want in public repo
echo "📋 Copying source files..."

# Create directory structure
mkdir -p "$PUBLIC_REPO_DIR"/{sdk,contracts,blockchain-core,docs,demo-app}

# Copy SDK files
echo "  ✓ Copying SDKs..."
cp -r /Users/rickglenn/Desktop/dytallix/sdk/typescript "$PUBLIC_REPO_DIR/sdk/"
cp -r /Users/rickglenn/Desktop/dytallix/sdk/rust "$PUBLIC_REPO_DIR/sdk/"

# Copy smart contracts
echo "  ✓ Copying contracts..."
cp -r /Users/rickglenn/Desktop/dytallix/contracts/counter "$PUBLIC_REPO_DIR/contracts/"
cp -r /Users/rickglenn/Desktop/dytallix/contracts/hello-world "$PUBLIC_REPO_DIR/contracts/" 2>/dev/null || true

# Copy blockchain-core (without sensitive files)
echo "  ✓ Copying blockchain-core..."
cp -r /Users/rickglenn/Desktop/dytallix/blockchain-core "$PUBLIC_REPO_DIR/"
# Remove sensitive files from blockchain-core
rm -f "$PUBLIC_REPO_DIR/blockchain-core/pqc_keys.json"
rm -f "$PUBLIC_REPO_DIR/blockchain-core/compliance_export_*.json"
rm -f "$PUBLIC_REPO_DIR/blockchain-core/task_3_4_demo.py"
rm -f "$PUBLIC_REPO_DIR/blockchain-core/*.key"

# Copy dytallix-fast-launch node code
echo "  ✓ Copying node implementation..."
cp -r /Users/rickglenn/Desktop/dytallix/dytallix-fast-launch "$PUBLIC_REPO_DIR/"
# Remove data directories and sensitive configs
find "$PUBLIC_REPO_DIR/dytallix-fast-launch" -name "data" -type d -exec rm -rf {} + 2>/dev/null || true
find "$PUBLIC_REPO_DIR/dytallix-fast-launch" -name "*.key" -delete
find "$PUBLIC_REPO_DIR/dytallix-fast-launch" -name "credentials.json" -delete

# Copy demo app
echo "  ✓ Copying demo app..."
cp -r /Users/rickglenn/Desktop/dytallix/demo-app "$PUBLIC_REPO_DIR/"

# Copy root files
echo "  ✓ Copying documentation..."
cp /Users/rickglenn/Desktop/dytallix/README.md "$PUBLIC_REPO_DIR/"
cp /Users/rickglenn/Desktop/dytallix/CHANGELOG.md "$PUBLIC_REPO_DIR/"
cp /Users/rickglenn/Desktop/dytallix/CONTRIBUTING.md "$PUBLIC_REPO_DIR/"
cp /Users/rickglenn/Desktop/dytallix/BUILDING.md "$PUBLIC_REPO_DIR/"
cp /Users/rickglenn/Desktop/dytallix/LICENSE "$PUBLIC_REPO_DIR/" 2>/dev/null || cp /Users/rickglenn/Desktop/dytallix/LICENSE.md "$PUBLIC_REPO_DIR/LICENSE.md"

# Copy Dockerfiles
echo "  ✓ Copying deployment files..."
cp /Users/rickglenn/Desktop/dytallix/Dockerfile "$PUBLIC_REPO_DIR/" 2>/dev/null || true
cp /Users/rickglenn/Desktop/dytallix/docker-compose.yml "$PUBLIC_REPO_DIR/" 2>/dev/null || true
cp /Users/rickglenn/Desktop/dytallix/Cargo.toml "$PUBLIC_REPO_DIR/" 2>/dev/null || true

# Create root .gitignore
cat > "$PUBLIC_REPO_DIR/.gitignore" << 'EOF'
# Rust
/target/
Cargo.lock
**/*.rs.bk

# Node
node_modules/
dist/
build/
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Data and secrets
/data/
/data*/
*.key
*.pem
secrets.json
credentials.json
.env

# Compiled contracts
*.wasm

# OS
.DS_Store
Thumbs.db
EOF

echo "✅ Public repository prepared at: $PUBLIC_REPO_DIR"
echo ""
echo "Directory structure:"
tree -L 2 "$PUBLIC_REPO_DIR" 2>/dev/null || find "$PUBLIC_REPO_DIR" -maxdepth 2 -type d | sort

echo ""
echo "📊 File count:"
find "$PUBLIC_REPO_DIR" -type f | wc -l
echo "files total"

echo ""
echo "Next steps:"
echo "1. Review the public repo: cd $PUBLIC_REPO_DIR"
echo "2. Check for any sensitive files: grep -r 'password\|secret\|api_key' ."
echo "3. Initialize git: cd $PUBLIC_REPO_DIR && git init"
echo "4. Commit: git add . && git commit -m 'Initial public release'"
echo "5. Force push: git push -f origin main"
