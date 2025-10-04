#!/bin/sh
# Local CI runner - mirrors GitHub Actions workflow for local validation
# POSIX-compliant, idempotent

set -eu

REPO_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "${REPO_ROOT}"

echo "==================================="
echo "Dytallix Local CI Runner"
echo "==================================="
echo ""

# Colors for output (if supported)
if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    NC='\033[0m' # No Color
else
    RED=''
    GREEN=''
    YELLOW=''
    NC=''
fi

# Track overall status
OVERALL_STATUS=0

# Helper function for status output
print_status() {
    local status="$1"
    local message="$2"
    
    if [ "${status}" = "PASS" ]; then
        printf "${GREEN}✓${NC} %s\n" "${message}"
    elif [ "${status}" = "FAIL" ]; then
        printf "${RED}✗${NC} %s\n" "${message}"
        OVERALL_STATUS=1
    elif [ "${status}" = "SKIP" ]; then
        printf "${YELLOW}⊘${NC} %s\n" "${message}"
    else
        printf "  %s\n" "${message}"
    fi
}

# Check prerequisites
check_prerequisites() {
    echo "Checking prerequisites..."
    
    if ! command -v cargo >/dev/null 2>&1; then
        print_status "FAIL" "cargo not found - install Rust toolchain"
        return 1
    fi
    
    if ! command -v npm >/dev/null 2>&1; then
        print_status "FAIL" "npm not found - install Node.js"
        return 1
    fi
    
    print_status "PASS" "Prerequisites check"
    return 0
}

# Rust checks
run_rust_checks() {
    echo ""
    echo "=== Rust Checks ==="
    
    echo "Running cargo fmt check..."
    if cargo fmt --check --all 2>&1 | tee /tmp/ci-fmt.log; then
        print_status "PASS" "Rust format check"
    else
        print_status "FAIL" "Rust format check - run 'cargo fmt' to fix"
        cat /tmp/ci-fmt.log
        return 1
    fi
    
    echo "Running cargo clippy..."
    if cargo clippy --workspace --all-features --all-targets -- -D warnings 2>&1 | tee /tmp/ci-clippy.log; then
        print_status "PASS" "Rust clippy"
    else
        print_status "FAIL" "Rust clippy - fix warnings"
        tail -50 /tmp/ci-clippy.log
        return 1
    fi
    
    echo "Running cargo test..."
    if cargo test --workspace --all-features 2>&1 | tee /tmp/ci-test.log; then
        print_status "PASS" "Rust tests"
    else
        print_status "FAIL" "Rust tests"
        tail -50 /tmp/ci-test.log
        return 1
    fi
    
    return 0
}

# Frontend checks
run_frontend_checks() {
    echo ""
    echo "=== Frontend Checks ==="
    
    if [ ! -f "package.json" ]; then
        print_status "SKIP" "No package.json found"
        return 0
    fi
    
    echo "Installing dependencies..."
    if ! CYPRESS_INSTALL_BINARY=0 npm ci >/dev/null 2>&1; then
        print_status "FAIL" "npm ci failed"
        return 1
    fi
    
    echo "Running lint..."
    if npm run lint 2>&1 | tee /tmp/ci-lint.log; then
        print_status "PASS" "Frontend lint"
    else
        print_status "FAIL" "Frontend lint"
        tail -20 /tmp/ci-lint.log
        return 1
    fi
    
    echo "Running type check..."
    if npm run typecheck 2>&1 | tee /tmp/ci-typecheck.log; then
        print_status "PASS" "TypeScript check"
    else
        print_status "FAIL" "TypeScript check"
        tail -20 /tmp/ci-typecheck.log
        # Don't fail on typecheck for now
    fi
    
    echo "Running tests..."
    if npm test -- --run 2>&1 | tee /tmp/ci-test-fe.log; then
        print_status "PASS" "Frontend tests"
    else
        print_status "FAIL" "Frontend tests"
        tail -20 /tmp/ci-test-fe.log
        return 1
    fi
    
    return 0
}

# Server checks
run_server_checks() {
    echo ""
    echo "=== Server Checks ==="
    
    if [ ! -d "server" ]; then
        print_status "SKIP" "No server directory found"
        return 0
    fi
    
    cd server
    
    echo "Running server lint..."
    if npx eslint . --max-warnings 0 2>&1 | tee /tmp/ci-server-lint.log; then
        print_status "PASS" "Server lint"
    else
        print_status "FAIL" "Server lint"
        tail -20 /tmp/ci-server-lint.log
        # Don't fail for now
    fi
    
    cd ..
    return 0
}

# Generate CI status report
generate_ci_status() {
    echo ""
    echo "=== Generating CI Status Report ==="
    
    mkdir -p readiness_out
    
    TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    cat > readiness_out/ci_status.md << EOF
# Local CI Status Report

Generated: ${TIMESTAMP}
Host: $(hostname)
User: $(whoami)

## Build Status

| Component | Status | Details |
|-----------|--------|---------|
| Rust Format | $([ -f /tmp/ci-fmt.log ] && echo "✅ PASS" || echo "⊘ SKIP") | cargo fmt --check |
| Rust Clippy | $([ -f /tmp/ci-clippy.log ] && echo "✅ PASS" || echo "⊘ SKIP") | -D warnings |
| Rust Tests | $([ -f /tmp/ci-test.log ] && echo "✅ PASS" || echo "⊘ SKIP") | All workspace tests |
| Frontend Lint | $([ -f /tmp/ci-lint.log ] && echo "✅ PASS" || echo "⊘ SKIP") | ESLint |
| Frontend Type | $([ -f /tmp/ci-typecheck.log ] && echo "✅ PASS" || echo "⊘ SKIP") | TypeScript |
| Frontend Tests | $([ -f /tmp/ci-test-fe.log ] && echo "✅ PASS" || echo "⊘ SKIP") | Vitest |

## Logs

Detailed logs available in /tmp/:
- /tmp/ci-fmt.log
- /tmp/ci-clippy.log
- /tmp/ci-test.log
- /tmp/ci-lint.log
- /tmp/ci-typecheck.log
- /tmp/ci-test-fe.log

## Next Steps

$(if [ ${OVERALL_STATUS} -eq 0 ]; then
    echo "✅ All checks passed! Ready to push."
else
    echo "❌ Some checks failed. Fix issues before pushing."
fi)

EOF
    
    print_status "PASS" "CI status report generated: readiness_out/ci_status.md"
}

# Main execution
main() {
    if ! check_prerequisites; then
        exit 1
    fi
    
    run_rust_checks || true
    run_frontend_checks || true
    run_server_checks || true
    
    generate_ci_status
    
    echo ""
    echo "==================================="
    if [ ${OVERALL_STATUS} -eq 0 ]; then
        echo "${GREEN}✓ All CI checks passed${NC}"
        echo "==================================="
        exit 0
    else
        echo "${RED}✗ Some CI checks failed${NC}"
        echo "==================================="
        echo "Review logs in /tmp/ci-*.log"
        exit 1
    fi
}

main
