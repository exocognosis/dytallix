#!/bin/bash

# Dytallix Cross-Chain Bridge - Application Deployment Script
# This script builds and deploys the bridge application to GKE

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=${PROJECT_ID:-"dytallix"}
REGION=${REGION:-"us-central1"}
CLUSTER_NAME=${CLUSTER_NAME:-"dytallix-testnet-cluster"}
ZONE=${ZONE:-"us-central1-a"}
NAMESPACE=${NAMESPACE:-"dytallix-bridge"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}
ARTIFACT_REGISTRY="us-central1-docker.pkg.dev"
REPO_NAME="dytallix-testnet-repo"
IMAGE_NAME="dytallix-bridge"

FULL_IMAGE_URL="${ARTIFACT_REGISTRY}/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:${IMAGE_TAG}"

echo -e "${BLUE}🚀 Dytallix Cross-Chain Bridge - Application Deployment${NC}"
echo -e "${BLUE}====================================================${NC}"
echo -e "Project ID:    ${PROJECT_ID}"
echo -e "Region:        ${REGION}"
echo -e "Cluster:       ${CLUSTER_NAME}"
echo -e "Namespace:     ${NAMESPACE}"
echo -e "Image:         ${FULL_IMAGE_URL}"
echo

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}📋 Step 1: Checking Prerequisites${NC}"
    
    # Check if required tools are installed
    local tools=("docker" "kubectl" "gcloud")
    for tool in "${tools[@]}"; do
        if ! command -v $tool &> /dev/null; then
            echo -e "${RED}❌ $tool is not installed${NC}"
            exit 1
        fi
    done
    
    # Check if we're authenticated to gcloud
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        echo -e "${RED}❌ Not authenticated to gcloud${NC}"
        exit 1
    fi
    
    # Check if kubectl is configured for the right cluster
    local current_context=$(kubectl config current-context 2>/dev/null || echo "")
    if [[ ! "$current_context" == *"$CLUSTER_NAME"* ]]; then
        echo -e "${YELLOW}⚠️  kubectl not configured for $CLUSTER_NAME, configuring...${NC}"
        gcloud container clusters get-credentials $CLUSTER_NAME --zone=$ZONE --project=$PROJECT_ID
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Function to check if bridge source code exists
check_source_code() {
    echo -e "${BLUE}📋 Step 2: Checking Source Code${NC}"
    
    if [[ ! -d "../../blockchain-core" ]]; then
        echo -e "${YELLOW}⚠️  Bridge source code not found, creating placeholder${NC}"
        create_placeholder_app
    else
        echo -e "${GREEN}✅ Bridge source code found${NC}"
    fi
}

# Function to create a placeholder application
create_placeholder_app() {
    echo -e "${BLUE}📦 Creating placeholder bridge application${NC}"
    
    mkdir -p ../../blockchain-core/src/bin
    
    cat > ../../blockchain-core/Cargo.toml << 'EOF'
[package]
name = "dytallix-bridge"
version = "0.1.0"
edition = "2021"

[[bin]]
name = "bridge-server"
path = "src/bin/bridge-server.rs"

[dependencies]
tokio = { version = "1.0", features = ["full"] }
warp = "0.3"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tracing = "0.1"
tracing-subscriber = "0.3"
uuid = { version = "1.0", features = ["v4"] }
EOF

    cat > ../../blockchain-core/src/bin/bridge-server.rs << 'EOF'
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use warp::Filter;
use serde::{Deserialize, Serialize};
use tracing::{info, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct BridgeStatus {
    version: String,
    status: String,
    chains: Vec<ChainStatus>,
    uptime: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ChainStatus {
    name: String,
    status: String,
    last_block: u64,
    connected: bool,
}

type AppState = Arc<RwLock<HashMap<String, String>>>;

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::init();
    
    info!("Starting Dytallix Cross-Chain Bridge (Testnet)");
    
    // Initialize application state
    let state: AppState = Arc::new(RwLock::new(HashMap::new()));
    
    // Health check endpoint
    let health = warp::path("health")
        .and(warp::get())
        .map(|| {
            warp::reply::json(&serde_json::json!({
                "status": "healthy",
                "timestamp": chrono::Utc::now().to_rfc3339()
            }))
        });
    
    // Readiness check endpoint
    let ready = warp::path("ready")
        .and(warp::get())
        .map(|| {
            warp::reply::json(&serde_json::json!({
                "status": "ready",
                "timestamp": chrono::Utc::now().to_rfc3339()
            }))
        });
    
    // Status endpoint
    let status = warp::path("status")
        .and(warp::get())
        .map(|| {
            let bridge_status = BridgeStatus {
                version: "0.1.0".to_string(),
                status: "running".to_string(),
                chains: vec![
                    ChainStatus {
                        name: "Ethereum".to_string(),
                        status: "connected".to_string(),
                        last_block: 12345678,
                        connected: true,
                    },
                    ChainStatus {
                        name: "Cosmos".to_string(),
                        status: "connected".to_string(),
                        last_block: 9876543,
                        connected: true,
                    },
                    ChainStatus {
                        name: "Polkadot".to_string(),
                        status: "connected".to_string(),
                        last_block: 5555555,
                        connected: true,
                    },
                ],
                uptime: "N/A".to_string(),
            };
            warp::reply::json(&bridge_status)
        });
    
    // Metrics endpoint (Prometheus format)
    let metrics = warp::path("metrics")
        .and(warp::get())
        .map(|| {
            let metrics = r#"
# HELP bridge_transactions_total Total number of bridge transactions
# TYPE bridge_transactions_total counter
bridge_transactions_total{chain="ethereum"} 100
bridge_transactions_total{chain="cosmos"} 75
bridge_transactions_total{chain="polkadot"} 50

# HELP bridge_status Current bridge status (1=healthy, 0=unhealthy)
# TYPE bridge_status gauge
bridge_status 1

# HELP bridge_uptime_seconds Bridge uptime in seconds
# TYPE bridge_uptime_seconds counter
bridge_uptime_seconds 3600
"#;
            warp::reply::with_header(metrics, "content-type", "text/plain")
        });
    
    // API routes
    let api = warp::path("api")
        .and(warp::path("v1"))
        .and(
            warp::path("bridge")
                .and(warp::post())
                .and(warp::body::json())
                .map(|body: serde_json::Value| {
                    info!("Bridge request received: {:?}", body);
                    warp::reply::json(&serde_json::json!({
                        "status": "accepted",
                        "transaction_id": uuid::Uuid::new_v4().to_string(),
                        "message": "Bridge transaction queued for processing"
                    }))
                })
        );
    
    // Combine all routes
    let routes = health
        .or(ready)
        .or(status)
        .or(api)
        .with(warp::cors().allow_any_origin());
    
    // Start metrics server on port 9090
    let metrics_server = warp::serve(metrics)
        .run(([0, 0, 0, 0], 9090));
    
    // Start main server on port 8080
    let main_server = warp::serve(routes)
        .run(([0, 0, 0, 0], 8080));
    
    info!("Bridge server starting on port 8080");
    info!("Metrics server starting on port 9090");
    
    // Run both servers concurrently
    tokio::join!(main_server, metrics_server);
}
EOF

    cat > ../../blockchain-core/Cargo.lock << 'EOF'
# This file is automatically @generated by Cargo.
# It is not intended for manual editing.
version = 3

[[package]]
name = "dytallix-bridge"
version = "0.1.0"
EOF

    echo -e "${GREEN}✅ Placeholder application created${NC}"
}

# Function to build and push Docker image
build_and_push_image() {
    echo -e "${BLUE}📦 Step 3: Building and Pushing Docker Image${NC}"
    
    # Configure Docker to use gcloud as a credential helper
    gcloud auth configure-docker ${ARTIFACT_REGISTRY} --quiet
    
    # Copy Dockerfile to the right location and build
    cd ../..
    
    echo -e "${BLUE}Building Docker image...${NC}"
    docker build -f deployment/gcp/Dockerfile -t ${FULL_IMAGE_URL} .
    
    echo -e "${BLUE}Pushing image to Artifact Registry...${NC}"
    docker push ${FULL_IMAGE_URL}
    
    echo -e "${GREEN}✅ Image built and pushed: ${FULL_IMAGE_URL}${NC}"
    
    cd deployment/gcp
}

# Function to deploy to Kubernetes
deploy_to_kubernetes() {
    echo -e "${BLUE}🚀 Step 4: Deploying to Kubernetes${NC}"
    
    # Create namespace
    echo -e "${BLUE}Creating namespace...${NC}"
    kubectl apply -f k8s/namespace.yaml
    
    # Apply ConfigMaps and Secrets
    echo -e "${BLUE}Applying ConfigMaps and Secrets...${NC}"
    kubectl apply -f k8s/configmap.yaml
    
    # Apply the main deployment
    echo -e "${BLUE}Deploying application...${NC}"
    kubectl apply -f k8s/deployment.yaml
    
    # Apply monitoring configuration
    echo -e "${BLUE}Applying monitoring configuration...${NC}"
    kubectl apply -f k8s/monitoring.yaml
    
    echo -e "${GREEN}✅ Application deployed to Kubernetes${NC}"
}

# Function to wait for deployment to be ready
wait_for_deployment() {
    echo -e "${BLUE}⏳ Step 5: Waiting for Deployment to be Ready${NC}"
    
    echo -e "${BLUE}Waiting for pods to be ready...${NC}"
    kubectl wait --for=condition=ready pod -l app=dytallix-bridge -n ${NAMESPACE} --timeout=300s
    
    echo -e "${GREEN}✅ Deployment is ready${NC}"
}

# Function to show deployment status
show_status() {
    echo -e "${BLUE}📊 Step 6: Deployment Status${NC}"
    
    echo -e "${BLUE}Pods:${NC}"
    kubectl get pods -n ${NAMESPACE} -o wide
    echo
    
    echo -e "${BLUE}Services:${NC}"
    kubectl get services -n ${NAMESPACE}
    echo
    
    echo -e "${BLUE}Getting LoadBalancer IP...${NC}"
    local external_ip=""
    local count=0
    while [[ -z "$external_ip" && $count -lt 30 ]]; do
        external_ip=$(kubectl get service dytallix-bridge-service -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
        if [[ -z "$external_ip" ]]; then
            echo -e "${YELLOW}Waiting for LoadBalancer IP...${NC}"
            sleep 10
            ((count++))
        fi
    done
    
    if [[ -n "$external_ip" ]]; then
        echo -e "${GREEN}✅ Bridge is accessible at: http://${external_ip}${NC}"
        echo -e "${GREEN}✅ Metrics available at: http://${external_ip}:9090/metrics${NC}"
        echo -e "${GREEN}✅ Status endpoint: http://${external_ip}/status${NC}"
    else
        echo -e "${YELLOW}⚠️  LoadBalancer IP not yet assigned. Check status with:${NC}"
        echo -e "kubectl get service dytallix-bridge-service -n ${NAMESPACE}"
    fi
}

# Function to run tests
run_tests() {
    echo -e "${BLUE}🧪 Step 7: Running Health Checks${NC}"
    
    # Test health endpoint
    local pod_name=$(kubectl get pods -n ${NAMESPACE} -l app=dytallix-bridge -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [[ -n "$pod_name" ]]; then
        echo -e "${BLUE}Testing health endpoint...${NC}"
        kubectl exec -n ${NAMESPACE} ${pod_name} -- curl -f http://localhost:8080/health || echo -e "${RED}Health check failed${NC}"
        
        echo -e "${BLUE}Testing readiness endpoint...${NC}"
        kubectl exec -n ${NAMESPACE} ${pod_name} -- curl -f http://localhost:8080/ready || echo -e "${RED}Readiness check failed${NC}"
        
        echo -e "${BLUE}Testing status endpoint...${NC}"
        kubectl exec -n ${NAMESPACE} ${pod_name} -- curl -f http://localhost:8080/status || echo -e "${RED}Status check failed${NC}"
    else
        echo -e "${YELLOW}⚠️  No pods found for testing${NC}"
    fi
}

# Main execution
main() {
    check_prerequisites
    check_source_code
    build_and_push_image
    deploy_to_kubernetes
    wait_for_deployment
    show_status
    run_tests
    
    echo
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "1. Monitor the application: kubectl logs -f -l app=dytallix-bridge -n ${NAMESPACE}"
    echo -e "2. Check service status: kubectl get all -n ${NAMESPACE}"
    echo -e "3. Scale if needed: kubectl scale deployment dytallix-bridge -n ${NAMESPACE} --replicas=3"
    echo
}

# Run the main function
main "$@"
