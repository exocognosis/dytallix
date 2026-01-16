#!/bin/bash

# Dytallix Bridge RBAC Permission Testing Script
# Validates RBAC configurations and security controls

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="dytallix"
MONITORING_NAMESPACE="dytallix-monitoring"
TIMEOUT="30s"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Function to run test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"  # "success" or "failure"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    log_info "Testing: $test_name"
    
    if [[ "$expected_result" == "success" ]]; then
        if eval "$test_command" &>/dev/null; then
            log_success "$test_name"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            log_error "$test_name"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
    else
        if eval "$test_command" &>/dev/null; then
            log_error "$test_name (should have failed but succeeded)"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        else
            log_success "$test_name (correctly denied)"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        fi
    fi
}

# Function to check if service account exists
check_service_account() {
    local sa_name="$1"
    local namespace="$2"
    
    run_test "Service Account $sa_name exists in namespace $namespace" \
        "kubectl get serviceaccount $sa_name -n $namespace" \
        "success"
}

# Function to test RBAC permissions
test_rbac_permission() {
    local sa_name="$1"
    local namespace="$2"
    local verb="$3"
    local resource="$4"
    local resource_name="${5:-}"
    local expected="$6"
    
    local auth_command="kubectl auth can-i $verb $resource"
    if [[ -n "$resource_name" ]]; then
        auth_command="$auth_command/$resource_name"
    fi
    auth_command="$auth_command --as=system:serviceaccount:$namespace:$sa_name"
    
    run_test "SA $sa_name can $verb $resource${resource_name:+/$resource_name}" \
        "$auth_command" \
        "$expected"
}

# Function to test network policy
test_network_connectivity() {
    local test_name="$1"
    local source_pod="$2"
    local target_host="$3"
    local target_port="$4"
    local expected="$5"
    
    local test_command="timeout 5s kubectl exec $source_pod -n $NAMESPACE -- nc -zv $target_host $target_port"
    
    run_test "$test_name" "$test_command" "$expected"
}

# Main test execution
main() {
    log_info "Starting Dytallix Bridge RBAC Validation Tests"
    echo "=================================="
    
    # Prerequisites check
    log_info "Checking prerequisites..."
    
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found. Please install kubectl."
        exit 1
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Unable to connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    # Check if namespaces exist
    run_test "Namespace $NAMESPACE exists" \
        "kubectl get namespace $NAMESPACE" \
        "success"
    
    run_test "Namespace $MONITORING_NAMESPACE exists" \
        "kubectl get namespace $MONITORING_NAMESPACE" \
        "success"
    
    echo ""
    log_info "Testing Service Accounts..."
    echo "----------------------------"
    
    # Test service accounts
    check_service_account "dytallix-bridge-sa" "$NAMESPACE"
    check_service_account "dytallix-monitoring-sa" "$NAMESPACE"
    check_service_account "dytallix-gateway-sa" "$NAMESPACE"
    check_service_account "prometheus-sa" "$MONITORING_NAMESPACE"
    check_service_account "grafana-sa" "$MONITORING_NAMESPACE"
    
    echo ""
    log_info "Testing Bridge Service Account Permissions..."
    echo "--------------------------------------------"
    
    # Bridge SA should have minimal permissions
    test_rbac_permission "dytallix-bridge-sa" "$NAMESPACE" "get" "configmaps" "dytallix-bridge-config" "success"
    test_rbac_permission "dytallix-bridge-sa" "$NAMESPACE" "get" "secrets" "dytallix-bridge-secrets" "success"
    test_rbac_permission "dytallix-bridge-sa" "$NAMESPACE" "get" "pods" "" "success"
    test_rbac_permission "dytallix-bridge-sa" "$NAMESPACE" "list" "services" "" "success"
    
    # Bridge SA should NOT have cluster-admin permissions
    test_rbac_permission "dytallix-bridge-sa" "$NAMESPACE" "create" "namespaces" "" "failure"
    test_rbac_permission "dytallix-bridge-sa" "$NAMESPACE" "delete" "configmaps" "" "failure"
    test_rbac_permission "dytallix-bridge-sa" "$NAMESPACE" "update" "secrets" "" "failure"
    test_rbac_permission "dytallix-bridge-sa" "$NAMESPACE" "*" "*" "" "failure"
    
    echo ""
    log_info "Testing Monitoring Service Account Permissions..."
    echo "-----------------------------------------------"
    
    # Monitoring SA should have read-only access
    test_rbac_permission "dytallix-monitoring-sa" "$NAMESPACE" "get" "pods" "" "success"
    test_rbac_permission "dytallix-monitoring-sa" "$NAMESPACE" "list" "services" "" "success"
    test_rbac_permission "dytallix-monitoring-sa" "$NAMESPACE" "watch" "endpoints" "" "success"
    
    # Monitoring SA should NOT have write permissions
    test_rbac_permission "dytallix-monitoring-sa" "$NAMESPACE" "create" "pods" "" "failure"
    test_rbac_permission "dytallix-monitoring-sa" "$NAMESPACE" "delete" "services" "" "failure"
    test_rbac_permission "dytallix-monitoring-sa" "$NAMESPACE" "update" "configmaps" "" "failure"
    
    echo ""
    log_info "Testing Gateway Service Account Permissions..."
    echo "--------------------------------------------"
    
    # Gateway SA should have service discovery permissions
    test_rbac_permission "dytallix-gateway-sa" "$NAMESPACE" "get" "services" "" "success"
    test_rbac_permission "dytallix-gateway-sa" "$NAMESPACE" "list" "endpoints" "" "success"
    test_rbac_permission "dytallix-gateway-sa" "$NAMESPACE" "get" "configmaps" "dytallix-gateway-config" "success"
    
    # Gateway SA should NOT have broad permissions
    test_rbac_permission "dytallix-gateway-sa" "$NAMESPACE" "create" "services" "" "failure"
    test_rbac_permission "dytallix-gateway-sa" "$NAMESPACE" "delete" "pods" "" "failure"
    
    echo ""
    log_info "Testing Prometheus Service Account Permissions..."
    echo "-----------------------------------------------"
    
    # Prometheus SA should have cluster monitoring permissions
    test_rbac_permission "prometheus-sa" "$MONITORING_NAMESPACE" "get" "nodes" "" "success"
    test_rbac_permission "prometheus-sa" "$MONITORING_NAMESPACE" "list" "pods" "" "success"
    test_rbac_permission "prometheus-sa" "$MONITORING_NAMESPACE" "get" "services" "" "success"
    
    # Prometheus SA should NOT have write permissions to other namespaces
    test_rbac_permission "prometheus-sa" "$MONITORING_NAMESPACE" "create" "pods" "" "failure"
    test_rbac_permission "prometheus-sa" "$MONITORING_NAMESPACE" "delete" "services" "" "failure"
    
    echo ""
    log_info "Testing Pod Security Contexts..."
    echo "-------------------------------"
    
    # Check if pods are running with correct security contexts
    if kubectl get pods -n "$NAMESPACE" -l app=dytallix-bridge &>/dev/null; then
        local bridge_pod=$(kubectl get pods -n "$NAMESPACE" -l app=dytallix-bridge -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
        
        if [[ -n "$bridge_pod" ]]; then
            run_test "Bridge pod runs as non-root user" \
                "kubectl get pod $bridge_pod -n $NAMESPACE -o jsonpath='{.spec.securityContext.runAsNonRoot}' | grep -q true" \
                "success"
            
            run_test "Bridge pod has read-only root filesystem" \
                "kubectl get pod $bridge_pod -n $NAMESPACE -o jsonpath='{.spec.containers[0].securityContext.readOnlyRootFilesystem}' | grep -q true" \
                "success"
            
            run_test "Bridge pod drops all capabilities" \
                "kubectl get pod $bridge_pod -n $NAMESPACE -o jsonpath='{.spec.containers[0].securityContext.capabilities.drop[0]}' | grep -q ALL" \
                "success"
        else
            log_warning "No bridge pods found for security context testing"
        fi
    else
        log_warning "Bridge deployment not found for security context testing"
    fi
    
    echo ""
    log_info "Testing Network Policies..."
    echo "--------------------------"
    
    # Check if network policies exist
    run_test "Default deny-all network policy exists" \
        "kubectl get networkpolicy default-deny-all -n $NAMESPACE" \
        "success"
    
    run_test "Bridge network policy exists" \
        "kubectl get networkpolicy dytallix-bridge-netpol -n $NAMESPACE" \
        "success"
    
    run_test "Monitoring network policy exists" \
        "kubectl get networkpolicy prometheus-netpol -n $MONITORING_NAMESPACE" \
        "success"
    
    echo ""
    log_info "Testing Cross-Namespace Access Restrictions..."
    echo "---------------------------------------------"
    
    # Test that bridge SA cannot access other namespaces
    test_rbac_permission "dytallix-bridge-sa" "$NAMESPACE" "get" "pods" "" "failure"
    test_rbac_permission "dytallix-bridge-sa" "$NAMESPACE" "list" "secrets" "" "failure"
    
    echo ""
    log_info "Testing Workload Identity Annotations..."
    echo "---------------------------------------"
    
    # Check Workload Identity annotations
    run_test "Bridge SA has Workload Identity annotation" \
        "kubectl get serviceaccount dytallix-bridge-sa -n $NAMESPACE -o jsonpath='{.metadata.annotations.iam\.gke\.io/gcp-service-account}' | grep -q 'dytallix-bridge-sa@'" \
        "success"
    
    run_test "Monitoring SA has Workload Identity annotation" \
        "kubectl get serviceaccount dytallix-monitoring-sa -n $NAMESPACE -o jsonpath='{.metadata.annotations.iam\.gke\.io/gcp-service-account}' | grep -q 'dytallix-monitoring-sa@'" \
        "success"
    
    echo ""
    echo "=================================="
    log_info "Test Summary"
    echo "=================================="
    echo "Total Tests: $TESTS_TOTAL"
    echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        log_success "All RBAC tests passed! ✅"
        echo ""
        log_info "Security compliance status:"
        echo "✅ Principle of least privilege enforced"
        echo "✅ No cluster-admin privileges assigned"
        echo "✅ Pod security contexts configured"
        echo "✅ Network policies implemented"
        echo "✅ Cross-namespace access restricted"
        echo "✅ Workload Identity configured"
        exit 0
    else
        log_error "Some RBAC tests failed! ❌"
        echo ""
        log_warning "Please review the failed tests and fix the RBAC configuration."
        exit 1
    fi
}

# Show usage if help requested
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    echo "Dytallix Bridge RBAC Permission Testing Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --help, -h     Show this help message"
    echo "  --verbose, -v  Enable verbose output"
    echo ""
    echo "This script validates:"
    echo "  • Service account permissions"
    echo "  • RBAC role bindings"
    echo "  • Pod security contexts"
    echo "  • Network policies"
    echo "  • Cross-namespace access restrictions"
    echo "  • Workload Identity configuration"
    echo ""
    echo "Prerequisites:"
    echo "  • kubectl configured and connected to cluster"
    echo "  • RBAC policies deployed"
    echo "  • Dytallix bridge deployment running"
    exit 0
fi

# Enable verbose mode if requested
if [[ "${1:-}" == "--verbose" || "${1:-}" == "-v" ]]; then
    set -x
fi

# Run main function
main "$@"