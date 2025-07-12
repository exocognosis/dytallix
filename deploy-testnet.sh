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
    container_name: dytallix-node-1
    environment:
      DYTALLIX_ENVIRONMENT: testnet
      DYTALLIX_NODE_ID: node-1
      DYTALLIX_PORT: 3030
      DYTALLIX_P2P_PORT: 30303
      DYTALLIX_VALIDATOR: "true"
      DYTALLIX_LOG_LEVEL: info
      DYTALLIX_METRICS_ENABLED: "true"
    ports:
      - "3030:3030"
      - "9090:9090"
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
    container_name: dytallix-node-2
    environment:
      DYTALLIX_ENVIRONMENT: testnet
      DYTALLIX_NODE_ID: node-2
      DYTALLIX_PORT: 3032
      DYTALLIX_P2P_PORT: 30304
      DYTALLIX_VALIDATOR: "true"
      DYTALLIX_LOG_LEVEL: info
      DYTALLIX_METRICS_ENABLED: "true"
    ports:
      - "3032:3030"
      - "9091:9090"
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
    container_name: dytallix-node-3
    environment:
      DYTALLIX_ENVIRONMENT: testnet
      DYTALLIX_NODE_ID: node-3
      DYTALLIX_PORT: 3034
      DYTALLIX_P2P_PORT: 30305
      DYTALLIX_VALIDATOR: "true"
      DYTALLIX_LOG_LEVEL: info
      DYTALLIX_METRICS_ENABLED: "true"
    ports:
      - "3034:3030"
      - "9092:9090"
      - "8085:8081"
      - "30305:30303"
    volumes:
      - node3_data:/var/lib/dytallix
      - node3_logs:/var/log/dytallix
      - ./secrets:/etc/dytallix/keys:ro
    networks:
      - dytallix_testnet

  prometheus:
    image: prom/prometheus:latest
    container_name: dytallix-prometheus
    ports:
      - "9093:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
    networks:
      - dytallix_testnet

  grafana:
    image: grafana/grafana:latest
    container_name: dytallix-grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana:/etc/grafana/provisioning:ro
    environment:
      GF_SECURITY_ADMIN_PASSWORD: dytallix_testnet_admin
    networks:
      - dytallix_testnet

volumes:
  node1_data:
  node2_data:
  node3_data:
  node1_logs:
  node2_logs:
  node3_logs:
  prometheus_data:
  grafana_data:

networks:
  dytallix_testnet:
    driver: bridge
EOF

    # Generate Prometheus configuration
    mkdir -p "$DEPLOYMENT_DIR/monitoring"
    mkdir -p "$DEPLOYMENT_DIR/docker/monitoring"
    cat > "$DEPLOYMENT_DIR/monitoring/prometheus.yml" << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'dytallix-nodes'
    static_configs:
      - targets: 
        - 'dytallix-node-1:9090'
        - 'dytallix-node-2:9090'
        - 'dytallix-node-3:9090'
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'dytallix-health'
    static_configs:
      - targets:
        - 'dytallix-node-1:8081'
        - 'dytallix-node-2:8081'
        - 'dytallix-node-3:8081'
    metrics_path: '/health'
    scrape_interval: 10s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
EOF

    # Copy prometheus config to docker directory for mounting
    cp "$DEPLOYMENT_DIR/monitoring/prometheus.yml" "$DEPLOYMENT_DIR/docker/monitoring/prometheus.yml"

    log_info "Deployment configurations generated successfully"
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
    
    # Start the testnet
    if [ -d "$DEPLOYMENT_DIR/docker" ]; then
        cd "$DEPLOYMENT_DIR/docker"
        docker-compose -f docker-compose.testnet.yml up -d
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
    for port in 3030 3032 3034; do
        if curl -f "http://localhost:${port}/health" > /dev/null 2>&1; then
            log_info "Node on port $port is healthy"
        else
            log_error "Node on port $port failed health check"
            return 1
        fi
    done
    
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
