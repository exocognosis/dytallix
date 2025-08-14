#!/bin/bash

# Token Migration Verification Script
# Ensures no legacy DYT/udyt references remain in the codebase

set -e

echo "🔍 Verifying token migration completeness..."
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track issues
ISSUES_FOUND=0

# Directories to exclude from search
EXCLUDE_DIRS=(
    "node_modules"
    "dist" 
    "build"
    ".git"
    "target"
    "coverage"
    ".next"
    "vendor"
    "__pycache__"
)

# Files to exclude (these contain historical/documentation references)
EXCLUDE_FILES=(
    "docs/MIGRATION_DYT_TO_DGT_DRT.md"
    "docs/TOKEN_MIGRATION_CHANGELOG.md"
    "scripts/reports/token_migration_report.json"
    "scripts/verify-token-migration.sh"
)

# Build exclude arguments for grep
EXCLUDE_ARGS=""
for dir in "${EXCLUDE_DIRS[@]}"; do
    EXCLUDE_ARGS="$EXCLUDE_ARGS --exclude-dir=$dir"
done

for file in "${EXCLUDE_FILES[@]}"; do
    EXCLUDE_ARGS="$EXCLUDE_ARGS --exclude=$file"
done

echo "📋 Searching for legacy token references..."
echo

# Search for legacy DYT references
echo "🔎 Checking for DYT/udyt references..."
LEGACY_REFS=$(git grep -RIn -E '\b[Dd][Yy][Tt]\b|u[Dd][Yy][Tt]|udyt|UDYT|micro-DYT|Wrapped DYT' $EXCLUDE_ARGS . || true)

if [ -n "$LEGACY_REFS" ]; then
    echo -e "${RED}❌ Found legacy DYT references:${NC}"
    echo "$LEGACY_REFS"
    echo
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ No legacy DYT references found${NC}"
fi

# Check for hardcoded 1000000 conversions that should use token helpers
echo
echo "🔎 Checking for hardcoded micro-token conversions..."
HARDCODED_CONVERSIONS=$(git grep -RIn -E '1000000|1_000_000' $EXCLUDE_ARGS . | grep -v -E '(test|spec|\.md|\.json|comment|\/\/)' || true)

if [ -n "$HARDCODED_CONVERSIONS" ]; then
    echo -e "${YELLOW}⚠️  Found potential hardcoded conversions (review required):${NC}"
    echo "$HARDCODED_CONVERSIONS"
    echo
    echo "   Consider using token helper functions for conversions:"
    echo "   - TypeScript: formatAmount(), toMicroAmount()"
    echo "   - Rust: micro_to_display(), display_to_micro()"
    echo "   - Node.js: formatAmount(), toMicroAmount()"
    echo
fi

# Verify new token definitions exist
echo "🔎 Checking for required token definition files..."
REQUIRED_FILES=(
    "frontend/src/lib/tokens.ts"
    "faucet/src/tokens.js"
    "explorer/src/tokens.js"
    "developer-tools/src/tokens.rs"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ Found: $file${NC}"
    else
        echo -e "${RED}❌ Missing: $file${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
done

# Check that new tokens are properly imported and used
echo
echo "🔎 Checking for proper token helper usage..."

# Check TypeScript imports
TS_IMPORTS=$(grep -l "from.*tokens" frontend/src/pages/*.tsx frontend/src/components/*.tsx 2>/dev/null || true)
if [ -n "$TS_IMPORTS" ]; then
    echo -e "${GREEN}✅ Found TypeScript token imports${NC}"
else
    echo -e "${YELLOW}⚠️  No TypeScript token imports found${NC}"
fi

# Check Node.js requires
JS_REQUIRES=$(grep -l "require.*tokens" faucet/src/**/*.js explorer/src/**/*.js 2>/dev/null || true)
if [ -n "$JS_REQUIRES" ]; then
    echo -e "${GREEN}✅ Found Node.js token requires${NC}"
else
    echo -e "${YELLOW}⚠️  No Node.js token requires found${NC}"
fi

# Check Rust usage
RUST_USAGE=$(grep -l "use.*tokens" developer-tools/src/**/*.rs 2>/dev/null || true)
if [ -n "$RUST_USAGE" ]; then
    echo -e "${GREEN}✅ Found Rust token usage${NC}"
else
    echo -e "${YELLOW}⚠️  No Rust token usage found${NC}"
fi

# Check genesis file has correct denominations
echo
echo "🔎 Checking genesis configuration..."
if grep -q "udgt" testnet/init/config/genesis.json; then
    echo -e "${GREEN}✅ Genesis file contains udgt${NC}"
else
    echo -e "${RED}❌ Genesis file missing udgt${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if grep -q "udyt" testnet/init/config/genesis.json; then
    echo -e "${RED}❌ Genesis file still contains udyt${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Check docker-compose for dual token config
echo
echo "🔎 Checking Docker configuration..."
if grep -q "DGT_FAUCET_AMOUNT" docker-compose.yml && grep -q "DRT_FAUCET_AMOUNT" docker-compose.yml; then
    echo -e "${GREEN}✅ Docker compose has dual token configuration${NC}"
else
    echo -e "${RED}❌ Docker compose missing dual token configuration${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Check for old single token faucet amount
if grep -q "FAUCET_AMOUNT.*udyt" docker-compose.yml; then
    echo -e "${RED}❌ Docker compose still has legacy FAUCET_AMOUNT${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Summary
echo
echo "============================================"
if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}🎉 Token migration verification PASSED!${NC}"
    echo -e "${GREEN}✅ All legacy references have been successfully migrated${NC}"
    echo -e "${GREEN}✅ New token system properly implemented${NC}"
    exit 0
else
    echo -e "${RED}❌ Token migration verification FAILED!${NC}"
    echo -e "${RED}Found $ISSUES_FOUND issue(s) that need to be addressed${NC}"
    echo
    echo "Please fix the issues above and run this script again."
    exit 1
fi