#!/bin/bash

# Dytallix Cross-Chain Bridge - Google Cloud Platform Setup Script
# This script sets up the complete GCP infrastructure for the bridge testnet

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="dytallix-testnet"
REGION="us-central1"
ZONE="us-central1-a"
CLUSTER_NAME="dytallix-bridge-cluster"
SERVICE_ACCOUNT_NAME="dytallix-bridge-sa"
SQL_INSTANCE_NAME="dytallix-bridge-db"
STORAGE_BUCKET_NAME="dytallix-bridge-storage"

echo -e "${BLUE}🚀 Starting Dytallix Cross-Chain Bridge GCP Deployment${NC}"
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
check_command "kubectl"
check_command "docker"

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1 > /dev/null; then
    print_error "You are not authenticated with Google Cloud. Please run 'gcloud auth login' first."
    exit 1
fi

print_success "Prerequisites check completed"

# Set project
print_step "2" "Setting up Google Cloud Project"
if gcloud projects describe $PROJECT_ID &>/dev/null; then
    echo "Project $PROJECT_ID already exists"
else
    echo "Creating project $PROJECT_ID..."
    gcloud projects create $PROJECT_ID --name="Dytallix Cross-Chain Bridge Testnet"
fi

gcloud config set project $PROJECT_ID
gcloud config set compute/region $REGION
gcloud config set compute/zone $ZONE
print_success "Project configuration completed"

# Enable APIs
print_step "3" "Enabling Required APIs"
apis=(
    "container.googleapis.com"
    "cloudsql.googleapis.com" 
    "storage.googleapis.com"
    "monitoring.googleapis.com"
    "logging.googleapis.com"
    "cloudresourcemanager.googleapis.com"
    "iam.googleapis.com"
    "compute.googleapis.com"
    "containerregistry.googleapis.com"
)

for api in "${apis[@]}"; do
    echo "Enabling $api..."
    gcloud services enable $api
done
print_success "All required APIs enabled"

# Create service account
print_step "4" "Creating Service Account"
if gcloud iam service-accounts describe "${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" &>/dev/null; then
    echo "Service account already exists"
else
    gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
        --description="Dytallix Bridge Service Account" \
        --display-name="Dytallix Bridge SA"
fi

# Assign roles to service account
roles=(
    "roles/container.admin"
    "roles/cloudsql.client" 
    "roles/storage.admin"
    "roles/monitoring.metricWriter"
    "roles/logging.logWriter"
)

for role in "${roles[@]}"; do
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
        --role="$role"
done
print_success "Service account created and configured"

# Create GKE cluster
print_step "5" "Creating GKE Cluster"
if gcloud container clusters describe $CLUSTER_NAME --zone=$ZONE &>/dev/null; then
    echo "Cluster already exists"
else
    echo "Creating GKE cluster..."
    gcloud container clusters create $CLUSTER_NAME \
        --zone=$ZONE \
        --machine-type=e2-standard-4 \
        --num-nodes=3 \
        --disk-size=100GB \
        --disk-type=pd-ssd \
        --enable-ip-alias \
        --enable-autoscaling \
        --min-nodes=3 \
        --max-nodes=10 \
        --enable-autorepair \
        --enable-autoupgrade \
        --service-account="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
        --addons=HorizontalPodAutoscaling,HttpLoadBalancing,GcePersistentDiskCsiDriver
fi

# Get cluster credentials
gcloud container clusters get-credentials $CLUSTER_NAME --zone=$ZONE
print_success "GKE cluster created and configured"

# Create Cloud SQL instance
print_step "6" "Creating Cloud SQL Instance"
if gcloud sql instances describe $SQL_INSTANCE_NAME &>/dev/null; then
    echo "Cloud SQL instance already exists"
else
    echo "Creating Cloud SQL instance..."
    gcloud sql instances create $SQL_INSTANCE_NAME \
        --database-version=POSTGRES_15 \
        --tier=db-custom-2-7680 \
        --region=$REGION \
        --storage-size=100GB \
        --storage-type=SSD \
        --storage-auto-increase \
        --backup-start-time=03:00 \
        --enable-bin-log \
        --maintenance-window-day=SUN \
        --maintenance-window-hour=04
fi

# Create database
echo "Creating bridge database..."
gcloud sql databases create bridge_db --instance=$SQL_INSTANCE_NAME || echo "Database may already exist"

print_success "Cloud SQL instance created"

# Create storage bucket
print_step "7" "Creating Cloud Storage Bucket"
if gsutil ls -b gs://$STORAGE_BUCKET_NAME &>/dev/null; then
    echo "Storage bucket already exists"
else
    gsutil mb -p $PROJECT_ID -c REGIONAL -l $REGION gs://$STORAGE_BUCKET_NAME
fi
print_success "Storage bucket created"

# Build and push Docker image
print_step "8" "Building and Pushing Docker Image"
echo "Building Dytallix bridge image..."
docker build -t gcr.io/$PROJECT_ID/dytallix-bridge:latest ../../

echo "Configuring Docker for GCR..."
gcloud auth configure-docker

echo "Pushing image to Google Container Registry..."
docker push gcr.io/$PROJECT_ID/dytallix-bridge:latest
print_success "Docker image built and pushed"

# Create Kubernetes secrets
print_step "9" "Creating Kubernetes Secrets"
echo "Creating PQC keys secret..."
kubectl create secret generic dytallix-pqc-keys \
    --from-file=../../deployment/docker/secrets/ \
    --namespace=dytallix-testnet || echo "Secret may already exist"

# Create namespace
kubectl create namespace dytallix-testnet || echo "Namespace may already exist"

print_success "Kubernetes secrets created"

# Deploy to GKE
print_step "10" "Deploying to GKE"
echo "Updating Kubernetes manifests for GCP..."

# Update the image in the Kubernetes manifest
sed "s|dytallix:testnet|gcr.io/$PROJECT_ID/dytallix-bridge:latest|g" \
    ../kubernetes/dytallix-testnet.yaml > /tmp/dytallix-gcp.yaml

echo "Deploying to Kubernetes..."
kubectl apply -f /tmp/dytallix-gcp.yaml

echo "Waiting for deployment to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/dytallix-node -n dytallix-testnet

print_success "Deployment to GKE completed"

# Get service information
print_step "11" "Getting Service Information"
echo "Waiting for external IP assignment..."
sleep 30

EXTERNAL_IP=$(kubectl get service dytallix-service -n dytallix-testnet -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
if [ -z "$EXTERNAL_IP" ]; then
    print_warning "External IP not yet assigned. Run the following command later to get it:"
    echo "kubectl get service dytallix-service -n dytallix-testnet"
else
    echo -e "${GREEN}🌐 Bridge API Endpoint: http://$EXTERNAL_IP:3030${NC}"
    echo -e "${GREEN}📊 Metrics Endpoint: http://$EXTERNAL_IP:9090${NC}"
    echo -e "${GREEN}🏥 Health Check: http://$EXTERNAL_IP:8081/health${NC}"
fi

# Create deployment summary
print_step "12" "Creating Deployment Summary"
cat > gcp-deployment-info.txt << EOF
Dytallix Cross-Chain Bridge - GCP Deployment Summary
====================================================

Project Details:
- Project ID: $PROJECT_ID
- Region: $REGION
- Zone: $ZONE

Infrastructure:
- GKE Cluster: $CLUSTER_NAME
- Cloud SQL: $SQL_INSTANCE_NAME
- Storage Bucket: gs://$STORAGE_BUCKET_NAME
- Service Account: ${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com

Container Image:
- Registry: gcr.io/$PROJECT_ID/dytallix-bridge:latest

Services:
- API Endpoint: http://$EXTERNAL_IP:3030 (may take a few minutes to be available)
- Metrics: http://$EXTERNAL_IP:9090
- Health Check: http://$EXTERNAL_IP:8081/health

Useful Commands:
- View pods: kubectl get pods -n dytallix-testnet
- View services: kubectl get services -n dytallix-testnet
- View logs: kubectl logs -f deployment/dytallix-node -n dytallix-testnet
- Scale deployment: kubectl scale deployment dytallix-node --replicas=5 -n dytallix-testnet

Cleanup Commands:
- Delete cluster: gcloud container clusters delete $CLUSTER_NAME --zone=$ZONE
- Delete SQL instance: gcloud sql instances delete $SQL_INSTANCE_NAME
- Delete bucket: gsutil rm -r gs://$STORAGE_BUCKET_NAME
- Delete project: gcloud projects delete $PROJECT_ID

EOF

print_success "Deployment summary created: gcp-deployment-info.txt"

echo ""
echo -e "${GREEN}🎉 Dytallix Cross-Chain Bridge successfully deployed to Google Cloud!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Wait a few minutes for the external IP to be assigned"
echo "2. Test the health endpoint: curl http://\$EXTERNAL_IP:8081/health"
echo "3. Run bridge verification tests against the deployed endpoints"
echo "4. Configure DNS if needed for production use"
echo ""
echo -e "${YELLOW}📝 Important:${NC}"
echo "- Monitor the deployment: kubectl get pods -n dytallix-testnet -w"
echo "- View logs: kubectl logs -f deployment/dytallix-node -n dytallix-testnet"
echo "- Access monitoring via Google Cloud Console"
echo ""

print_success "GCP deployment script completed successfully!"
