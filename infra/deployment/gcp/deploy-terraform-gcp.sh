#!/bin/bash

# Dytallix Cross-Chain Bridge - Complete GCP Deployment with Terraform
# This script deploys the bridge infrastructure and application using Terraform and Kubernetes

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ID=${PROJECT_ID:-"dytallix"}
REGION=${REGION:-"us-central1"}
ZONE=${ZONE:-"us-central1-a"}

echo -e "${BLUE}🚀 Dytallix Cross-Chain Bridge - Complete GCP Deployment${NC}"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Zone: $ZONE"
echo ""

# Function to check if command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 is not installed. Please install it first.${NC}"
        exit 1
    fi
}

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
print_step "1" "Checking Prerequisites"
check_command "gcloud"
check_command "terraform"
check_command "kubectl"
check_command "docker"
check_command "helm"

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1 > /dev/null; then
    print_error "You are not authenticated with Google Cloud. Please run 'gcloud auth login' first."
    exit 1
fi

# Check if Application Default Credentials are set up
if ! gcloud auth application-default print-access-token &>/dev/null; then
    print_warning "Application Default Credentials not found. Setting them up..."
    gcloud auth application-default login
fi

print_success "Prerequisites check completed"

# Set up project
print_step "2" "Setting up Google Cloud Project"
gcloud config set project $PROJECT_ID
gcloud config set compute/region $REGION
gcloud config set compute/zone $ZONE
print_success "Project configuration completed"

# Deploy infrastructure with Terraform
print_step "3" "Deploying Infrastructure with Terraform"
cd "$SCRIPT_DIR/terraform"

# Initialize Terraform
echo "Initializing Terraform..."
terraform init

# Validate Terraform configuration
echo "Validating Terraform configuration..."
terraform validate

# Plan Terraform deployment
echo "Planning Terraform deployment..."
terraform plan -var="project_id=$PROJECT_ID" -var="region=$REGION" -var="zone=$ZONE"

# Apply Terraform configuration
echo "Applying Terraform configuration..."
terraform apply -var="project_id=$PROJECT_ID" -var="region=$REGION" -var="zone=$ZONE" -auto-approve

# Get Terraform outputs
CLUSTER_ENDPOINT=$(terraform output -raw cluster_endpoint)
DATABASE_CONNECTION_NAME=$(terraform output -raw database_connection_name)
STORAGE_BUCKET_NAME=$(terraform output -raw storage_bucket_name)
ARTIFACT_REGISTRY_URL=$(terraform output -raw artifact_registry_url)
SERVICE_ACCOUNT_EMAIL=$(terraform output -raw service_account_email)

print_success "Infrastructure deployment completed"

# Configure kubectl
print_step "4" "Configuring kubectl"
gcloud container clusters get-credentials dytallix-bridge-cluster --zone=$ZONE
print_success "kubectl configured"

# Build and push Docker image
print_step "5" "Building and Pushing Docker Image"
cd "$SCRIPT_DIR/../../.."

echo "Building Dytallix bridge image..."
docker build -t $ARTIFACT_REGISTRY_URL/dytallix-bridge:latest .

echo "Configuring Docker for Artifact Registry..."
gcloud auth configure-docker $REGION-docker.pkg.dev

echo "Pushing image to Artifact Registry..."
docker push $ARTIFACT_REGISTRY_URL/dytallix-bridge:latest
print_success "Docker image built and pushed"

# Set up environment and secrets
print_step "6" "Setting up Environment and Secrets"
cd "$SCRIPT_DIR"

# Run environment setup
export PROJECT_ID=$PROJECT_ID
./setup-gcp-environment.sh

print_success "Environment setup completed"

# Deploy Kubernetes manifests
print_step "7" "Deploying Kubernetes Manifests"

# Update the Kubernetes manifest with correct image
sed "s|gcr.io/PROJECT_ID/dytallix-bridge:latest|$ARTIFACT_REGISTRY_URL/dytallix-bridge:latest|g" \
    dytallix-bridge-gcp.yaml > /tmp/dytallix-bridge-updated.yaml

# Replace PROJECT_ID placeholder
sed -i "s/PROJECT_ID/$PROJECT_ID/g" /tmp/dytallix-bridge-updated.yaml

echo "Deploying bridge application..."
kubectl apply -f /tmp/dytallix-bridge-updated.yaml

echo "Waiting for deployment to be ready..."
kubectl wait --for=condition=available --timeout=600s deployment/dytallix-bridge-node -n dytallix

print_success "Kubernetes deployment completed"

# Deploy monitoring stack
print_step "8" "Deploying Monitoring Stack"
kubectl apply -f monitoring-gcp.yaml

echo "Waiting for monitoring to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/prometheus -n monitoring || echo "Prometheus may take longer to start"
kubectl wait --for=condition=available --timeout=300s deployment/grafana -n monitoring || echo "Grafana may take longer to start"

print_success "Monitoring stack deployed"

# Get service information
print_step "9" "Getting Service Information"
echo "Waiting for external IPs to be assigned..."
sleep 60

BRIDGE_EXTERNAL_IP=""
PROMETHEUS_EXTERNAL_IP=""
GRAFANA_EXTERNAL_IP=""

# Try to get external IPs (may take some time)
for i in {1..10}; do
    BRIDGE_EXTERNAL_IP=$(kubectl get service dytallix-bridge-service -n dytallix -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    PROMETHEUS_EXTERNAL_IP=$(kubectl get service prometheus -n monitoring -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    GRAFANA_EXTERNAL_IP=$(kubectl get service grafana -n monitoring -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    
    if [ -n "$BRIDGE_EXTERNAL_IP" ] && [ -n "$PROMETHEUS_EXTERNAL_IP" ] && [ -n "$GRAFANA_EXTERNAL_IP" ]; then
        break
    fi
    
    echo "Waiting for external IPs... (attempt $i/10)"
    sleep 30
done

print_success "Service information retrieved"

# Create deployment summary
print_step "10" "Creating Deployment Summary"
cat > gcp-deployment-summary.md << EOF
# Dytallix Cross-Chain Bridge - GCP Deployment Summary

## Infrastructure Details

### Project Information
- **Project ID**: $PROJECT_ID
- **Region**: $REGION
- **Zone**: $ZONE
- **Deployment Date**: $(date)

### Resources Deployed
- **GKE Cluster**: dytallix-bridge-cluster
- **Cloud SQL Instance**: $DATABASE_CONNECTION_NAME
- **Storage Bucket**: $STORAGE_BUCKET_NAME
- **Artifact Registry**: $ARTIFACT_REGISTRY_URL
- **Service Account**: $SERVICE_ACCOUNT_EMAIL

### Application Endpoints
- **Bridge API**: ${BRIDGE_EXTERNAL_IP:+http://$BRIDGE_EXTERNAL_IP:3030}${BRIDGE_EXTERNAL_IP:-"External IP pending"}
- **Health Check**: ${BRIDGE_EXTERNAL_IP:+http://$BRIDGE_EXTERNAL_IP:8081/health}${BRIDGE_EXTERNAL_IP:-"External IP pending"}
- **Metrics**: ${BRIDGE_EXTERNAL_IP:+http://$BRIDGE_EXTERNAL_IP:9090/metrics}${BRIDGE_EXTERNAL_IP:-"External IP pending"}

### Monitoring
- **Prometheus**: ${PROMETHEUS_EXTERNAL_IP:+http://$PROMETHEUS_EXTERNAL_IP:9090}${PROMETHEUS_EXTERNAL_IP:-"External IP pending"}
- **Grafana**: ${GRAFANA_EXTERNAL_IP:+http://$GRAFANA_EXTERNAL_IP:3000}${GRAFANA_EXTERNAL_IP:-"External IP pending"} (admin/dytallix_admin)

## Management Commands

### View Resources
\`\`\`bash
# View all pods
kubectl get pods --all-namespaces

# View services
kubectl get services --all-namespaces

# View deployment status
kubectl get deployments -n dytallix
\`\`\`

### View Logs
\`\`\`bash
# Bridge application logs
kubectl logs -f deployment/dytallix-bridge-node -n dytallix

# All bridge pod logs
kubectl logs -n dytallix -l app=dytallix-bridge --tail=100
\`\`\`

### Scale Application
\`\`\`bash
# Scale bridge nodes
kubectl scale deployment dytallix-bridge-node --replicas=5 -n dytallix

# Check horizontal pod autoscaler
kubectl get hpa -n dytallix
\`\`\`

### Database Access
\`\`\`bash
# Connect to Cloud SQL via proxy
gcloud sql connect $DATABASE_CONNECTION_NAME --user=dytallix
\`\`\`

## Testing Commands

### Health Checks
\`\`\`bash
# Test health endpoint
curl -f http://$BRIDGE_EXTERNAL_IP:8081/health

# Test readiness
curl -f http://$BRIDGE_EXTERNAL_IP:8081/ready

# View metrics
curl -s http://$BRIDGE_EXTERNAL_IP:9090/metrics | head -20
\`\`\`

### Verification Script
\`\`\`bash
# Run comprehensive verification
./verify-gcp-deployment.sh
\`\`\`

## Cleanup Commands

### Remove Kubernetes Resources
\`\`\`bash
kubectl delete namespace dytallix
kubectl delete namespace monitoring
\`\`\`

### Destroy Infrastructure
\`\`\`bash
# From terraform directory
cd terraform
terraform destroy -var="project_id=$PROJECT_ID" -var="region=$REGION" -var="zone=$ZONE"
\`\`\`

### Complete Project Cleanup
\`\`\`bash
# Delete the entire project (CAREFUL!)
gcloud projects delete $PROJECT_ID
\`\`\`

## Security Notes

1. **Private Keys**: Stored as Kubernetes secrets with proper RBAC
2. **Database**: Protected by VPC, SSL required
3. **Network**: Private GKE cluster with authorized networks
4. **Monitoring**: Separate namespace with network policies
5. **Service Account**: Minimal required permissions

## Support and Troubleshooting

### Common Issues
1. **External IP Pending**: Wait 5-10 minutes for load balancer provisioning
2. **Pods Not Starting**: Check resource limits and node capacity
3. **Database Connection**: Verify Cloud SQL proxy and network settings

### Useful Commands
\`\`\`bash
# Check cluster info
kubectl cluster-info

# Describe problematic pod
kubectl describe pod <pod-name> -n dytallix

# Check events
kubectl get events -n dytallix --sort-by='.lastTimestamp'

# Check resource usage
kubectl top nodes
kubectl top pods -n dytallix
\`\`\`

---
Generated on $(date) by Dytallix GCP Deployment Script
EOF

print_success "Deployment summary created: gcp-deployment-summary.md"

# Run verification
print_step "11" "Running Deployment Verification"
if [ -f "./verify-gcp-deployment.sh" ]; then
    ./verify-gcp-deployment.sh
else
    print_warning "Verification script not found, skipping verification"
fi

# Clean up temporary files
rm -f /tmp/dytallix-bridge-updated.yaml

echo ""
echo -e "${GREEN}🎉 Dytallix Cross-Chain Bridge Successfully Deployed to Google Cloud!${NC}"
echo ""
echo -e "${BLUE}📋 Quick Access:${NC}"
if [ -n "$BRIDGE_EXTERNAL_IP" ]; then
    echo -e "${GREEN}🌐 Bridge API: http://$BRIDGE_EXTERNAL_IP:3030${NC}"
    echo -e "${GREEN}🏥 Health Check: http://$BRIDGE_EXTERNAL_IP:8081/health${NC}"
fi
if [ -n "$PROMETHEUS_EXTERNAL_IP" ]; then
    echo -e "${GREEN}📊 Prometheus: http://$PROMETHEUS_EXTERNAL_IP:9090${NC}"
fi
if [ -n "$GRAFANA_EXTERNAL_IP" ]; then
    echo -e "${GREEN}📈 Grafana: http://$GRAFANA_EXTERNAL_IP:3000${NC}"
fi
echo ""
echo -e "${BLUE}📝 Important:${NC}"
echo "1. Review the deployment summary: gcp-deployment-summary.md"
echo "2. Configure DNS records if needed"
echo "3. Set up SSL certificates for production"
echo "4. Configure backup and disaster recovery"
echo ""
echo -e "${YELLOW}🔍 Monitoring:${NC}"
echo "- Watch pods: kubectl get pods -n dytallix -w"
echo "- View logs: kubectl logs -f deployment/dytallix-bridge-node -n dytallix"
echo "- Check metrics: kubectl top pods -n dytallix"
echo ""

print_success "Complete GCP deployment finished successfully!"
