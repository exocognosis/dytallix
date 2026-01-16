#!/bin/bash

# Dytallix Cross-Chain Bridge - GCP Deployment Readiness Check
# This script verifies all components are ready for GCP deployment

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Dytallix Cross-Chain Bridge - GCP Deployment Readiness Check${NC}"
echo "======================================================================"
echo ""

# Function to print step
print_step() {
    echo -e "${BLUE}📋 $1${NC}"
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

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        print_success "$2"
        return 0
    else
        print_error "$2 - File not found: $1"
        return 1
    fi
}

# Function to check directory exists
check_directory() {
    if [ -d "$1" ]; then
        print_success "$2"
        return 0
    else
        print_error "$2 - Directory not found: $1"
        return 1
    fi
}

# Function to check command exists
check_command() {
    if command -v $1 &> /dev/null; then
        print_success "$2"
        return 0
    else
        print_warning "$2 - Command not found: $1"
        return 1
    fi
}

# Initialize counters
total_checks=0
passed_checks=0

# Helper function to track checks
track_check() {
    total_checks=$((total_checks + 1))
    if [ $1 -eq 0 ]; then
        passed_checks=$((passed_checks + 1))
    fi
}

print_step "1. Checking Prerequisites"
echo "Verifying required tools and dependencies..."

check_command "gcloud" "Google Cloud SDK"
track_check $?

check_command "terraform" "Terraform"
track_check $?

check_command "kubectl" "Kubernetes CLI"
track_check $?

check_command "docker" "Docker"
track_check $?

check_command "helm" "Helm"
track_check $?

echo ""

print_step "2. Checking GCP Deployment Files"
echo "Verifying all GCP deployment files are present..."

check_directory "deployment/gcp" "GCP deployment directory"
track_check $?

check_file "deployment/gcp/README.md" "GCP deployment README"
track_check $?

check_file "deployment/gcp/gcp-config.yaml" "GCP configuration"
track_check $?

check_file "deployment/gcp/deploy-to-gcp.sh" "Basic GCP deployment script"
track_check $?

check_file "deployment/gcp/deploy-terraform-gcp.sh" "Terraform GCP deployment script"
track_check $?

check_file "deployment/gcp/setup-gcp-environment.sh" "Environment setup script"
track_check $?

check_file "deployment/gcp/dytallix-bridge-gcp.yaml" "GCP Kubernetes manifests"
track_check $?

check_file "deployment/gcp/monitoring-gcp.yaml" "GCP monitoring manifests"
track_check $?

echo ""

print_step "3. Checking Terraform Configuration"
echo "Verifying Terraform infrastructure files..."

check_directory "deployment/gcp/terraform" "Terraform directory"
track_check $?

check_file "deployment/gcp/terraform/main.tf" "Terraform main configuration"
track_check $?

check_file "deployment/gcp/terraform/terraform.tfvars" "Terraform variables"
track_check $?

# Check if scripts are executable
if [ -x "deployment/gcp/deploy-to-gcp.sh" ]; then
    print_success "deploy-to-gcp.sh is executable"
    track_check 0
else
    print_warning "deploy-to-gcp.sh is not executable"
    track_check 1
fi

if [ -x "deployment/gcp/deploy-terraform-gcp.sh" ]; then
    print_success "deploy-terraform-gcp.sh is executable"
    track_check 0
else
    print_warning "deploy-terraform-gcp.sh is not executable"
    track_check 1
fi

if [ -x "deployment/gcp/setup-gcp-environment.sh" ]; then
    print_success "setup-gcp-environment.sh is executable"
    track_check 0
else
    print_warning "setup-gcp-environment.sh is not executable"
    track_check 1
fi

echo ""

print_step "4. Checking Core Bridge Implementation"
echo "Verifying bridge core files are present..."

check_file "interoperability/src/lib.rs" "Bridge core implementation"
track_check $?

check_file "interoperability/src/connectors/ethereum/bridge_contract.rs" "Ethereum connector"
track_check $?

check_file "interoperability/src/connectors/cosmos/ibc_client.rs" "Cosmos connector"
track_check $?

check_file "interoperability/src/connectors/polkadot/substrate_client.rs" "Polkadot connector"
track_check $?

check_file "Dockerfile" "Docker configuration"
track_check $?

echo ""

print_step "5. Checking Existing Deployment Infrastructure"
echo "Verifying existing deployment files..."

check_file "FINAL_TESTNET_DEPLOYMENT.sh" "Main deployment script"
track_check $?

check_file "verify_bridge_integration.sh" "Bridge verification script"
track_check $?

check_file "setup_bridge_environment.sh" "Bridge environment setup"
track_check $?

check_directory "deployment/kubernetes" "Kubernetes deployment directory"
track_check $?

check_directory "deployment/docker" "Docker deployment directory"
track_check $?

echo ""

print_step "6. Checking Configuration Templates"
echo "Verifying configuration templates..."

check_file "deployment/ethereum-contracts/.env.template" "Ethereum environment template"
track_check $?

check_file "deployment/cosmos-contracts/.env.template" "Cosmos environment template"
track_check $?

check_file "deployment/docker/secrets/pqc_keys.json" "PQC keys configuration"
track_check $?

echo ""

print_step "7. Validating Terraform Configuration"
echo "Running Terraform validation..."

cd deployment/gcp/terraform 2>/dev/null || { print_error "Cannot access Terraform directory"; track_check 1; }

if [ -d ".terraform" ] || terraform init -backend=false &>/dev/null; then
    if terraform validate &>/dev/null; then
        print_success "Terraform configuration is valid"
        track_check 0
    else
        print_warning "Terraform validation failed"
        track_check 1
    fi
else
    print_warning "Terraform not initialized (run 'terraform init' in deployment/gcp/terraform)"
    track_check 1
fi

cd ../../.. 2>/dev/null || true

echo ""

print_step "8. Checking YAML Configuration Syntax"
echo "Validating Kubernetes manifests..."

# Check if YAML files are valid
yaml_files=(
    "deployment/gcp/dytallix-bridge-gcp.yaml"
    "deployment/gcp/monitoring-gcp.yaml"
    "deployment/gcp/gcp-config.yaml"
)

for yaml_file in "${yaml_files[@]}"; do
    if [ -f "$yaml_file" ]; then
        # Basic YAML syntax check
        if python3 -c "import yaml; yaml.safe_load(open('$yaml_file'))" 2>/dev/null || \
           python -c "import yaml; yaml.safe_load(open('$yaml_file'))" 2>/dev/null; then
            print_success "YAML syntax valid: $(basename $yaml_file)"
            track_check 0
        else
            print_warning "YAML syntax check failed: $(basename $yaml_file)"
            track_check 1
        fi
    else
        print_error "YAML file not found: $yaml_file"
        track_check 1
    fi
done

echo ""

print_step "9. Authentication Check"
echo "Checking Google Cloud authentication..."

if gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1 > /dev/null 2>&1; then
    ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1)
    print_success "Google Cloud authenticated: $ACTIVE_ACCOUNT"
    track_check 0
    
    # Check if application default credentials are set
    if gcloud auth application-default print-access-token &>/dev/null; then
        print_success "Application Default Credentials configured"
        track_check 0
    else
        print_warning "Application Default Credentials not configured (run 'gcloud auth application-default login')"
        track_check 1
    fi
else
    print_warning "Google Cloud not authenticated (run 'gcloud auth login')"
    track_check 1
fi

echo ""

print_step "10. Project Configuration Check"
echo "Checking current Google Cloud project configuration..."

if CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null) && [ -n "$CURRENT_PROJECT" ]; then
    print_success "Current project: $CURRENT_PROJECT"
    track_check 0
    
    # Check if project exists and is accessible
    if gcloud projects describe "$CURRENT_PROJECT" &>/dev/null; then
        print_success "Project accessible and valid"
        track_check 0
    else
        print_warning "Project may not exist or not accessible"
        track_check 1
    fi
else
    print_warning "No Google Cloud project set (run 'gcloud config set project PROJECT_ID')"
    track_check 1
fi

echo ""

print_step "11. Documentation Check"
echo "Verifying deployment documentation..."

check_file "docs/CHANGELOG.md" "Project changelog"
track_check $?

if grep -q "GOOGLE CLOUD PLATFORM DEPLOYMENT READY" docs/CHANGELOG.md 2>/dev/null; then
    print_success "GCP deployment documented in changelog"
    track_check 0
else
    print_warning "GCP deployment not documented in changelog"
    track_check 1
fi

echo ""

# Final summary
echo "======================================================================"
print_step "DEPLOYMENT READINESS SUMMARY"
echo ""

if [ $passed_checks -eq $total_checks ]; then
    echo -e "${GREEN}🎉 ALL CHECKS PASSED! Ready for GCP deployment.${NC}"
    echo -e "${GREEN}✅ $passed_checks/$total_checks checks successful${NC}"
    echo ""
    echo -e "${BLUE}🚀 Next Steps:${NC}"
    echo "1. Set up your Google Cloud project: gcloud config set project YOUR_PROJECT_ID"
    echo "2. Run the Terraform deployment: cd deployment/gcp && ./deploy-terraform-gcp.sh"
    echo "3. Or use the basic deployment: cd deployment/gcp && ./deploy-to-gcp.sh"
    echo ""
    exit_code=0
elif [ $passed_checks -gt $((total_checks * 2 / 3)) ]; then
    echo -e "${YELLOW}⚠️  MOSTLY READY - Some optional components missing${NC}"
    echo -e "${YELLOW}✅ $passed_checks/$total_checks checks successful${NC}"
    echo ""
    echo -e "${BLUE}🔧 Recommended Actions:${NC}"
    echo "1. Install missing tools (see warnings above)"
    echo "2. Set up Google Cloud authentication if needed"
    echo "3. Proceed with deployment - most issues are non-critical"
    echo ""
    exit_code=0
else
    echo -e "${RED}❌ NOT READY - Critical components missing${NC}"
    echo -e "${RED}✅ $passed_checks/$total_checks checks successful${NC}"
    echo ""
    echo -e "${BLUE}🔧 Required Actions:${NC}"
    echo "1. Install missing prerequisites (gcloud, terraform, kubectl, docker)"
    echo "2. Ensure all deployment files are present"
    echo "3. Set up Google Cloud authentication"
    echo "4. Re-run this script to verify fixes"
    echo ""
    exit_code=1
fi

echo -e "${PURPLE}📖 For detailed deployment instructions, see:${NC}"
echo "- deployment/gcp/README.md"
echo "- docs/CHANGELOG.md (latest GCP deployment features)"
echo ""

exit $exit_code
