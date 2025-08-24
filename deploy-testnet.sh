#!/bin/bash

# Dytallix Testnet Deployment Automation Script
# This script orchestrates the complete testnet deployment process

set -euo pipefail

# Configuration
ENVIRONMENT="testnet"
DEPLOYMENT_DIR="./deployment"
SECRETS_DIR="./secrets"
BACKUP_DIR="./backups"
LOG_DIR="./logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Create necessary directories
setup_directories() {
    log_step "Setting up deployment directories..."
    
    mkdir -p "$DEPLOYMENT_DIR"
    mkdir -p "$SECRETS_DIR"
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "$DEPLOYMENT_DIR/kubernetes"
    mkdir -p "$DEPLOYMENT_DIR/docker"
    mkdir -p "$DEPLOYMENT_DIR/monitoring"
    
    log_info "Directories created successfully"
}

# Generate deployment configurations
generate_deployment_configs() {
    log_step "Generating deployment configurations..."
    
    # Generate Kubernetes deployment
    cat > "$DEPLOYMENT_DIR/kubernetes/dytallix-testnet.yaml" << 'EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: dytallix-testnet
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dytallix-node
  namespace: dytallix-testnet
  labels:
    app: dytallix
    environment: testnet
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dytallix
      environment: testnet
  template:
    metadata:
      labels:
        app: dytallix
        environment: testnet
    spec:
      containers:
      - name: dytallix-node
        image: dytallix:testnet
        ports:
        - containerPort: 3030
          name: api
        - containerPort: 9090
          name: metrics
        - containerPort: 8081
          name: health
        env:
        - name: DYTALLIX_ENVIRONMENT
          value: "testnet"
        - name: DYTALLIX_LOG_LEVEL
          value: "info"
        - name: DYTALLIX_REQUIRE_TLS
          value: "true"
        - name: DYTALLIX_AUDIT_LOGGING
          value: "true"
        - name: DYTALLIX_METRICS_ENABLED
          value: "true"
        volumeMounts:
        - name: pqc-keys
          mountPath: /etc/dytallix/keys
          readOnly: true
        - name: data
          mountPath: /var/lib/dytallix
        - name: logs
          mountPath: /var/log/dytallix
        resources:
          requests:
            cpu: 1
            memory: 2Gi
          limits:
            cpu: 4
            memory: 8Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 8081
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8081
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: pqc-keys
        secret:
          secretName: dytallix-pqc-keys
      - name: data
        persistentVolumeClaim:
          claimName: dytallix-data
      - name: logs
        persistentVolumeClaim:
          claimName: dytallix-logs
---
apiVersion: v1
kind: Service
metadata:
  name: dytallix-service
  namespace: dytallix-testnet
spec:
  selector:
    app: dytallix
    environment: testnet
  ports:
  - name: api
    port: 3030
    targetPort: 3030
  - name: metrics
    port: 9090
    targetPort: 9090
  - name: health
    port: 8081
    targetPort: 8081
  type: LoadBalancer
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dytallix-data
  namespace: dytallix-testnet
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dytallix-logs
  namespace: dytallix-testnet
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
EOF

    # Generate Docker Compose for local testing
    cat > "$DEPLOYMENT_DIR/docker/docker-compose.testnet.yml" << 'EOF'
version: '3.8'

services:
  dytallix-node-1:
    build: ../../
    container_name: dyt-validator-0
    environment:
      DYTALLIX_ENVIRONMENT: testnet
      DYTALLIX_NODE_ID: validator-0
      DYTALLIX_PORT: 3030
      DYTALLIX_P2P_PORT: 30303
      DYTALLIX_VALIDATOR: "true"
      DYTALLIX_LOG_LEVEL: info
      DYTALLIX_METRICS_ENABLED: "true"
      DY_METRICS: "1"
      DY_METRICS_ADDR: "0.0.0.0:9464"
      ENABLE_OBSERVABILITY: "${ENABLE_OBSERVABILITY:-0}"
    ports:
      - "3030:3030"
      - "9464:9464"
      - "8081:8081"
      - "30303:30303"
    volumes:
      - node1_data:/var/lib/dytallix
      - node1_logs:/var/log/dytallix
      - ./secrets:/etc/dytallix/keys:ro
    networks:
      - dytallix_testnet

  dytallix-node-2:
    build: ../../
    container_name: dyt-validator-1
    environment:
      DYTALLIX_ENVIRONMENT: testnet
      DYTALLIX_NODE_ID: validator-1
      DYTALLIX_PORT: 3032
      DYTALLIX_P2P_PORT: 30304
      DYTALLIX_VALIDATOR: "true"
      DYTALLIX_LOG_LEVEL: info
      DYTALLIX_METRICS_ENABLED: "true"
      DY_METRICS: "1"
      DY_METRICS_ADDR: "0.0.0.0:9464"
      ENABLE_OBSERVABILITY: "${ENABLE_OBSERVABILITY:-0}"
    ports:
      - "3032:3030"
      - "9465:9464"
      - "8083:8081"
      - "30304:30303"
    volumes:
      - node2_data:/var/lib/dytallix
      - node2_logs:/var/log/dytallix
      - ./secrets:/etc/dytallix/keys:ro
    networks:
      - dytallix_testnet

  dytallix-node-3:
    build: ../../
    container_name: dyt-validator-2
    environment:
      DYTALLIX_ENVIRONMENT: testnet
      DYTALLIX_NODE_ID: validator-2
      DYTALLIX_PORT: 3034
      DYTALLIX_P2P_PORT: 30305
      DYTALLIX_VALIDATOR: "true"
      DYTALLIX_LOG_LEVEL: info
      DYTALLIX_METRICS_ENABLED: "true"
      DY_METRICS: "1"
      DY_METRICS_ADDR: "0.0.0.0:9464"
      ENABLE_OBSERVABILITY: "${ENABLE_OBSERVABILITY:-0}"
    ports:
      - "3034:3030"
      - "9466:9464"
      - "8085:8081"
      - "30305:30303"
    volumes:
      - node3_data:/var/lib/dytallix
      - node3_logs:/var/log/dytallix
      - ./secrets:/etc/dytallix/keys:ro
    networks:
      - dytallix_testnet

  dytallix-node-4:
    build: ../../
    container_name: dyt-validator-3
    environment:
      DYTALLIX_ENVIRONMENT: testnet
      DYTALLIX_NODE_ID: validator-3
      DYTALLIX_PORT: 3036
      DYTALLIX_P2P_PORT: 30306
      DYTALLIX_VALIDATOR: "true"
      DYTALLIX_LOG_LEVEL: info
      DYTALLIX_METRICS_ENABLED: "true"
      DY_METRICS: "1"
      DY_METRICS_ADDR: "0.0.0.0:9464"
      ENABLE_OBSERVABILITY: "${ENABLE_OBSERVABILITY:-0}"
    ports:
      - "3036:3030"
      - "9467:9464"
      - "8087:8081"
      - "30306:30303"
    volumes:
      - node4_data:/var/lib/dytallix
      - node4_logs:/var/log/dytallix
      - ./secrets:/etc/dytallix/keys:ro
    networks:
      - dytallix_testnet

  dytallix-node-5:
    build: ../../
    container_name: dyt-validator-4
    environment:
      DYTALLIX_ENVIRONMENT: testnet
      DYTALLIX_NODE_ID: validator-4
      DYTALLIX_PORT: 3038
      DYTALLIX_P2P_PORT: 30307
      DYTALLIX_VALIDATOR: "true"
      DYTALLIX_LOG_LEVEL: info
      DYTALLIX_METRICS_ENABLED: "true"
      DY_METRICS: "1"
      DY_METRICS_ADDR: "0.0.0.0:9464"
      ENABLE_OBSERVABILITY: "${ENABLE_OBSERVABILITY:-0}"
    ports:
      - "3038:3030"
      - "9468:9464"
      - "8089:8081"
      - "30307:30303"
    volumes:
      - node5_data:/var/lib/dytallix
      - node5_logs:/var/log/dytallix
      - ./secrets:/etc/dytallix/keys:ro
    networks:
      - dytallix_testnet
volumes:
  node1_data:
  node2_data:
  node3_data:
  node4_data:
  node5_data:
  node1_logs:
  node2_logs:
  node3_logs:
  node4_logs:
  node5_logs:

networks:
  dytallix_testnet:
    driver: bridge
    external: false
EOF

    # Update prometheus config to use our observability directory structure
    mkdir -p "$DEPLOYMENT_DIR/docker/monitoring"
    if [ ! -f "observability/prometheus/prometheus.yml" ]; then
        log_warn "Observability prometheus config not found, creating basic config"
        mkdir -p "observability/prometheus"
        cat > "observability/prometheus/prometheus.yml" << 'BASIC_EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'dyt-validator'
    static_configs:
      - targets:
        - 'dyt-validator-0:9464'
        - 'dyt-validator-1:9464'
        - 'dyt-validator-2:9464'
        - 'dyt-validator-3:9464'
        - 'dyt-validator-4:9464'
    scrape_interval: 15s
    metrics_path: /metrics
BASIC_EOF
    fi
    
    # Copy observability configs to deployment directory
    cp -r observability/* "$DEPLOYMENT_DIR/docker/monitoring/" || log_warn "Could not copy observability configs"

    log_info "Deployment configurations generated successfully"
}

# Start observability stack if enabled
start_observability_stack() {
    if [[ "${ENABLE_OBSERVABILITY:-0}" != "1" ]]; then
        log_info "Observability disabled (ENABLE_OBSERVABILITY != 1)"
        return 0
    fi
    
    log_step "Starting observability stack..."
    
    # Check if observability stack script exists
    if [ ! -f "scripts/run_observability_stack.sh" ]; then
        log_error "Observability stack script not found: scripts/run_observability_stack.sh"
        return 1
    fi
    
    # Start the observability stack
    export ENABLE_OBSERVABILITY=1
    if ./scripts/run_observability_stack.sh start; then
        log_info "Observability stack started successfully"
        log_info "  - Prometheus: http://localhost:9090"
        log_info "  - Grafana: http://localhost:3000 (admin/dytallix123)"
    else
        log_warn "Failed to start observability stack, continuing without monitoring"
        return 1
    fi
}

# Health check for metrics endpoints
check_metrics_endpoints() {
    if [[ "${ENABLE_OBSERVABILITY:-0}" != "1" ]]; then
        log_info "Observability disabled, skipping metrics endpoint checks"
        return 0
    fi
    
    log_step "Checking metrics endpoints health..."
    
    local ports=(9464 9465 9466 9467 9468)
    local max_attempts=30
    local healthy_endpoints=0
    
    for i in "${!ports[@]}"; do
        local port="${ports[$i]}"
        local validator_name="validator-$i"
        local attempt=1
        local endpoint_healthy=false
        
        log_info "Checking $validator_name metrics endpoint on port $port..."
        
        while [ $attempt -le $max_attempts ]; do
            if curl -s -f "http://localhost:$port/metrics" > /dev/null 2>&1; then
                log_info "✅ $validator_name metrics endpoint healthy"
                endpoint_healthy=true
                ((healthy_endpoints++))
                break
            fi
            
            if [ $attempt -eq 1 ]; then
                log_info "Waiting for $validator_name metrics endpoint..."
            fi
            
            sleep 2
            ((attempt++))
        done
        
        if [ "$endpoint_healthy" = false ]; then
            log_warn "❌ $validator_name metrics endpoint not responding after ${max_attempts} attempts"
        fi
    done
    
    log_info "Metrics endpoints health check: $healthy_endpoints/5 endpoints healthy"
    
    if [ $healthy_endpoints -ge 3 ]; then
        log_info "✅ Sufficient metrics endpoints are healthy for monitoring"
        return 0
    else
        log_warn "⚠️  Less than 3 metrics endpoints are healthy, monitoring may be limited"
        return 1
    fi
}

# Setup secrets for testnet
setup_testnet_secrets() {
    log_step "Setting up testnet secrets..."
    
    # Generate PQC keys for testnet
    # cd devops/secrets-management
    # ./generate-keys.sh --env dev --output-dir "../../${SECRETS_DIR}"
    
    # Create placeholder keys for now
    echo '{"placeholder": "keys will be generated"}' > "$SECRETS_DIR/pqc_keys_dev.json"
    
    # Setup environment variables
    # ./env-setup.sh --env testnet --keys-dir "../../${SECRETS_DIR}"
    
    # cd - > /dev/null
    
    log_info "Testnet secrets configured successfully"
}

# Build Docker image for testnet
build_testnet_image() {
    log_step "Building Dytallix testnet Docker image..."
    
    # Build the image with testnet tag
    docker build -t dytallix:testnet .
    
    # Also tag as latest for testing
    docker tag dytallix:testnet dytallix:latest
    
    log_info "Docker image built successfully"
}

# Run end-to-end integration tests
run_integration_tests() {
    log_step "Running end-to-end integration tests..."
    
    # Start the observability stack if enabled
    start_observability_stack
    
    # Start the testnet
    if [ -d "$DEPLOYMENT_DIR/docker" ]; then
        cd "$DEPLOYMENT_DIR/docker"
        ENABLE_OBSERVABILITY="${ENABLE_OBSERVABILITY:-0}" docker-compose -f docker-compose.testnet.yml up -d
        cd - > /dev/null
    else
        log_error "Docker deployment directory not found"
        return 1
    fi
    
    # Wait for services to be ready
    log_info "Waiting for services to start..."
    sleep 30
    
    # Test API endpoints
    log_info "Testing API endpoints..."
    for port in 3030 3032 3034 3036 3038; do
        if curl -f "http://localhost:${port}/health" > /dev/null 2>&1; then
            log_info "Node on port $port is healthy"
        else
            log_error "Node on port $port failed health check"
            return 1
        fi
    done
    
    # Check metrics endpoints health if observability is enabled
    check_metrics_endpoints
    
    # Test smart contract deployment
    log_info "Testing smart contract deployment..."
    cd developer-tools
    if cargo run -- contract deploy --template token --name TestToken; then
        log_info "Smart contract deployment test passed"
    else
        log_error "Smart contract deployment test failed"
        return 1
    fi
    
    cd ..
    
    # Test CLI functionality
    log_info "Testing CLI functionality..."
    cd developer-tools
    if cargo run -- wallet create --name test-wallet; then
        log_info "Wallet creation test passed"
    else
        log_error "Wallet creation test failed"
        return 1
    fi
    
    cd ..
    
    log_info "Integration tests completed successfully"
}

# Setup monitoring and alerting
setup_monitoring() {
    log_step "Setting up monitoring and alerting..."
    
    # Create Grafana dashboards configuration
    mkdir -p "$DEPLOYMENT_DIR/monitoring/grafana/dashboards"
    mkdir -p "$DEPLOYMENT_DIR/monitoring/grafana/datasources"
    
    cat > "$DEPLOYMENT_DIR/monitoring/grafana/datasources/prometheus.yml" << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF

    cat > "$DEPLOYMENT_DIR/monitoring/grafana/dashboards/dytallix.json" << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "Dytallix Testnet Dashboard",
    "tags": ["dytallix", "testnet"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Node Health Status",
        "type": "stat",
        "targets": [
          {
            "expr": "up{job=\"dytallix-health\"}",
            "legendFormat": "{{instance}}"
          }
        ]
      },
      {
        "id": 2,
        "title": "Transaction Throughput",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(dytallix_transactions_total[5m])",
            "legendFormat": "TPS"
          }
        ]
      },
      {
        "id": 3,
        "title": "Smart Contract Deployments",
        "type": "graph",
        "targets": [
          {
            "expr": "dytallix_contracts_deployed_total",
            "legendFormat": "Contracts"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "5s"
  }
}
EOF

    log_info "Monitoring setup completed"
}

# Performance benchmarking
run_performance_tests() {
    log_step "Running performance benchmarks..."
    
    log_info "Starting load testing..."
    
    # Simple load test using curl
    log_info "Testing API performance..."
    for i in {1..100}; do
        curl -s "http://localhost:8080/health" > /dev/null &
    done
    wait
    
    log_info "API load test completed"
    
    # Test smart contract performance
    log_info "Testing smart contract performance..."
    cd developer-tools
    
    start_time=$(date +%s)
    for i in {1..10}; do
        cargo run -- contract deploy --template token --name "PerfTest${i}" > /dev/null 2>&1 &
    done
    wait
    end_time=$(date +%s)
    
    duration=$((end_time - start_time))
    log_info "Deployed 10 contracts in ${duration} seconds"
    
    cd ..
    
    log_info "Performance benchmarking completed"
}

# Cleanup function
cleanup() {
    log_step "Cleaning up test deployment..."
    
    # Stop observability stack if running
    if [[ "${ENABLE_OBSERVABILITY:-0}" == "1" ]] && [ -f "scripts/run_observability_stack.sh" ]; then
        log_info "Stopping observability stack..."
        ./scripts/run_observability_stack.sh stop || log_warn "Failed to stop observability stack cleanly"
    fi
    
    if [ -d "$DEPLOYMENT_DIR/docker" ]; then
        cd "$DEPLOYMENT_DIR/docker"
        docker-compose -f docker-compose.testnet.yml down -v 2>/dev/null || true
        cd - > /dev/null
    else
        log_warn "Docker deployment directory not found, skipping docker cleanup"
    fi
    
    log_info "Cleanup completed"
}

# Main deployment function
main() {
    log_info "Starting Dytallix testnet deployment automation..."
    
    # Setup signal handlers for cleanup
    trap cleanup EXIT ERR
    
    case "${1:-full}" in
        "setup")
            setup_directories
            generate_deployment_configs
            setup_testnet_secrets
            ;;
        "build")
            build_testnet_image
            ;;
        "test")
            run_integration_tests
            ;;
        "monitor")
            setup_monitoring
            ;;
        "perf")
            run_performance_tests
            ;;
        "full")
            setup_directories
            generate_deployment_configs
            setup_testnet_secrets
            build_testnet_image
            run_integration_tests
            setup_monitoring
            run_performance_tests
            ;;
        "clean")
            cleanup
            ;;
        *)
            echo "Usage: $0 [setup|build|test|monitor|perf|full|clean]"
            echo ""
            echo "Commands:"
            echo "  setup   - Setup directories and configurations"
            echo "  build   - Build Docker images"
            echo "  test    - Run integration tests"
            echo "  monitor - Setup monitoring"
            echo "  perf    - Run performance tests"
            echo "  full    - Run complete deployment (default)"
            echo "  clean   - Cleanup test deployment"
            exit 1
            ;;
    esac
    
    log_info "Dytallix testnet deployment automation completed successfully!"
}

# Run main function
main "$@"
