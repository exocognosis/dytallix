#!/bin/bash
set -e

echo "📦 Publishing @dytallix/pqc-wasm..."
echo ""

# Check if logged in to npm
if ! npm whoami >/dev/null 2>&1; then
    echo "❌ Not logged in to npm. Please run: npm login"
    exit 1
fi

# Build first
echo "🔨 Building package..."
./build.sh

# Navigate to package directory
cd pkg

# Show current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo ""
echo "Current version: $CURRENT_VERSION"
echo ""

# Ask for version bump type
echo "Select version bump:"
echo "  1) patch (bug fixes)      - $CURRENT_VERSION → $(npm version patch --dry-run | tail -1 | sed 's/v//')"
echo "  2) minor (new features)   - $CURRENT_VERSION → $(npm version minor --dry-run | tail -1 | sed 's/v//')"
echo "  3) major (breaking)       - $CURRENT_VERSION → $(npm version major --dry-run | tail -1 | sed 's/v//')"
echo "  4) custom version"
echo "  5) skip version bump"
echo ""
read -p "Choice [1-5]: " choice

case $choice in
    1) npm version patch ;;
    2) npm version minor ;;
    3) npm version major ;;
    4) 
        read -p "Enter version (e.g., 1.2.3): " custom_version
        npm version "$custom_version"
        ;;
    5) echo "Skipping version bump..." ;;
    *) echo "Invalid choice"; exit 1 ;;
esac

NEW_VERSION=$(node -p "require('./package.json').version")
echo ""
echo "📌 Version: $NEW_VERSION"
echo ""

# Confirm publication
read -p "Publish @dytallix/pqc-wasm@$NEW_VERSION to npm? [y/N]: " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo "❌ Publication cancelled"
    exit 1
fi

# Publish
echo ""
echo "🚀 Publishing to npm..."
npm publish --access public

echo ""
echo "✅ Published successfully!"
echo ""
echo "📦 Package: @dytallix/pqc-wasm@$NEW_VERSION"
echo "🔗 View: https://www.npmjs.com/package/@dytallix/pqc-wasm"
echo ""
echo "Install with:"
echo "  npm install @dytallix/pqc-wasm@$NEW_VERSION"
echo ""
