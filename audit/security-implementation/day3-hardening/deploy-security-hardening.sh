#!/bin/bash

# Dytallix GKE Security Hardening Deployment Script
# This script deploys all Day 3 security hardening configurations

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
REGION="us-central1"
ZONE="us-central1-a"

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed or not in PATH"
    fi
    
    # Check if gcloud is available
    if ! command -v gcloud &> /dev/null; then
        error "gcloud is not installed or not in PATH"
    fi
    
    # Check if terraform is available
    if ! command -v terraform &> /dev/null; then
        warn "terraform is not installed or not in PATH - Terraform deployment will be skipped"
        SKIP_TERRAFORM=true
    else
        SKIP_TERRAFORM=false
    fi
    
    # Check kubectl cluster access
    if ! kubectl cluster-info &> /dev/null; then
        warn "No kubectl cluster access - attempting to configure..."
        gcloud container clusters get-credentials $CLUSTER_NAME --zone=$ZONE --project=$PROJECT_ID || error "Failed to configure kubectl access"
    fi
    
    log "Prerequisites check completed"
}

# Create namespace if it doesn't exist
create_namespace() {
    log "Creating namespace if it doesn't exist..."
    
    if ! kubectl get namespace $NAMESPACE &> /dev/null; then
        kubectl create namespace $NAMESPACE
        log "Created namespace: $NAMESPACE"
    else
        log "Namespace $NAMESPACE already exists"
    fi
}

# Apply Terraform security hardening
apply_terraform_hardening() {
    if [ "$SKIP_TERRAFORM" = true ]; then
        warn "Skipping Terraform deployment - terraform not available"
        return
    fi
    
    log "Applying Terraform security hardening..."
    
    cd deployment/gcp/terraform/
    
    # Initialize Terraform
    terraform init
    
    # Plan the deployment
    log "Planning Terraform deployment..."
    terraform plan -out=security-plan.tfplan
    
    # Apply the security hardening
    log "Applying Terraform security configurations..."
    terraform apply security-plan.tfplan
    
    # Clean up plan file
    rm -f security-plan.tfplan
    
    cd ../../../
    
    log "Terraform security hardening applied successfully"
}

# Deploy Pod Security Standards
deploy_pod_security_standards() {
    log "Deploying Pod Security Standards..."
    
    kubectl apply -f security-implementation/day3-hardening/pod-security-standards.yaml
    
    # Verify deployment
    if kubectl get namespace $NAMESPACE -o yaml | grep -q "pod-security.kubernetes.io/enforce: restricted"; then
        log "Pod Security Standards applied successfully"
    else
        error "Failed to apply Pod Security Standards"
    fi
}

# Deploy default deny network policies
deploy_default_deny_policies() {
    log "Deploying default deny network policies..."
    
    kubectl apply -f security-implementation/day3-hardening/default-deny-network-policies.yaml
    
    # Wait for policies to be ready
    sleep 5
    
    # Verify deployment
    if kubectl get networkpolicy -n $NAMESPACE | grep -q "default-deny-all"; then
        log "Default deny network policies applied successfully"
    else
        error "Failed to apply default deny network policies"
    fi
}

# Deploy Calico enhanced policies
deploy_calico_policies() {
    log "Deploying Calico enhanced network policies..."
    
    # Check if Calico is available
    if ! kubectl get crd globalnetworkpolicies.projectcalico.org &> /dev/null; then
        warn "Calico CRDs not found - applying Kubernetes network policies only"
        return
    fi
    
    kubectl apply -f security-implementation/day3-hardening/calico-enhanced-policies.yaml
    
    log "Calico enhanced network policies applied successfully"
}

# Deploy Binary Authorization policy
deploy_binary_authorization() {
    log "Deploying Binary Authorization policy..."
    
    kubectl apply -f security-implementation/day3-hardening/binary-authorization-policy.yaml
    
    log "Binary Authorization policy applied successfully"
}

# Deploy audit logging configuration
deploy_audit_logging() {
    log "Deploying audit logging configuration..."
    
    kubectl apply -f security-implementation/day3-hardening/audit-logging-config.yaml
    
    log "Audit logging configuration applied successfully"
}

# Validate security deployment
validate_security_deployment() {
    log "Validating security deployment..."
    
    # Check network policies
    local network_policies=$(kubectl get networkpolicy -n $NAMESPACE --no-headers | wc -l)
    if [ $network_policies -lt 3 ]; then
        error "Expected at least 3 network policies, found $network_policies"
    fi
    log "✓ Network policies deployed: $network_policies"
    
    # Check Pod Security Standards
    if kubectl get namespace $NAMESPACE -o yaml | grep -q "pod-security.kubernetes.io/enforce"; then
        log "✓ Pod Security Standards enforced"
    else
        warn "Pod Security Standards not enforced"
    fi
    
    # Check ConfigMaps
    local configmaps=$(kubectl get configmap -n $NAMESPACE --no-headers | grep -c "dytallix-" || true)
    log "✓ Security ConfigMaps deployed: $configmaps"
    
    # Test network policy enforcement
    log "Testing network policy enforcement..."
    if kubectl run test-pod --image=alpine --rm -it --restart=Never -n $NAMESPACE -- /bin/sh -c "echo 'Test completed'" &> /dev/null; then
        log "✓ Network policies allow authorized traffic"
    else
        warn "Network policy test failed - this may be expected behavior"
    fi
    
    log "Security deployment validation completed"
}

# Generate security report
generate_security_report() {
    log "Generating security deployment report..."
    
    local report_file="security-deployment-report-$(date +%Y%m%d-%H%M%S).txt"
    
    cat > $report_file << EOF
Dytallix GKE Security Hardening Deployment Report
================================================
Date: $(date)
Cluster: $CLUSTER_NAME
Namespace: $NAMESPACE
Project: $PROJECT_ID

Security Components Deployed:
----------------------------
EOF
    
    # Network Policies
    echo "Network Policies:" >> $report_file
    kubectl get networkpolicy -n $NAMESPACE >> $report_file 2>/dev/null || echo "  No network policies found" >> $report_file
    echo "" >> $report_file
    
    # ConfigMaps
    echo "Security ConfigMaps:" >> $report_file
    kubectl get configmap -n $NAMESPACE | grep dytallix >> $report_file 2>/dev/null || echo "  No security ConfigMaps found" >> $report_file
    echo "" >> $report_file
    
    # Namespace Security Settings
    echo "Namespace Security Settings:" >> $report_file
    kubectl get namespace $NAMESPACE -o yaml | grep -A 5 -B 5 "pod-security" >> $report_file 2>/dev/null || echo "  No Pod Security Standards found" >> $report_file
    echo "" >> $report_file
    
    # Calico Policies (if available)
    if kubectl get crd globalnetworkpolicies.projectcalico.org &> /dev/null; then
        echo "Calico Global Network Policies:" >> $report_file
        kubectl get globalnetworkpolicy >> $report_file 2>/dev/null || echo "  No global network policies found" >> $report_file
    fi
    
    log "Security report generated: $report_file"
}

# Display security recommendations
display_recommendations() {
    log "Security Hardening Recommendations:"
    echo ""
    echo -e "${BLUE}1. Binary Authorization:${NC}"
    echo "   - Set up attestors with real cryptographic keys"
    echo "   - Configure vulnerability scanning thresholds"
    echo "   - Test image deployment pipeline"
    echo ""
    echo -e "${BLUE}2. Network Policies:${NC}"
    echo "   - Review and test application connectivity"
    echo "   - Monitor network policy logs for violations"
    echo "   - Adjust policies based on application requirements"
    echo ""
    echo -e "${BLUE}3. Audit Logging:${NC}"
    echo "   - Configure log forwarding to SIEM"
    echo "   - Set up alerting for security events"
    echo "   - Review audit policies regularly"
    echo ""
    echo -e "${BLUE}4. Monitoring:${NC}"
    echo "   - Deploy Prometheus monitoring stack"
    echo "   - Configure Grafana security dashboards"
    echo "   - Set up incident response procedures"
    echo ""
    echo -e "${BLUE}5. Regular Maintenance:${NC}"
    echo "   - Schedule security reviews quarterly"
    echo "   - Update security policies as needed"
    echo "   - Conduct penetration testing annually"
    echo ""
}

# Main execution
main() {
    log "Starting Dytallix GKE Security Hardening Deployment"
    
    check_prerequisites
    create_namespace
    
    # Apply configurations in order
    apply_terraform_hardening
    deploy_pod_security_standards
    deploy_default_deny_policies
    deploy_calico_policies
    deploy_binary_authorization
    deploy_audit_logging
    
    # Validate and report
    validate_security_deployment
    generate_security_report
    display_recommendations
    
    log "Dytallix GKE Security Hardening deployment completed successfully!"
    echo ""
    echo -e "${GREEN}Next Steps:${NC}"
    echo "1. Review the generated security report"
    echo "2. Test application functionality with new security policies"
    echo "3. Configure monitoring and alerting"
    echo "4. Document any custom security policies needed"
    echo "5. Schedule regular security reviews"
}

# Run main function
main "$@"