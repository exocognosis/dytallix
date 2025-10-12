#!/bin/bash
# Interactive SDK Publishing Script
# This script walks you through publishing your SDK to NPM

set -e

SDK_DIR="/Users/rickglenn/dytallix/dytallix-fast-launch/sdk"
cd "$SDK_DIR"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Dytallix SDK Publishing Wizard   ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo ""

# Step 1: Check NPM login
echo -e "${YELLOW}Step 1:${NC} Checking NPM authentication..."
if npm whoami &> /dev/null; then
    USERNAME=$(npm whoami)
    echo -e "${GREEN}✓${NC} Logged in as: $USERNAME"
else
    echo -e "${RED}✗${NC} Not logged into NPM"
    echo ""
    read -p "Would you like to login now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm login
    else
        echo "Please run 'npm login' first"
        exit 1
    fi
fi
echo ""

# Step 2: Package name check
echo -e "${YELLOW}Step 2:${NC} Reviewing package configuration..."
PKG_NAME=$(node -p "require('./package.json').name")
PKG_VERSION=$(node -p "require('./package.json').version")

echo "Package: $PKG_NAME"
echo "Version: $PKG_VERSION"
echo ""

if [[ $PKG_NAME == @* ]]; then
    echo -e "${YELLOW}⚠${NC} You're using a scoped package name: $PKG_NAME"
    echo ""
    echo "Options:"
    echo "  1. Publish to @dytallix organization (requires creating the org on NPM)"
    echo "  2. Change to your personal scope (@$USERNAME/dytallix-sdk)"
    echo "  3. Use unscoped name (dytallix-sdk)"
    echo ""
    read -p "Continue with current name? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Please update package.json name field and run this script again"
        exit 1
    fi
fi
echo ""

# Step 3: Install dependencies
echo -e "${YELLOW}Step 3:${NC} Installing dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing packages..."
    npm install
else
    echo -e "${GREEN}✓${NC} Dependencies already installed"
fi
echo ""

# Step 4: Build
echo -e "${YELLOW}Step 4:${NC} Building the SDK..."
echo "Running: npm run build"
if npm run build; then
    echo -e "${GREEN}✓${NC} Build successful"
else
    echo -e "${RED}✗${NC} Build failed"
    exit 1
fi
echo ""

# Step 5: Verify build output
echo -e "${YELLOW}Step 5:${NC} Verifying build output..."
if [ -f "dist/index.js" ] && [ -f "dist/index.d.ts" ]; then
    echo -e "${GREEN}✓${NC} Build files verified"
    
    # Show what will be included
    echo ""
    echo "Files to be published:"
    npm pack --dry-run 2>&1 | grep -E "^\s+\S+" | head -20
else
    echo -e "${RED}✗${NC} Build files missing"
    exit 1
fi
echo ""

# Step 6: Final confirmation
echo -e "${YELLOW}Step 6:${NC} Ready to publish!"
echo ""
echo "═══════════════════════════════════════"
echo "Package: $PKG_NAME"
echo "Version: $PKG_VERSION"
echo "═══════════════════════════════════════"
echo ""
echo "This will publish your package to NPM."
echo "This action CANNOT be undone (you can only deprecate, not delete)."
echo ""
read -p "Are you sure you want to publish? (yes/no) " -r
echo

if [[ $REPLY != "yes" ]]; then
    echo "Publish cancelled."
    exit 0
fi

# Step 7: Publish
echo ""
echo -e "${YELLOW}Step 7:${NC} Publishing to NPM..."

# Determine if we need --access public
PUBLISH_CMD="npm publish"
if [[ $PKG_NAME == @* ]]; then
    PUBLISH_CMD="npm publish --access public"
    echo "Using --access public for scoped package"
fi

echo "Running: $PUBLISH_CMD"
echo ""

if $PUBLISH_CMD; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║     🎉 Successfully Published! 🎉     ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo "Your package is now available at:"
    echo "https://www.npmjs.com/package/$PKG_NAME"
    echo ""
    echo "Install it with:"
    echo "  npm install $PKG_NAME"
    echo ""
    
    # Suggest next steps
    echo "Next steps:"
    echo "  1. Create a git tag: git tag v$PKG_VERSION"
    echo "  2. Push the tag: git push --tags"
    echo "  3. Create a GitHub release"
    echo "  4. Update your main README with installation instructions"
    echo "  5. Announce your release!"
    echo ""
else
    echo ""
    echo -e "${RED}✗ Publish failed${NC}"
    echo ""
    echo "Common issues:"
    echo "  - Package name already taken (try a different name)"
    echo "  - Need to create @dytallix organization first"
    echo "  - Network issues (try again)"
    echo ""
    exit 1
fi
