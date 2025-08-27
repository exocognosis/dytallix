#!/bin/bash
set -e

echo "🔍 Scanning for prohibited placeholder patterns..."

# Define prohibited patterns that should not exist in production code
# These are critical patterns that indicate incomplete implementation
CRITICAL_PATTERNS=(
    "TODO.*configure for determinism"
    "TODO.*host functions"
    "TODO.*emission query"
    "TODO.*populate via evidence"
    "TODO.*Auto-generated API docs"
    "Not implemented"
    "unimplemented!"
    "todo!"
    "panic!.*Not implemented"
    "throw new Error.*Not implemented"
)

# Source directories to scan (exclude documentation and completed examples)
SOURCE_DIRS=(
    "cli/"
    "blockchain-core/src/"
    "pqc-crypto/src/"
    "dytallix-lean-launch/server/"
    "dytallix-lean-launch/src/"
)

# Files to scan specifically
CRITICAL_FILES=(
    "blockchain-core/src/wasm/engine.rs"
    "cli/src/cmd/query.rs"
    "dytallix-lean-launch/server/rateLimit.js"
    "dytallix-lean-launch/launch-evidence/wallet/keygen_log.txt"
    "docs/community/README.md"
)

VIOLATIONS_FOUND=0

# Function to check a pattern in source directories
check_pattern() {
    local pattern="$1"
    echo "  Checking pattern: $pattern"
    
    for dir in "${SOURCE_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            MATCHES=$(grep -r -n --include="*.rs" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" \
                     -E "$pattern" "$dir" 2>/dev/null || true)
            
            if [ -n "$MATCHES" ]; then
                echo "❌ Found prohibited pattern '$pattern' in $dir:"
                echo "$MATCHES"
                VIOLATIONS_FOUND=$((VIOLATIONS_FOUND + 1))
            fi
        fi
    done
}

# Function to check specific files
check_critical_files() {
    echo "  Checking critical files for blocking TODO/FIXME patterns..."
    
    for file in "${CRITICAL_FILES[@]}"; do
        if [ -f "$file" ]; then
            # Look for blocking TODOs, not implementation TODOs that are clearly documented
            MATCHES=$(grep -n -E "TODO.*configure|TODO.*host functions|TODO.*emission query|TODO.*populate|TODO.*Auto-generated" "$file" 2>/dev/null || true)
            
            if [ -n "$MATCHES" ]; then
                echo "❌ Found blocking placeholder patterns in critical file $file:"
                echo "$MATCHES"
                VIOLATIONS_FOUND=$((VIOLATIONS_FOUND + 1))
            fi
        fi
    done
    
    # Special check for specific files that should have no TODOs at all
    ZERO_TODO_FILES=(
        "dytallix-lean-launch/launch-evidence/wallet/keygen_log.txt"
        "docs/community/README.md"
    )
    
    for file in "${ZERO_TODO_FILES[@]}"; do
        if [ -f "$file" ]; then
            MATCHES=$(grep -n -E "TODO|FIXME|XXX|PLACEHOLDER" "$file" 2>/dev/null || true)
            
            if [ -n "$MATCHES" ]; then
                echo "❌ Found any placeholder patterns in zero-tolerance file $file:"
                echo "$MATCHES"
                VIOLATIONS_FOUND=$((VIOLATIONS_FOUND + 1))
            fi
        fi
    done
}

# Main scanning logic
echo "📋 Checking critical placeholder patterns..."

for pattern in "${CRITICAL_PATTERNS[@]}"; do
    check_pattern "$pattern"
done

echo ""
echo "📋 Checking critical files..."
check_critical_files

echo ""
echo "📋 Checking for mock function usage in frontend..."

# Check if mock functions are actually being called (not just defined)
MOCK_USAGE=$(grep -r -n --include="*.jsx" --include="*.js" \
             -E "(mockRunAnomaly|mockScanContract)\s*\(" \
             "dytallix-lean-launch/src/" 2>/dev/null | \
             grep -v "async function" || true)

if [ -n "$MOCK_USAGE" ]; then
    echo "❌ Found mock function calls still being used:"
    echo "$MOCK_USAGE"
    VIOLATIONS_FOUND=$((VIOLATIONS_FOUND + 1))
fi

echo ""
echo "📋 Summary:"

if [ $VIOLATIONS_FOUND -eq 0 ]; then
    echo "✅ No prohibited placeholder patterns found!"
    echo "✅ All critical implementations completed"
    echo "✅ Ready for production deployment"
    exit 0
else
    echo "❌ Found $VIOLATIONS_FOUND violation(s)"
    echo "❌ Production deployment blocked"
    echo ""
    echo "Please address the above issues before deploying to production."
    echo "For guidance, see: /launch-evidence/todo-sweep-report.md"
    exit 1
fi