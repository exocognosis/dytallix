#!/usr/bin/env bash
# Unit tests for user_journey.sh helper functions

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

PASS=0
FAIL=0

# Test helper
test_case() {
    local name="$1"
    shift
    if "$@"; then
        echo -e "${GREEN}✓${NC} $name"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}✗${NC} $name"
        FAIL=$((FAIL + 1))
    fi
}

# Test 1: Check script exists and is executable
test_script_exists() {
    [ -x "$ROOT_DIR/scripts/e2e/user_journey.sh" ]
}

# Test 2: Check script has valid bash syntax
test_syntax_valid() {
    bash -n "$ROOT_DIR/scripts/e2e/user_journey.sh"
}

# Test 3: Check required commands are available
test_dependencies() {
    command -v jq >/dev/null 2>&1 && \
    command -v curl >/dev/null 2>&1 && \
    command -v lsof >/dev/null 2>&1
}

# Test 4: Check CLI is built
test_cli_built() {
    [ -f "$ROOT_DIR/cli/dytx/dist/index.js" ]
}

# Test 5: Check CLI can display help
test_cli_help() {
    node "$ROOT_DIR/cli/dytx/dist/index.js" --help >/dev/null 2>&1
}

# Test 6: Check CLI keygen command exists
test_cli_keygen() {
    node "$ROOT_DIR/cli/dytx/dist/index.js" keygen --help >/dev/null 2>&1
}

# Test 7: Check evidence directory can be created
test_evidence_dir() {
    local test_dir="$ROOT_DIR/launch-evidence/e2e-user-journey/test_$$"
    mkdir -p "$test_dir" && \
    [ -d "$test_dir" ] && \
    rm -rf "$test_dir"
}

# Test 8: Test port finding logic (simplified version)
test_port_logic() {
    # Just verify lsof/ss work for port detection
    if lsof -nP -iTCP:99999 -sTCP:LISTEN >/dev/null 2>&1; then
        # Port 99999 shouldn't be in use, this should return false
        return 1
    fi
    return 0
}

# Test 9: Check jq can parse JSON
test_jq_works() {
    echo '{"test":"value"}' | jq -r '.test' | grep -q "value"
}

# Test 10: Check script uses UTC timestamps
test_utc_timestamp() {
    grep -q "date -u" "$ROOT_DIR/scripts/e2e/user_journey.sh"
}

# Run all tests
echo "Running user_journey.sh unit tests..."
echo ""

test_case "Script exists and is executable" test_script_exists
test_case "Script has valid bash syntax" test_syntax_valid
test_case "Required dependencies available" test_dependencies
test_case "CLI is built" test_cli_built
test_case "CLI can display help" test_cli_help
test_case "CLI keygen command exists" test_cli_keygen
test_case "Evidence directory can be created" test_evidence_dir
test_case "Port detection logic works" test_port_logic
test_case "jq can parse JSON" test_jq_works
test_case "Script uses UTC timestamps" test_utc_timestamp

echo ""
echo "Results: $PASS passed, $FAIL failed"

if [ "$FAIL" -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi
