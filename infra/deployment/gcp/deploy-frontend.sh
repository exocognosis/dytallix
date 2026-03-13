#!/bin/bash

# Dytallix Frontend - Google Cloud Platform Deployment Script
# This script builds and deploys the frontend to GCP

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="dytallix"
REGION="us-central1"
ZONE="us-central1-a"
CLUSTER_NAME="dytallix-testnet-cluster"
FRONTEND_IMAGE_NAME="dytallix-frontend"
FRONTEND_SERVICE_NAME="dytallix-frontend"

echo -e "${BLUE}🚀 Starting Dytallix Frontend GCP Deployment${NC}"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
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

# Check required tools
print_step "1" "Checking required tools"
check_command "gcloud"
check_command "kubectl"
check_command "docker"
print_success "All required tools are installed"

# Authenticate with GCP
print_step "2" "Setting up GCP authentication"
gcloud auth configure-docker gcr.io
gcloud config set project $PROJECT_ID
print_success "GCP authentication configured"

# Get cluster credentials
print_step "3" "Getting cluster credentials"
gcloud container clusters get-credentials $CLUSTER_NAME --zone $ZONE --project $PROJECT_ID
print_success "Cluster credentials obtained"

# Build frontend locally first
print_step "4" "Building frontend locally"
cd ../../frontend
npm install
npm run build
cd ../deployment/gcp
print_success "Frontend built successfully"

# Build Docker image
print_step "5" "Building Docker image for frontend"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
IMAGE_TAG="gcr.io/$PROJECT_ID/$FRONTEND_IMAGE_NAME:$TIMESTAMP"
LATEST_TAG="gcr.io/$PROJECT_ID/$FRONTEND_IMAGE_NAME:latest"

docker build -f Dockerfile.frontend -t $IMAGE_TAG -t $LATEST_TAG ../../
print_success "Docker image built: $IMAGE_TAG"

# Push Docker image to GCR
print_step "6" "Pushing Docker image to Google Container Registry"
docker push $IMAGE_TAG
docker push $LATEST_TAG
print_success "Docker image pushed to GCR"

# Create namespace if it doesn't exist
print_step "7" "Creating Kubernetes namespace"
kubectl create namespace dytallix --dry-run=client -o yaml | kubectl apply -f -
print_success "Namespace created/verified"

# Deploy to Kubernetes
print_step "8" "Deploying frontend to Kubernetes"
kubectl apply -f k8s/dytallix-frontend.yaml
print_success "Frontend deployed to Kubernetes"

# Wait for deployment to be ready
print_step "9" "Waiting for deployment to be ready"
kubectl wait --for=condition=available --timeout=300s deployment/dytallix-frontend -n dytallix
print_success "Frontend deployment is ready"

# Get service information
print_step "10" "Getting service information"
echo ""
echo -e "${GREEN}🎉 Frontend Deployment Complete!${NC}"
echo ""
echo "Service Status:"
kubectl get service dytallix-frontend-service -n dytallix
echo ""
echo "Ingress Status:"
kubectl get ingress dytallix-frontend-ingress -n dytallix
echo ""
echo "Pod Status:"
kubectl get pods -l app=dytallix-frontend -n dytallix
echo ""

# Get external IP
EXTERNAL_IP=$(kubectl get ingress dytallix-frontend-ingress -n dytallix -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "Pending")

if [ "$EXTERNAL_IP" != "Pending" ] && [ "$EXTERNAL_IP" != "" ]; then
    echo -e "${GREEN}🌐 Frontend is accessible at: http://$EXTERNAL_IP${NC}"
else
    echo -e "${YELLOW}⏳ External IP is still being assigned. Run the following command to check:${NC}"
    echo "kubectl get ingress dytallix-frontend-ingress -n dytallix"
fi

echo ""
echo -e "${GREEN}📝 To check logs:${NC}"
echo "kubectl logs -l app=dytallix-frontend -n dytallix"
echo ""
echo -e "${GREEN}🔧 To update the deployment:${NC}"
echo "kubectl set image deployment/dytallix-frontend frontend=$IMAGE_TAG -n dytallix"
echo ""

print_success "Dytallix Frontend deployment completed successfully!"
