#!/bin/bash

# Dytallix Cross-Chain Bridge - GCP Environment Setup Script
# This script creates the necessary secrets and configurations for GCP deployment

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ID=${PROJECT_ID:-"dytallix"}
NAMESPACE="dytallix"

echo -e "${BLUE}🔐 Setting up Dytallix Bridge Environment for GCP${NC}"
echo "Project ID: $PROJECT_ID"
echo "Namespace: $NAMESPACE"
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

# Function to prompt for input with default
prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    
    echo -n "$prompt [$default]: "
    read input
    if [ -z "$input" ]; then
        eval "$var_name=\"$default\""
    else
        eval "$var_name=\"$input\""
    fi
}

print_step "1" "Gathering Configuration"

# Database configuration
echo "Database Configuration:"
prompt_with_default "Database Host" "localhost" "DB_HOST"
prompt_with_default "Database Port" "5432" "DB_PORT"
prompt_with_default "Database Name" "bridge_db" "DB_NAME"
prompt_with_default "Database User" "dytallix" "DB_USER"
prompt_with_default "Database Password" "$(openssl rand -base64 32)" "DB_PASSWORD"

# Ethereum configuration
echo ""
echo "Ethereum Configuration:"
prompt_with_default "Ethereum RPC URL (Sepolia)" "https://sepolia.infura.io/v3/YOUR_PROJECT_ID" "ETH_RPC_URL"
prompt_with_default "Ethereum Private Key (without 0x)" "" "ETH_PRIVATE_KEY"
prompt_with_default "Ethereum Contract Address" "" "ETH_CONTRACT_ADDRESS"

# Cosmos configuration
echo ""
echo "Cosmos Configuration:"
prompt_with_default "Cosmos RPC URL" "https://rpc-cosmoshub.keplr.app" "COSMOS_RPC_URL"
prompt_with_default "Cosmos Mnemonic" "" "COSMOS_MNEMONIC"
prompt_with_default "Cosmos Contract Address" "" "COSMOS_CONTRACT_ADDRESS"

# Polkadot configuration
echo ""
echo "Polkadot Configuration:"
prompt_with_default "Polkadot RPC URL" "wss://westend-rpc.polkadot.io" "POLKADOT_RPC_URL"
prompt_with_default "Polkadot Private Key" "" "POLKADOT_PRIVATE_KEY"

# Additional configuration
echo ""
echo "Additional Configuration:"
prompt_with_default "Bridge Fee (in basis points)" "10" "BRIDGE_FEE"
prompt_with_default "Min Confirmation Blocks" "12" "MIN_CONFIRMATIONS"
prompt_with_default "Max Transfer Amount" "1000000" "MAX_TRANSFER_AMOUNT"

print_success "Configuration collected"

# Create database URL
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

print_step "2" "Creating Kubernetes Secrets"

# Create bridge secrets
cat <<EOF > /tmp/bridge-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: dytallix-bridge-secrets
  namespace: $NAMESPACE
type: Opaque
data:
  database-url: $(echo -n "$DATABASE_URL" | base64 -w 0)
  ethereum-rpc-url: $(echo -n "$ETH_RPC_URL" | base64 -w 0)
  ethereum-private-key: $(echo -n "$ETH_PRIVATE_KEY" | base64 -w 0)
  ethereum-contract-address: $(echo -n "$ETH_CONTRACT_ADDRESS" | base64 -w 0)
  cosmos-rpc-url: $(echo -n "$COSMOS_RPC_URL" | base64 -w 0)
  cosmos-mnemonic: $(echo -n "$COSMOS_MNEMONIC" | base64 -w 0)
  cosmos-contract-address: $(echo -n "$COSMOS_CONTRACT_ADDRESS" | base64 -w 0)
  polkadot-rpc-url: $(echo -n "$POLKADOT_RPC_URL" | base64 -w 0)
  polkadot-private-key: $(echo -n "$POLKADOT_PRIVATE_KEY" | base64 -w 0)
  bridge-fee: $(echo -n "$BRIDGE_FEE" | base64 -w 0)
  min-confirmations: $(echo -n "$MIN_CONFIRMATIONS" | base64 -w 0)
  max-transfer-amount: $(echo -n "$MAX_TRANSFER_AMOUNT" | base64 -w 0)
EOF

# Apply the secrets
kubectl apply -f /tmp/bridge-secrets.yaml
print_success "Bridge secrets created"

print_step "3" "Creating Bridge Configuration"

# Update the bridge configuration
cat <<EOF > /tmp/bridge-config-update.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dytallix-bridge-config
  namespace: $NAMESPACE
data:
  bridge.toml: |
    [bridge]
    name = "dytallix"
    environment = "testnet"
    fee_basis_points = $BRIDGE_FEE
    max_transfer_amount = $MAX_TRANSFER_AMOUNT
    
    [ethereum]
    chain_id = 11155111  # Sepolia testnet
    confirmation_blocks = $MIN_CONFIRMATIONS
    gas_limit = 500000
    contract_address = "$ETH_CONTRACT_ADDRESS"
    
    [cosmos]
    chain_id = "cosmoshub-4"
    gas_limit = 200000
    contract_address = "$COSMOS_CONTRACT_ADDRESS"
    
    [polkadot]
    chain_id = "westend"
    
    [security]
    pqc_enabled = true
    audit_logging = true
    require_tls = true
    
    [monitoring]
    metrics_enabled = true
    health_check_interval = 30
    
    [database]
    max_connections = 20
    connection_timeout = 30
    
  logging.yaml: |
    level: info
    format: json
    output: stdout
    
    loggers:
      bridge: info
      ethereum: debug
      cosmos: debug
      polkadot: info
      pqc: info
      database: info
EOF

kubectl apply -f /tmp/bridge-config-update.yaml
print_success "Bridge configuration updated"

print_step "4" "Setting up Cloud SQL Proxy (if using Cloud SQL)"

if [[ "$DB_HOST" == *"cloudsql"* ]] || [[ "$DB_HOST" == *"google"* ]]; then
    echo "Detected Cloud SQL configuration. Setting up Cloud SQL Proxy..."
    
    # Create Cloud SQL Proxy deployment
    cat <<EOF > /tmp/cloudsql-proxy.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cloudsql-proxy
  namespace: $NAMESPACE
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cloudsql-proxy
  template:
    metadata:
      labels:
        app: cloudsql-proxy
    spec:
      containers:
      - name: cloudsql-proxy
        image: gcr.io/cloudsql-docker/gce-proxy:1.33.2
        command:
          - "/cloud_sql_proxy"
          - "-instances=${PROJECT_ID}:${REGION}:${SQL_INSTANCE_NAME}=tcp:0.0.0.0:5432"
        ports:
        - containerPort: 5432
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
---
apiVersion: v1
kind: Service
metadata:
  name: cloudsql-proxy
  namespace: $NAMESPACE
spec:
  ports:
  - port: 5432
    targetPort: 5432
  selector:
    app: cloudsql-proxy
EOF
    
    kubectl apply -f /tmp/cloudsql-proxy.yaml
    print_success "Cloud SQL Proxy deployed"
else
    print_warning "Not using Cloud SQL. Skipping Cloud SQL Proxy setup."
fi

print_step "5" "Creating Environment File for Local Development"

# Create .env file for local development/testing
cat <<EOF > gcp.env
# Dytallix Bridge Environment Configuration for GCP
# Generated on $(date)

# Project Configuration
PROJECT_ID=$PROJECT_ID
DYTALLIX_ENVIRONMENT=testnet
DYTALLIX_CLOUD_PROVIDER=gcp

# Database Configuration
DATABASE_URL=$DATABASE_URL
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER

# Ethereum Configuration
ETHEREUM_RPC_URL=$ETH_RPC_URL
ETHEREUM_CONTRACT_ADDRESS=$ETH_CONTRACT_ADDRESS

# Cosmos Configuration
COSMOS_RPC_URL=$COSMOS_RPC_URL
COSMOS_CONTRACT_ADDRESS=$COSMOS_CONTRACT_ADDRESS

# Polkadot Configuration
POLKADOT_RPC_URL=$POLKADOT_RPC_URL

# Bridge Configuration
BRIDGE_FEE=$BRIDGE_FEE
MIN_CONFIRMATIONS=$MIN_CONFIRMATIONS
MAX_TRANSFER_AMOUNT=$MAX_TRANSFER_AMOUNT

# Monitoring
DYTALLIX_METRICS_ENABLED=true
DYTALLIX_LOG_LEVEL=info
EOF

print_success "Environment file created: gcp.env"

print_step "6" "Creating Verification Script"

# Create verification script
cat <<'EOF' > verify-gcp-deployment.sh
#!/bin/bash

# Dytallix Bridge GCP Deployment Verification Script

set -e

NAMESPACE="dytallix"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 Verifying Dytallix Bridge GCP Deployment..."
echo ""

# Check namespace
echo -n "Checking namespace... "
if kubectl get namespace $NAMESPACE &>/dev/null; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
    exit 1
fi

# Check deployment
echo -n "Checking deployment... "
if kubectl get deployment dytallix-bridge-node -n $NAMESPACE &>/dev/null; then
    READY=$(kubectl get deployment dytallix-bridge-node -n $NAMESPACE -o jsonpath='{.status.readyReplicas}')
    DESIRED=$(kubectl get deployment dytallix-bridge-node -n $NAMESPACE -o jsonpath='{.spec.replicas}')
    if [ "$READY" = "$DESIRED" ]; then
        echo -e "${GREEN}✅ ($READY/$DESIRED ready)${NC}"
    else
        echo -e "${YELLOW}⚠️  ($READY/$DESIRED ready)${NC}"
    fi
else
    echo -e "${RED}❌${NC}"
fi

# Check service
echo -n "Checking service... "
if kubectl get service dytallix-bridge-service -n $NAMESPACE &>/dev/null; then
    EXTERNAL_IP=$(kubectl get service dytallix-bridge-service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    if [ -n "$EXTERNAL_IP" ]; then
        echo -e "${GREEN}✅ (External IP: $EXTERNAL_IP)${NC}"
    else
        echo -e "${YELLOW}⚠️  (External IP pending)${NC}"
    fi
else
    echo -e "${RED}❌${NC}"
fi

# Check secrets
echo -n "Checking secrets... "
if kubectl get secret dytallix-bridge-secrets -n $NAMESPACE &>/dev/null && \
   kubectl get secret dytallix-pqc-keys -n $NAMESPACE &>/dev/null; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
fi

# Check pods
echo "Checking pods:"
kubectl get pods -n $NAMESPACE

# Check logs
echo ""
echo "Recent logs from bridge nodes:"
kubectl logs -n $NAMESPACE -l app=dytallix-bridge --tail=10

# Test health endpoint
echo ""
echo -n "Testing health endpoint... "
if [ -n "$EXTERNAL_IP" ]; then
    if curl -s -f "http://$EXTERNAL_IP:8081/health" > /dev/null; then
        echo -e "${GREEN}✅${NC}"
    else
        echo -e "${RED}❌ (Health check failed)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  (No external IP yet)${NC}"
fi

echo ""
echo "🎉 Verification complete!"
EOF

chmod +x verify-gcp-deployment.sh
print_success "Verification script created: verify-gcp-deployment.sh"

# Clean up temporary files
rm -f /tmp/bridge-secrets.yaml /tmp/bridge-config-update.yaml /tmp/cloudsql-proxy.yaml

echo ""
echo -e "${GREEN}🎉 GCP Environment Setup Complete!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Review the configuration in gcp.env"
echo "2. Run the GCP deployment script: ./deploy-to-gcp.sh"
echo "3. Verify the deployment: ./verify-gcp-deployment.sh"
echo "4. Monitor the deployment: kubectl get pods -n $NAMESPACE -w"
echo ""
echo -e "${YELLOW}📝 Important Files Created:${NC}"
echo "- gcp.env (environment configuration)"
echo "- verify-gcp-deployment.sh (verification script)"
echo ""
echo -e "${YELLOW}🔐 Security Notes:${NC}"
echo "- Private keys and mnemonics are stored as Kubernetes secrets"
echo "- Review and update the configuration as needed"
echo "- Ensure proper access controls are in place"
echo ""

print_success "Environment setup completed successfully!"
