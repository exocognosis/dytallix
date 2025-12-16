#!/bin/bash

# QuantumVault MVP End-to-End Acceptance Test
# This script tests the complete workflow from scanning to attestation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3000/api/v1}"
TLS_TARGET="${TLS_TARGET:-google.com:443}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@quantumvault.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-QuantumVault2024!}"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

echo "================================"
echo "QuantumVault MVP E2E Test Suite"
echo "================================"
echo ""

# Helper function to print test results
pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((TESTS_PASSED++))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((TESTS_FAILED++))
}

info() {
    echo -e "${YELLOW}ℹ INFO${NC}: $1"
}

# Test 1: System Health Check
test_health_check() {
    info "Testing system health..."
    
    if curl -sf "$API_URL/blockchain/status" > /dev/null 2>&1; then
        pass "Backend is responding"
    else
        fail "Backend is not responding"
        return 1
    fi
}

# Test 2: Admin User Login
test_admin_login() {
    info "Testing admin login..."
    
    RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
    
    TOKEN=$(echo $RESPONSE | jq -r '.access_token // empty')
    
    if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
        export AUTH_TOKEN="$TOKEN"
        pass "Admin login successful"
    else
        fail "Admin login failed"
        echo "Response: $RESPONSE"
        return 1
    fi
}

# Test 3: Create Scan Target
test_create_target() {
    info "Creating scan target..."
    
    RESPONSE=$(curl -s -X POST "$API_URL/scans/targets" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"E2E Test Target\",\"type\":\"TLS_ENDPOINT\",\"host\":\"${TLS_TARGET%:*}\",\"port\":${TLS_TARGET##*:}}")
    
    TARGET_ID=$(echo $RESPONSE | jq -r '.id // empty')
    
    if [ -n "$TARGET_ID" ] && [ "$TARGET_ID" != "null" ]; then
        export TARGET_ID="$TARGET_ID"
        pass "Scan target created: $TARGET_ID"
    else
        fail "Failed to create scan target"
        echo "Response: $RESPONSE"
        return 1
    fi
}

# Test 4: Trigger Scan
test_trigger_scan() {
    info "Triggering scan for target $TARGET_ID..."
    
    RESPONSE=$(curl -s -X POST "$API_URL/scans/trigger/$TARGET_ID" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    
    SCAN_ID=$(echo $RESPONSE | jq -r '.id // empty')
    
    if [ -n "$SCAN_ID" ] && [ "$SCAN_ID" != "null" ]; then
        export SCAN_ID="$SCAN_ID"
        pass "Scan triggered: $SCAN_ID"
    else
        fail "Failed to trigger scan"
        echo "Response: $RESPONSE"
        return 1
    fi
}

# Test 5: Wait for Scan Completion
test_scan_completion() {
    info "Waiting for scan completion..."
    
    MAX_WAIT=60
    WAITED=0
    
    while [ $WAITED -lt $MAX_WAIT ]; do
        RESPONSE=$(curl -s "$API_URL/scans/status/$SCAN_ID" \
            -H "Authorization: Bearer $AUTH_TOKEN")
        
        STATUS=$(echo $RESPONSE | jq -r '.status // empty')
        
        if [ "$STATUS" == "COMPLETED" ]; then
            pass "Scan completed successfully"
            
            # Extract asset ID
            ASSET_ID=$(echo $RESPONSE | jq -r '.scanAssets[0].assetId // empty')
            if [ -n "$ASSET_ID" ] && [ "$ASSET_ID" != "null" ]; then
                export ASSET_ID="$ASSET_ID"
                info "Asset discovered: $ASSET_ID"
            fi
            
            return 0
        elif [ "$STATUS" == "FAILED" ]; then
            fail "Scan failed"
            echo "Response: $RESPONSE"
            return 1
        fi
        
        sleep 2
        ((WAITED+=2))
    done
    
    fail "Scan timeout after ${MAX_WAIT}s"
    return 1
}

# Test 6: Verify Asset Data
test_verify_asset() {
    info "Verifying asset data..."
    
    if [ -z "$ASSET_ID" ]; then
        fail "No asset ID available"
        return 1
    fi
    
    RESPONSE=$(curl -s "$API_URL/assets/$ASSET_ID" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    
    RISK_SCORE=$(echo $RESPONSE | jq -r '.riskScore // empty')
    
    if [ -n "$RISK_SCORE" ] && [ "$RISK_SCORE" != "null" ]; then
        pass "Asset has risk score: $RISK_SCORE"
    else
        fail "Asset risk score not calculated"
        return 1
    fi
}

# Test 7: Create Policy
test_create_policy() {
    info "Creating policy..."
    
    RESPONSE=$(curl -s -X POST "$API_URL/policies" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"name":"E2E Test Policy","description":"Automated test policy","ruleDefinition":{"riskLevel":"HIGH"},"priority":1}')
    
    POLICY_ID=$(echo $RESPONSE | jq -r '.id // empty')
    
    if [ -n "$POLICY_ID" ] && [ "$POLICY_ID" != "null" ]; then
        export POLICY_ID="$POLICY_ID"
        pass "Policy created: $POLICY_ID"
    else
        fail "Failed to create policy"
        return 1
    fi
}

# Test 8: Create Anchor
test_create_anchor() {
    info "Creating PQC anchor..."
    
    RESPONSE=$(curl -s -X POST "$API_URL/anchors" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"name":"E2E Test Anchor","algorithm":"Kyber1024"}')
    
    ANCHOR_ID=$(echo $RESPONSE | jq -r '.id // empty')
    
    if [ -n "$ANCHOR_ID" ] && [ "$ANCHOR_ID" != "null" ]; then
        export ANCHOR_ID="$ANCHOR_ID"
        pass "Anchor created: $ANCHOR_ID"
    else
        fail "Failed to create anchor"
        return 1
    fi
}

# Test 9: Dashboard KPIs
test_dashboard_kpis() {
    info "Querying dashboard KPIs..."
    
    RESPONSE=$(curl -s "$API_URL/dashboard/kpis" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    
    TOTAL_ASSETS=$(echo $RESPONSE | jq -r '.totalAssets // empty')
    
    if [ -n "$TOTAL_ASSETS" ] && [ "$TOTAL_ASSETS" != "null" ]; then
        pass "Dashboard KPIs retrieved: $TOTAL_ASSETS assets"
    else
        fail "Failed to retrieve dashboard KPIs"
        return 1
    fi
}

# Main test execution
main() {
    echo "Starting E2E tests at $(date)"
    echo ""
    
    # Run tests
    test_health_check || true
    test_admin_login || exit 1
    test_create_target || true
    test_trigger_scan || true
    test_scan_completion || true
    test_verify_asset || true
    test_create_policy || true
    test_create_anchor || true
    test_dashboard_kpis || true
    
    # Print summary
    echo ""
    echo "================================"
    echo "Test Summary"
    echo "================================"
    echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
        exit 0
    else
        echo -e "${RED}✗ SOME TESTS FAILED${NC}"
        exit 1
    fi
}

# Check dependencies
if ! command -v curl &> /dev/null; then
    echo "Error: curl is required but not installed"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed"
    exit 1
fi

# Run main
main
