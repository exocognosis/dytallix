#!/bin/bash
# Prepare files for GitHub upload to DytallixHQ/Dytallix
# This script creates a clean staging directory with only necessary files

set -e

STAGING_DIR="/Users/rickglenn/Desktop/dytallix/github-staging"
SOURCE_DIR="/Users/rickglenn/Desktop/dytallix"

echo "🚀 Preparing Dytallix for GitHub upload..."
echo ""

# Clean and create staging directory
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"

# ===== SDK: TypeScript =====
echo "📦 Copying TypeScript SDK..."
mkdir -p "$STAGING_DIR/sdk/typescript"
cp -r "$SOURCE_DIR/sdk-for-github/src" "$STAGING_DIR/sdk/typescript/"
cp -r "$SOURCE_DIR/sdk-for-github/examples" "$STAGING_DIR/sdk/typescript/"
cp "$SOURCE_DIR/sdk-for-github/package.json" "$STAGING_DIR/sdk/typescript/"
cp "$SOURCE_DIR/sdk-for-github/tsconfig.json" "$STAGING_DIR/sdk/typescript/"
cp "$SOURCE_DIR/sdk-for-github/README.md" "$STAGING_DIR/sdk/typescript/"
cp "$SOURCE_DIR/sdk-for-github/CHANGELOG.md" "$STAGING_DIR/sdk/typescript/"
cp "$SOURCE_DIR/sdk-for-github/CONTRIBUTING.md" "$STAGING_DIR/sdk/typescript/"
cp "$SOURCE_DIR/sdk-for-github/LICENSE" "$STAGING_DIR/sdk/typescript/"
cp "$SOURCE_DIR/sdk-for-github/.gitignore" "$STAGING_DIR/sdk/typescript/"

# ===== SDK: Rust =====
echo "🦀 Copying Rust SDK..."
mkdir -p "$STAGING_DIR/sdk/rust"
cp -r "$SOURCE_DIR/sdk/rust/src" "$STAGING_DIR/sdk/rust/"
cp -r "$SOURCE_DIR/sdk/rust/examples" "$STAGING_DIR/sdk/rust/"
if [ -d "$SOURCE_DIR/sdk/rust/crates" ]; then
    cp -r "$SOURCE_DIR/sdk/rust/crates" "$STAGING_DIR/sdk/rust/"
fi
# Find the correct Cargo.toml (not space-suffixed)
for f in "$SOURCE_DIR/sdk/rust/"Cargo*.toml; do
    if [[ "$f" != *" "* ]]; then
        cp "$f" "$STAGING_DIR/sdk/rust/Cargo.toml" 2>/dev/null && break
    fi
done
if [ -f "$SOURCE_DIR/sdk/rust/README 2.md" ]; then
    cp "$SOURCE_DIR/sdk/rust/README 2.md" "$STAGING_DIR/sdk/rust/README.md"
fi

# ===== Node Source =====
echo "⛓️  Copying Node source..."
mkdir -p "$STAGING_DIR/node"
cp -r "$SOURCE_DIR/dytallix-fast-launch/node/src" "$STAGING_DIR/node/"
cp "$SOURCE_DIR/dytallix-fast-launch/node/Cargo.toml" "$STAGING_DIR/node/"
cp "$SOURCE_DIR/dytallix-fast-launch/node/README_RPC.md" "$STAGING_DIR/node/" 2>/dev/null || true
cp "$SOURCE_DIR/dytallix-fast-launch/node/PQC_IMPLEMENTATION.md" "$STAGING_DIR/node/" 2>/dev/null || true

# ===== CLI =====
echo "🔧 Copying CLI..."
if [ -d "$SOURCE_DIR/dytallix-fast-launch/cli" ]; then
    mkdir -p "$STAGING_DIR/cli"
    cp -r "$SOURCE_DIR/dytallix-fast-launch/cli/"* "$STAGING_DIR/cli/" 2>/dev/null || true
    # Remove any build artifacts
    rm -rf "$STAGING_DIR/cli/target" 2>/dev/null || true
fi

# ===== Contracts =====
echo "📝 Copying Contracts..."
if [ -d "$SOURCE_DIR/dytallix-fast-launch/contracts" ]; then
    mkdir -p "$STAGING_DIR/contracts"
    cp -r "$SOURCE_DIR/dytallix-fast-launch/contracts/"* "$STAGING_DIR/contracts/" 2>/dev/null || true
    rm -rf "$STAGING_DIR/contracts/target" 2>/dev/null || true
fi

# ===== Docs =====
echo "📚 Copying Documentation..."
if [ -d "$SOURCE_DIR/dytallix-fast-launch/docs" ]; then
    mkdir -p "$STAGING_DIR/docs"
    cp -r "$SOURCE_DIR/dytallix-fast-launch/docs/"* "$STAGING_DIR/docs/" 2>/dev/null || true
fi

# ===== Root Files =====
echo "📄 Copying root files..."
cp "$SOURCE_DIR/sdk-for-github/LICENSE" "$STAGING_DIR/"

# ===== Clean up sensitive files =====
echo "🔒 Removing sensitive files..."
find "$STAGING_DIR" -name "*.pem" -delete 2>/dev/null || true
find "$STAGING_DIR" -name "*.key" -delete 2>/dev/null || true
find "$STAGING_DIR" -name "keys.txt" -delete 2>/dev/null || true
find "$STAGING_DIR" -name "secrets" -type d -exec rm -rf {} + 2>/dev/null || true
find "$STAGING_DIR" -name "launch-evidence" -type d -exec rm -rf {} + 2>/dev/null || true
find "$STAGING_DIR" -name ".env*" -delete 2>/dev/null || true
find "$STAGING_DIR" -name "*.db" -delete 2>/dev/null || true
find "$STAGING_DIR" -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
find "$STAGING_DIR" -name "target" -type d -exec rm -rf {} + 2>/dev/null || true
find "$STAGING_DIR" -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
# Remove macOS duplicate files
find "$STAGING_DIR" -name "* 2*" -delete 2>/dev/null || true
find "$STAGING_DIR" -name "* 3*" -delete 2>/dev/null || true
find "$STAGING_DIR" -name "* 4*" -delete 2>/dev/null || true

echo ""
echo "✅ Staging complete!"
echo ""
echo "📁 Staging directory: $STAGING_DIR"
echo ""
echo "📊 Contents:"
find "$STAGING_DIR" -maxdepth 2 -type d | head -20
echo ""
echo "📝 Next steps:"
echo "   1. Review the staging directory"
echo "   2. Create/update root README.md"
echo "   3. Copy to git repo and push"
