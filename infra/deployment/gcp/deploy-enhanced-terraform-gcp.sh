#!/bin/bash

# Dytallix Cross-Chain Bridge - Enhanced Terraform GCP Deployment
# This script supports multiple environments and advanced Terraform features

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/terraform"

# Default values
ENVIRONMENT=${ENVIRONMENT:-"testnet"}
PROJECT_ID=${PROJECT_ID:-"dytallix"}
REGION=${REGION:-"us-central1"}
ZONE=${ZONE:-"us-central1-a"}
ACTION=${1:-"apply"}

# Usage function
usage() {
    echo "Usage: $0 [apply|plan|destroy|init|validate] [environment]"
    echo ""
    echo "Actions:"
    echo "  apply     - Apply Terraform configuration (default)"
    echo "  plan      - Show what Terraform will do"
    echo "  destroy   - Destroy all infrastructure"
    echo "  init      - Initialize Terraform"
    echo "  validate  - Validate Terraform configuration"
    echo "  output    - Show Terraform outputs"
    echo ""
    echo "Environments:"
    echo "  dev       - Development environment"
    echo "  testnet   - Testnet environment (default)"
    echo "  prod      - Production environment"
    echo ""
    echo "Examples:"
    echo "  $0 apply testnet    # Deploy to testnet"
    echo "  $0 plan prod        # Plan production deployment"
    echo "  $0 destroy dev      # Destroy development environment"
    echo ""
    echo "Environment Variables:"
    echo "  PROJECT_ID    - Override GCP project ID"
    echo "  REGION        - Override GCP region (default: us-central1)"
    echo "  ZONE          - Override GCP zone (default: us-central1-a)"
    echo ""
}

# Parse arguments
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    usage
    exit 0
fi

if [ -n "$2" ]; then
    ENVIRONMENT="$2"
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|testnet|prod)$ ]]; then
    echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
    echo "Valid environments: dev, testnet, prod"
    exit 1
fi

# Validate action
if [[ ! "$ACTION" =~ ^(apply|plan|destroy|init|validate|output)$ ]]; then
    echo -e "${RED}❌ Invalid action: $ACTION${NC}"
    usage
    exit 1
fi

echo -e "${BLUE}🚀 Dytallix Cross-Chain Bridge - Enhanced Terraform Deployment${NC}"
echo "=============================================================="
echo "Environment: $ENVIRONMENT"
echo "Project ID:  $PROJECT_ID"
echo "Region:      $REGION"
echo "Zone:        $ZONE"
echo "Action:      $ACTION"
echo ""

# Function to print step
print_step() {
    echo -e "${BLUE}📋 Step $1: $2${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_step "1" "Checking Prerequisites"
    
    local missing_tools=()
    
    for tool in gcloud terraform kubectl docker; do
        if ! command -v $tool &> /dev/null; then
            missing_tools+=($tool)
        fi
    done
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        echo "Please install the missing tools and try again."
        exit 1
    fi
    
    # Check Terraform version
    local tf_version=$(terraform version -json | jq -r .terraform_version)
    print_success "Prerequisites check passed (Terraform $tf_version)"
}

# Setup authentication
setup_authentication() {
    print_step "2" "Setting up Authentication"
    
    # Check if user is authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1 > /dev/null; then
        print_warning "Not authenticated with Google Cloud. Please run 'gcloud auth login'"
        exit 1
    fi
    
    # Check if Application Default Credentials are set up
    if ! gcloud auth application-default print-access-token &>/dev/null; then
        print_warning "Setting up Application Default Credentials..."
        gcloud auth application-default login
    fi
    
    # Set project configuration
    gcloud config set project $PROJECT_ID
    gcloud config set compute/region $REGION
    gcloud config set compute/zone $ZONE
    
    print_success "Authentication configured"
}

# Initialize Terraform
init_terraform() {
    print_step "3" "Initializing Terraform"
    
    cd "$TERRAFORM_DIR"
    
    # Create workspace if it doesn't exist
    if ! terraform workspace list | grep -q "$ENVIRONMENT"; then
        echo "Creating Terraform workspace: $ENVIRONMENT"
        terraform workspace new "$ENVIRONMENT"
    else
        echo "Selecting Terraform workspace: $ENVIRONMENT"
        terraform workspace select "$ENVIRONMENT"
    fi
    
    # Initialize Terraform
    terraform init -upgrade
    
    print_success "Terraform initialized"
}

# Validate Terraform configuration
validate_terraform() {
    print_step "4" "Validating Terraform Configuration"
    
    cd "$TERRAFORM_DIR"
    
    # Format check
    if ! terraform fmt -check=true -diff=true; then
        print_warning "Terraform files are not properly formatted. Running 'terraform fmt'..."
        terraform fmt
    fi
    
    # Validate configuration
    terraform validate
    
    print_success "Terraform configuration is valid"
}

# Plan Terraform deployment
plan_terraform() {
    print_step "5" "Planning Terraform Deployment"
    
    cd "$TERRAFORM_DIR"
    
    local var_file="environments/${ENVIRONMENT}.tfvars"
    
    if [ ! -f "$var_file" ]; then
        print_error "Environment file not found: $var_file"
        exit 1
    fi
    
    terraform plan \
        -var-file="$var_file" \
        -var="project_id=$PROJECT_ID" \
        -var="region=$REGION" \
        -var="zone=$ZONE" \
        -out="$ENVIRONMENT.tfplan"
    
    print_success "Terraform plan completed"
}

# Apply Terraform configuration
apply_terraform() {
    print_step "6" "Applying Terraform Configuration"
    
    cd "$TERRAFORM_DIR"
    
    if [ -f "$ENVIRONMENT.tfplan" ]; then
        echo "Applying from saved plan..."
        terraform apply "$ENVIRONMENT.tfplan"
        rm -f "$ENVIRONMENT.tfplan"
    else
        local var_file="environments/${ENVIRONMENT}.tfvars"
        
        echo "Applying with confirmation..."
        terraform apply \
            -var-file="$var_file" \
            -var="project_id=$PROJECT_ID" \
            -var="region=$REGION" \
            -var="zone=$ZONE"
    fi
    
    print_success "Terraform apply completed"
}

# Destroy Terraform infrastructure
destroy_terraform() {
    print_step "6" "Destroying Terraform Infrastructure"
    
    cd "$TERRAFORM_DIR"
    
    local var_file="environments/${ENVIRONMENT}.tfvars"
    
    echo -e "${RED}⚠️  WARNING: This will destroy all infrastructure in $ENVIRONMENT environment!${NC}"
    echo "Project: $PROJECT_ID"
    echo ""
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation
    
    if [ "$confirmation" != "yes" ]; then
        echo "Destruction cancelled."
        exit 0
    fi
    
    terraform destroy \
        -var-file="$var_file" \
        -var="project_id=$PROJECT_ID" \
        -var="region=$REGION" \
        -var="zone=$ZONE"
    
    print_success "Infrastructure destroyed"
}

# Show Terraform outputs
show_outputs() {
    print_step "6" "Showing Terraform Outputs"
    
    cd "$TERRAFORM_DIR"
    
    echo ""
    echo -e "${PURPLE}📊 Terraform Outputs for $ENVIRONMENT:${NC}"
    echo "================================================"
    
    terraform output -json | jq -r '
        to_entries[] |
        "\(.key): \(.value.value // "null")"
    ' | while read -r line; do
        if [[ $line == *"password"* ]] || [[ $line == *"secret"* ]] || [[ $line == *"key"* ]]; then
            echo "$line" | sed 's/: .*/: [SENSITIVE]/'
        else
            echo "$line"
        fi
    done
    
    echo ""
    echo -e "${BLUE}🔧 Useful Commands:${NC}"
    terraform output kubectl_config_command 2>/dev/null || true
    
    print_success "Outputs displayed"
}

# Configure kubectl after successful deployment
configure_kubectl() {
    if [ "$ACTION" = "apply" ]; then
        print_step "7" "Configuring kubectl"
        
        cd "$TERRAFORM_DIR"
        
        local cluster_name=$(terraform output -raw cluster_name 2>/dev/null || echo "")
        
        if [ -n "$cluster_name" ]; then
            gcloud container clusters get-credentials "$cluster_name" --zone="$ZONE" --project="$PROJECT_ID"
            print_success "kubectl configured for cluster: $cluster_name"
        else
            print_warning "Could not determine cluster name from Terraform outputs"
        fi
    fi
}

# Deploy application after infrastructure is ready
deploy_application() {
    if [ "$ACTION" = "apply" ]; then
        print_step "8" "Deploying Application"
        
        cd "$SCRIPT_DIR"
        
        # Get outputs from Terraform
        cd "$TERRAFORM_DIR"
        local artifact_registry_url=$(terraform output -raw artifact_registry_url 2>/dev/null || echo "")
        
        if [ -n "$artifact_registry_url" ]; then
            echo "Building and pushing Docker image..."
            cd "$SCRIPT_DIR/../../.."
            
            # Build and push image
            docker build -t "$artifact_registry_url/dytallix-bridge:latest" .
            gcloud auth configure-docker "${REGION}-docker.pkg.dev"
            docker push "$artifact_registry_url/dytallix-bridge:latest"
            
            # Deploy Kubernetes manifests
            cd "$SCRIPT_DIR"
            sed "s|gcr.io/PROJECT_ID/dytallix-bridge:latest|$artifact_registry_url/dytallix-bridge:latest|g" \
                dytallix-bridge-gcp.yaml > "/tmp/dytallix-bridge-${ENVIRONMENT}.yaml"
            sed -i "s/PROJECT_ID/$PROJECT_ID/g" "/tmp/dytallix-bridge-${ENVIRONMENT}.yaml"
            
            kubectl apply -f "/tmp/dytallix-bridge-${ENVIRONMENT}.yaml"
            kubectl apply -f monitoring-gcp.yaml
            
            print_success "Application deployed"
        else
            print_warning "Could not get Artifact Registry URL from Terraform outputs"
        fi
    fi
}

# Create deployment summary
create_summary() {
    if [ "$ACTION" = "apply" ]; then
        print_step "9" "Creating Deployment Summary"
        
        cd "$TERRAFORM_DIR"
        
        cat > "../deployment-summary-${ENVIRONMENT}.md" << EOF
# Dytallix Bridge Deployment Summary

**Environment**: $ENVIRONMENT  
**Project ID**: $PROJECT_ID  
**Region**: $REGION  
**Deployed**: $(date)

## Infrastructure

\`\`\`
$(terraform output -json | jq -r 'to_entries[] | "\(.key): \(.value.value // "null")"' | grep -v password)
\`\`\`

## Access Commands

\`\`\`bash
# Configure kubectl
$(terraform output -raw kubectl_config_command 2>/dev/null || echo "gcloud container clusters get-credentials CLUSTER_NAME --zone=$ZONE --project=$PROJECT_ID")

# View deployments
kubectl get deployments -n dytallix

# View services
kubectl get services -n dytallix

# View logs
kubectl logs -f deployment/dytallix-bridge-node -n dytallix
\`\`\`

## Management

\`\`\`bash
# Scale application
kubectl scale deployment dytallix-bridge-node --replicas=5 -n dytallix

# Update infrastructure
cd deployment/gcp
./deploy-enhanced-terraform-gcp.sh apply $ENVIRONMENT

# Destroy infrastructure
cd deployment/gcp
./deploy-enhanced-terraform-gcp.sh destroy $ENVIRONMENT
\`\`\`
EOF
        
        print_success "Deployment summary created: deployment-summary-${ENVIRONMENT}.md"
    fi
}

# Main execution
main() {
    case "$ACTION" in
        "init")
            check_prerequisites
            setup_authentication
            init_terraform
            ;;
        "validate")
            check_prerequisites
            init_terraform
            validate_terraform
            ;;
        "plan")
            check_prerequisites
            setup_authentication
            init_terraform
            validate_terraform
            plan_terraform
            ;;
        "apply")
            check_prerequisites
            setup_authentication
            init_terraform
            validate_terraform
            plan_terraform
            apply_terraform
            configure_kubectl
            deploy_application
            create_summary
            show_outputs
            ;;
        "destroy")
            check_prerequisites
            setup_authentication
            init_terraform
            destroy_terraform
            ;;
        "output")
            check_prerequisites
            init_terraform
            show_outputs
            ;;
    esac
}

# Run main function
main

echo ""
echo -e "${GREEN}🎉 Terraform $ACTION completed successfully for $ENVIRONMENT environment!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
case "$ACTION" in
    "apply")
        echo "1. Verify deployment: kubectl get pods -n dytallix"
        echo "2. Check services: kubectl get services -n dytallix"
        echo "3. View logs: kubectl logs -f deployment/dytallix-bridge-node -n dytallix"
        echo "4. Access monitoring: kubectl port-forward service/grafana 3000:3000 -n monitoring"
        ;;
    "plan")
        echo "1. Review the plan output above"
        echo "2. Run '$0 apply $ENVIRONMENT' to apply the changes"
        ;;
    "destroy")
        echo "1. Verify all resources are destroyed in the GCP Console"
        echo "2. Check for any remaining billable resources"
        ;;
esac
echo ""
