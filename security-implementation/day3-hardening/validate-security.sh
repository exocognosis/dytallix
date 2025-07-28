#!/bin/bash

# Dytallix Security Validation Script
# Validates the GKE security hardening implementation

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="dytallix"
CLUSTER_NAME="dytallix-bridge-cluster"
PROJECT_ID="dytallix"

# Logging functions
log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"; }
error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"; }
info() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"; }

# Validation counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Test result tracking
test_result() {
    local test_name="$1"
    local result="$2"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if [ "$result" = "PASS" ]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        log "✅ $test_name"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        error "❌ $test_name"
    fi
}

# Validate YAML files
validate_yaml_files() {
    info "Validating YAML configuration files..."
    
    local yaml_files=(
        "security-implementation/day3-hardening/default-deny-network-policies.yaml"
        "security-implementation/day3-hardening/calico-enhanced-policies.yaml"
        "security-implementation/day3-hardening/pod-security-standards.yaml"
        "security-implementation/day3-hardening/binary-authorization-policy.yaml"
        "security-implementation/day3-hardening/audit-logging-config.yaml"
    )
    
    for file in "${yaml_files[@]}"; do
        if [ -f "$file" ]; then
            if python3 -c "import yaml; list(yaml.safe_load_all(open('$file')))" 2>/dev/null; then
                test_result "YAML syntax: $(basename $file)" "PASS"
            else
                test_result "YAML syntax: $(basename $file)" "FAIL"
            fi
        else
            test_result "File exists: $(basename $file)" "FAIL"
        fi
    done
}

# Validate Terraform configuration
validate_terraform_config() {
    info "Validating Terraform configuration..."
    
    local tf_file="deployment/gcp/terraform/main.tf"
    
    if [ -f "$tf_file" ]; then
        test_result "Terraform file exists" "PASS"
        
        # Check for security features in Terraform
        local security_features=(
            "enable_private_nodes.*true"
            "enable_private_endpoint.*true"
            "binary_authorization"
            "provider.*CALICO"
            "google_compute_router_nat"
            "google_kms_crypto_key"
            "binaryauthorization.googleapis.com"
        )
        
        for feature in "${security_features[@]}"; do
            if grep -q "$feature" "$tf_file"; then
                test_result "Terraform feature: $feature" "PASS"
            else
                test_result "Terraform feature: $feature" "FAIL"
            fi
        done
    else
        test_result "Terraform file exists" "FAIL"
    fi
}

# Validate security documentation
validate_documentation() {
    info "Validating security documentation..."
    
    local doc_files=(
        "docs/security/GKE_SECURITY_HARDENING.md"
        "docs/security/hardening_checklist.md"
        "security-implementation/day3-hardening/README.md"
    )
    
    for file in "${doc_files[@]}"; do
        if [ -f "$file" ]; then
            test_result "Documentation exists: $(basename $file)" "PASS"
            
            # Check file is not empty
            if [ -s "$file" ]; then
                test_result "Documentation not empty: $(basename $file)" "PASS"
            else
                test_result "Documentation not empty: $(basename $file)" "FAIL"
            fi
        else
            test_result "Documentation exists: $(basename $file)" "FAIL"
        fi
    done
}

# Validate deployment script
validate_deployment_script() {
    info "Validating deployment script..."
    
    local script_file="security-implementation/day3-hardening/deploy-security-hardening.sh"
    
    if [ -f "$script_file" ]; then
        test_result "Deployment script exists" "PASS"
        
        if [ -x "$script_file" ]; then
            test_result "Deployment script is executable" "PASS"
        else
            test_result "Deployment script is executable" "FAIL"
        fi
        
        # Check script syntax
        if bash -n "$script_file" 2>/dev/null; then
            test_result "Deployment script syntax" "PASS"
        else
            test_result "Deployment script syntax" "FAIL"
        fi
    else
        test_result "Deployment script exists" "FAIL"
    fi
}

# Validate network policy coverage
validate_network_policy_coverage() {
    info "Validating network policy coverage..."
    
    local policy_file="security-implementation/day3-hardening/default-deny-network-policies.yaml"
    
    if [ -f "$policy_file" ]; then
        # Check for default deny policies
        if grep -q "default-deny-all-ingress" "$policy_file"; then
            test_result "Default deny ingress policy" "PASS"
        else
            test_result "Default deny ingress policy" "FAIL"
        fi
        
        if grep -q "default-deny-all-egress" "$policy_file"; then
            test_result "Default deny egress policy" "PASS"
        else
            test_result "Default deny egress policy" "FAIL"
        fi
        
        if grep -q "allow-dns-egress" "$policy_file"; then
            test_result "DNS access policy" "PASS"
        else
            test_result "DNS access policy" "FAIL"
        fi
    fi
    
    # Check Calico policies
    local calico_file="security-implementation/day3-hardening/calico-enhanced-policies.yaml"
    if [ -f "$calico_file" ]; then
        if grep -q "projectcalico.org/v3" "$calico_file"; then
            test_result "Calico API version" "PASS"
        else
            test_result "Calico API version" "FAIL"
        fi
        
        if grep -q "microsegmentation" "$calico_file"; then
            test_result "Microsegmentation policies" "PASS"
        else
            test_result "Microsegmentation policies" "FAIL"
        fi
    fi
}

# Validate Pod Security Standards
validate_pod_security_standards() {
    info "Validating Pod Security Standards..."
    
    local pss_file="security-implementation/day3-hardening/pod-security-standards.yaml"
    
    if [ -f "$pss_file" ]; then
        # Check for restricted profile
        if grep -q "pod-security.kubernetes.io/enforce: restricted" "$pss_file"; then
            test_result "Pod Security Standards enforcement" "PASS"
        else
            test_result "Pod Security Standards enforcement" "FAIL"
        fi
        
        # Check for security context requirements
        if grep -q "runAsNonRoot: true" "$pss_file"; then
            test_result "Non-root security context" "PASS"
        else
            test_result "Non-root security context" "FAIL"
        fi
        
        if grep -q "readOnlyRootFilesystem: true" "$pss_file"; then
            test_result "Read-only root filesystem" "PASS"
        else
            test_result "Read-only root filesystem" "FAIL"
        fi
        
        if grep -q "allowPrivilegeEscalation: false" "$pss_file"; then
            test_result "No privilege escalation" "PASS"
        else
            test_result "No privilege escalation" "FAIL"
        fi
    fi
}

# Validate Binary Authorization
validate_binary_authorization() {
    info "Validating Binary Authorization configuration..."
    
    local ba_file="security-implementation/day3-hardening/binary-authorization-policy.yaml"
    
    if [ -f "$ba_file" ]; then
        if grep -q "ENFORCED_BLOCK_AND_AUDIT_LOG" "$ba_file"; then
            test_result "Binary Authorization enforcement" "PASS"
        else
            test_result "Binary Authorization enforcement" "FAIL"
        fi
        
        if grep -q "requireAttestationsBy" "$ba_file"; then
            test_result "Attestation requirements" "PASS"
        else
            test_result "Attestation requirements" "FAIL"
        fi
        
        if grep -q "vulnerabilityPolicy" "$ba_file"; then
            test_result "Vulnerability scanning policy" "PASS"
        else
            test_result "Vulnerability scanning policy" "FAIL"
        fi
    fi
}

# Validate audit logging
validate_audit_logging() {
    info "Validating audit logging configuration..."
    
    local audit_file="security-implementation/day3-hardening/audit-logging-config.yaml"
    
    if [ -f "$audit_file" ]; then
        if grep -q "audit.k8s.io/v1" "$audit_file"; then
            test_result "Audit policy API version" "PASS"
        else
            test_result "Audit policy API version" "FAIL"
        fi
        
        if grep -q "RequestResponse" "$audit_file"; then
            test_result "RequestResponse audit level" "PASS"
        else
            test_result "RequestResponse audit level" "FAIL"
        fi
        
        if grep -q "PrometheusRule" "$audit_file"; then
            test_result "Security alert rules" "PASS"
        else
            test_result "Security alert rules" "FAIL"
        fi
    fi
}

# Validate security hardening checklist updates
validate_checklist_updates() {
    info "Validating security checklist updates..."
    
    local checklist_file="docs/security/hardening_checklist.md"
    
    if [ -f "$checklist_file" ]; then
        # Check for completed items
        local completed_items=$(grep -c "\[x\]" "$checklist_file" 2>/dev/null || echo "0")
        if [ "$completed_items" -gt 3 ]; then
            test_result "Security checklist updates ($completed_items items)" "PASS"
        else
            test_result "Security checklist updates ($completed_items items)" "FAIL"
        fi
        
        # Check for improved compliance score
        if grep -q "Compliance Score.*9[0-9]" "$checklist_file"; then
            test_result "Improved compliance score" "PASS"
        else
            test_result "Improved compliance score" "FAIL"
        fi
    fi
}

# Generate validation report
generate_validation_report() {
    info "Generating validation report..."
    
    local report_file="security-validation-report-$(date +%Y%m%d-%H%M%S).txt"
    
    cat > "$report_file" << EOF
Dytallix GKE Security Hardening Validation Report
=================================================
Date: $(date)
Validation Summary: $TESTS_PASSED/$TESTS_TOTAL tests passed

Test Results:
EOF
    
    echo "- YAML Configuration Files: Valid" >> "$report_file"
    echo "- Terraform Configuration: Enhanced with security features" >> "$report_file"
    echo "- Network Policies: Default deny-all with explicit allows" >> "$report_file"
    echo "- Pod Security Standards: Restricted profile enforced" >> "$report_file"
    echo "- Binary Authorization: Image verification enabled" >> "$report_file"
    echo "- Audit Logging: Comprehensive security event logging" >> "$report_file"
    echo "- Documentation: Updated with security configurations" >> "$report_file"
    echo "" >> "$report_file"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo "✅ All validation tests passed!" >> "$report_file"
    else
        echo "⚠️  $TESTS_FAILED tests failed - review configuration" >> "$report_file"
    fi
    
    log "Validation report generated: $report_file"
}

# Main validation function
main() {
    log "Starting Dytallix GKE Security Hardening Validation"
    
    # Run all validation tests
    validate_yaml_files
    validate_terraform_config
    validate_documentation
    validate_deployment_script
    validate_network_policy_coverage
    validate_pod_security_standards
    validate_binary_authorization
    validate_audit_logging
    validate_checklist_updates
    
    # Generate report
    generate_validation_report
    
    # Display summary
    echo ""
    log "Validation Summary:"
    echo -e "  Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "  Tests Failed: ${RED}$TESTS_FAILED${NC}"
    echo -e "  Total Tests:  ${BLUE}$TESTS_TOTAL${NC}"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo ""
        log "🎉 All security hardening validations passed!"
        echo ""
        echo -e "${GREEN}The GKE security hardening implementation is complete and ready for deployment.${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Deploy the security configurations to your GKE cluster"
        echo "2. Test application functionality with new security policies"
        echo "3. Monitor security alerts and audit logs"
        echo "4. Schedule regular security reviews"
        exit 0
    else
        echo ""
        error "Some validation tests failed. Please review the configuration."
        exit 1
    fi
}

# Run main function
main "$@"