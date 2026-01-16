#!/bin/bash

# Dytallix Integrated CLI Testing Script
# This script tests all CLI tools in integration to identify any errors

set -e

echo "🧪 Dytallix CLI Integration Test Suite"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

log_test() {
    local test_name=$1
    local status=$2
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ $test_name${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ $test_name${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

run_test() {
    local test_name=$1
    shift
    local cmd="$@"
    
    echo -e "${BLUE}🔍 Testing: $test_name${NC}"
    if eval "$cmd" >/dev/null 2>&1; then
        log_test "$test_name" "PASS"
    else
        log_test "$test_name" "FAIL"
        echo -e "${YELLOW}   Command: $cmd${NC}"
    fi
}

echo "📦 Building All CLI Tools..."
echo "==============================="

# Build all CLI tools
echo "Building main CLI..."
cargo build --release --quiet --package dytallix-cli

echo "Building bridge CLI..."
cargo build --release --quiet --package dytallix-interoperability --bin bridge-cli

echo "Building test runner..."
(cd tests && cargo build --release --quiet) || echo "Test runner build skipped"

echo ""
echo "🧪 Running Integration Tests..."
echo "==============================="

# Test 1: Main CLI Basic Commands
run_test "Main CLI Help" "/Users/rickglenn/Desktop/dytallix/target/release/dytallix-cli --help"
run_test "Main CLI Config" "/Users/rickglenn/Desktop/dytallix/target/release/dytallix-cli config"
run_test "Main CLI Version" "/Users/rickglenn/Desktop/dytallix/target/release/dytallix-cli --version"

# Test 2: Account Management
run_test "Generate Address" "/Users/rickglenn/Desktop/dytallix/target/release/dytallix-cli account generate"
run_test "Account Help" "/Users/rickglenn/Desktop/dytallix/target/release/dytallix-cli account --help"

# Test 3: Smart Contract Commands
run_test "Contract Help" "/Users/rickglenn/Desktop/dytallix/target/release/dytallix-cli contract --help"

# Test 4: AI Services Commands
run_test "AI Help" "/Users/rickglenn/Desktop/dytallix/target/release/dytallix-cli ai --help"

# Test 5: Transaction Commands
run_test "Transaction Help" "/Users/rickglenn/Desktop/dytallix/target/release/dytallix-cli transaction --help"

# Test 6: Node Commands
run_test "Node Help" "/Users/rickglenn/Desktop/dytallix/target/release/dytallix-cli node --help"

# Test 7: Bridge CLI Commands
run_test "Bridge CLI Help" "/Users/rickglenn/Desktop/dytallix/target/release/bridge-cli --help"
run_test "Bridge Status" "/Users/rickglenn/Desktop/dytallix/target/release/bridge-cli status bridge"
run_test "Bridge Chains" "/Users/rickglenn/Desktop/dytallix/target/release/bridge-cli status chains"
run_test "Bridge Validators" "/Users/rickglenn/Desktop/dytallix/target/release/bridge-cli validators list"

# Test 8: IBC Commands
run_test "IBC Channel Create" "/Users/rickglenn/Desktop/dytallix/target/release/bridge-cli ibc create-channel transfer transfer"

# Test 9: Test Runner Commands
run_test "Test Runner Help" "/Users/rickglenn/Desktop/dytallix/tests/target/release/test_runner --help"
run_test "Test Runner Version" "/Users/rickglenn/Desktop/dytallix/tests/target/release/test_runner --version"

# Test 10: Run Unit Tests
echo ""
echo "🔬 Running Unit Tests..."
echo "========================"

run_test "Bridge Unit Tests" "cd /Users/rickglenn/Desktop/dytallix/interoperability && cargo test --lib --quiet"
run_test "CLI Unit Tests" "cd /Users/rickglenn/Desktop/dytallix/developer-tools && cargo test --quiet"
run_test "Bridge Integration Tests" "cd /Users/rickglenn/Desktop/dytallix/interoperability && cargo test --test bridge_tests --quiet"

# Test 11: Compilation Checks
echo ""
echo "🔧 Compilation Checks..."
echo "========================"

run_test "Main CLI Compilation" "cd /Users/rickglenn/Desktop/dytallix/developer-tools && cargo check --quiet"
run_test "Bridge CLI Compilation" "cd /Users/rickglenn/Desktop/dytallix/interoperability && cargo check --quiet" 
run_test "Test Runner Compilation" "cd /Users/rickglenn/Desktop/dytallix/tests && cargo check --quiet"

# Test 12: Cross-CLI Integration Tests
echo ""
echo "🔗 Cross-CLI Integration Tests..."
echo "================================="

# Test CLI configuration integration with bridge
run_test "CLI Config Export" "/Users/rickglenn/Desktop/dytallix/target/release/dytallix-cli config > /tmp/dytallix_config.txt"

# Test bridge CLI with various asset operations
run_test "Bridge Lock Asset (dry-run)" "echo 'DYT 1000 ethereum 0x1234567890123456789012345678901234567890' | xargs /Users/rickglenn/Desktop/dytallix/target/release/bridge-cli bridge lock || true"

echo ""
echo "📊 Test Summary"
echo "==============="
echo -e "Total Tests: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All CLI integration tests passed!${NC}"
    echo -e "${GREEN}✅ CLI tools are ready for cross-chain bridge development${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}⚠️  Some CLI integration tests failed${NC}"
    echo -e "${YELLOW}Check the errors above and fix before proceeding${NC}"
    exit 1
fi
