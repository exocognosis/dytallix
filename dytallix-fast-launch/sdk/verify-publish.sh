#!/bin/bash
# SDK Pre-Publish Verification Script
# This script checks that everything is ready before publishing to NPM

set -e  # Exit on error

echo "🔍 Dytallix SDK Pre-Publish Checks"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SDK_DIR="/Users/rickglenn/dytallix/dytallix-fast-launch/sdk"
cd "$SDK_DIR"

# Function to print status
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

ERRORS=0

# Check 1: NPM login status
echo "📝 Checking NPM authentication..."
if npm whoami &> /dev/null; then
    USERNAME=$(npm whoami)
    check_pass "Logged in as: $USERNAME"
else
    check_fail "Not logged into NPM. Run: npm login"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 2: Package.json exists and is valid
echo "📦 Checking package.json..."
if [ -f "package.json" ]; then
    check_pass "package.json exists"
    
    # Extract package name and version
    PKG_NAME=$(node -p "require('./package.json').name")
    PKG_VERSION=$(node -p "require('./package.json').version")
    
    echo "   Name: $PKG_NAME"
    echo "   Version: $PKG_VERSION"
    
    # Check if scoped package
    if [[ $PKG_NAME == @* ]]; then
        check_warn "Using scoped package name - remember to use --access public"
    fi
else
    check_fail "package.json not found"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 3: README exists
echo "📄 Checking README..."
if [ -f "README.md" ]; then
    check_pass "README.md exists"
    
    # Check README size
    README_SIZE=$(wc -c < README.md)
    if [ $README_SIZE -gt 100 ]; then
        check_pass "README has content ($README_SIZE bytes)"
    else
        check_warn "README seems very small"
    fi
else
    check_fail "README.md not found"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 4: Dependencies installed
echo "📚 Checking dependencies..."
if [ -d "node_modules" ]; then
    check_pass "node_modules exists"
else
    check_warn "node_modules not found. Run: npm install"
fi
echo ""

# Check 5: Try to build
echo "🔨 Testing build..."
if npm run build; then
    check_pass "Build successful"
else
    check_fail "Build failed"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 6: Dist folder exists
echo "📂 Checking build output..."
if [ -d "dist" ]; then
    check_pass "dist/ folder exists"
    
    # Count files in dist
    FILE_COUNT=$(find dist -type f | wc -l | tr -d ' ')
    echo "   Files in dist/: $FILE_COUNT"
    
    # Check for key files
    if [ -f "dist/index.js" ]; then
        check_pass "dist/index.js exists"
    else
        check_fail "dist/index.js not found"
        ERRORS=$((ERRORS + 1))
    fi
    
    if [ -f "dist/index.d.ts" ]; then
        check_pass "dist/index.d.ts exists (TypeScript definitions)"
    else
        check_warn "dist/index.d.ts not found (no TypeScript support)"
    fi
else
    check_fail "dist/ folder not found - build may have failed"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 7: Git status
echo "🔀 Checking git status..."
if git rev-parse --git-dir > /dev/null 2>&1; then
    if [[ -z $(git status -s) ]]; then
        check_pass "Git working directory is clean"
    else
        check_warn "Uncommitted changes detected"
        echo "   Consider committing before publishing"
    fi
else
    check_warn "Not in a git repository"
fi
echo ""

# Check 8: Test dry run
echo "🎭 Running dry-run publish..."
if npm pack --dry-run > /dev/null 2>&1; then
    check_pass "Dry-run successful"
    
    # Get package size estimate
    PACKAGE_INFO=$(npm pack --dry-run 2>&1)
    if echo "$PACKAGE_INFO" | grep -q "package size"; then
        SIZE=$(echo "$PACKAGE_INFO" | grep "package size" | awk '{print $3, $4}')
        echo "   Estimated package size: $SIZE"
    fi
else
    check_fail "Dry-run failed"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Summary
echo "=================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Ready to publish! Run:"
    echo ""
    echo "  npm publish --access public"
    echo ""
else
    echo -e "${RED}✗ Found $ERRORS error(s)${NC}"
    echo ""
    echo "Please fix the errors above before publishing."
    exit 1
fi
