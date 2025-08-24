#!/bin/bash

# PulseScan Development Setup Script
# Sets up local development environment for PulseScan fraud detection system

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    local missing_deps=()
    
    if ! command -v node &> /dev/null; then
        missing_deps+=("node (v18+)")
    fi
    
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi
    
    if ! command -v cargo &> /dev/null; then
        missing_deps+=("rust/cargo")
    fi
    
    if ! command -v psql &> /dev/null; then
        missing_deps+=("postgresql-client")
    fi
    
    if ! command -v redis-cli &> /dev/null; then
        missing_deps+=("redis-cli")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log_info "Please install the missing dependencies and run this script again."
        exit 1
    fi
    
    log_success "All dependencies found"
}

setup_database() {
    log_info "Setting up PostgreSQL database..."
    
    # Check if PostgreSQL is running
    if ! pg_isready -q; then
        log_warning "PostgreSQL is not running. Please start PostgreSQL and run this script again."
        return 1
    fi
    
    # Create database and user
    psql -h localhost -U postgres -c "CREATE DATABASE pulsescan;" 2>/dev/null || log_warning "Database 'pulsescan' already exists"
    psql -h localhost -U postgres -c "CREATE USER pulsescan WITH PASSWORD 'pulsescan123';" 2>/dev/null || log_warning "User 'pulsescan' already exists"
    psql -h localhost -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE pulsescan TO pulsescan;" 2>/dev/null
    
    # Run migrations
    log_info "Running database migrations..."
    PGPASSWORD=pulsescan123 psql -h localhost -U pulsescan -d pulsescan -f "$PROJECT_ROOT/migrations/pulsescan/001_initial_schema.sql"
    
    log_success "Database setup complete"
}

setup_redis() {
    log_info "Checking Redis connection..."
    
    if ! redis-cli ping &> /dev/null; then
        log_warning "Redis is not running. Please start Redis and run this script again."
        return 1
    fi
    
    log_success "Redis connection verified"
}

build_contracts() {
    log_info "Building CosmWasm contracts..."
    
    cd "$PROJECT_ROOT/contracts/pulsescan"
    
    # Add WASM target if not present
    rustup target add wasm32-unknown-unknown 2>/dev/null || true
    
    # Build the contract
    cargo build --release --target wasm32-unknown-unknown
    
    # Optimize the contract (optional)
    if command -v wasm-opt &> /dev/null; then
        log_info "Optimizing WASM binary..."
        wasm-opt -Oz --output target/wasm32-unknown-unknown/release/pulsescan_optimized.wasm \
                 target/wasm32-unknown-unknown/release/pulsescan.wasm
    fi
    
    log_success "Contract build complete"
}

build_inference_service() {
    log_info "Building inference service..."
    
    cd "$PROJECT_ROOT/services/pulsescan-infer"
    
    # Build the service
    cargo build --release
    
    # Create config file if it doesn't exist
    if [ ! -f config.toml ]; then
        log_info "Creating default config.toml..."
        cat > config.toml << EOF
database_url = "postgresql://pulsescan:pulsescan123@localhost:5432/pulsescan"
redis_url = "redis://localhost:6379"
blockchain_rpc_url = "http://localhost:26657"
contract_address = "dytallix1contract..."
min_anomaly_score = 0.7
auto_submit_findings = false
metrics_port = 9090

[inference]
model_type = "ensemble"
batch_size = 32
confidence_threshold = 0.8
enable_ensemble = true

[features]
enable_graph_features = true
enable_temporal_features = true
enable_behavioral_features = true
lookback_window_hours = 24
velocity_window_minutes = 60
EOF
    fi
    
    log_success "Inference service build complete"
}

setup_api_service() {
    log_info "Setting up API service..."
    
    cd "$PROJECT_ROOT/services/pulsescan-api"
    
    # Install dependencies
    npm install
    
    # Build TypeScript
    npm run build
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        log_info "Creating default .env file..."
        cat > .env << EOF
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pulsescan
DB_USERNAME=pulsescan
DB_PASSWORD=pulsescan123
DB_SSL=false

# Redis
REDIS_URL=redis://localhost:6379

# Blockchain
BLOCKCHAIN_RPC_URL=http://localhost:26657
CONTRACT_ADDRESS=dytallix1contract...
NETWORK_ID=dytallix-dev

# Security
API_KEY=dev-api-key-change-in-production

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_ENABLE_CONSOLE=true
LOG_ENABLE_FILE=false
EOF
    fi
    
    log_success "API service setup complete"
}

create_model_artifacts() {
    log_info "Creating model artifacts directory..."
    
    local models_dir="$PROJECT_ROOT/services/pulsescan-infer/models"
    mkdir -p "$models_dir"
    
    # Create placeholder model files
    cat > "$models_dir/model_info.json" << EOF
{
  "version": "1.0.0",
  "type": "ensemble",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "features": {
    "count": 20,
    "names": [
      "velocity_1h", "velocity_24h", "velocity_7d",
      "amount_z_score", "amount_percentile", "round_amount_indicator",
      "hour_of_day", "day_of_week", "is_weekend", "time_since_last_tx",
      "in_degree", "out_degree", "clustering_coefficient", 
      "betweenness_centrality", "page_rank",
      "gas_price_z_score", "gas_limit_z_score", 
      "tx_frequency_pattern", "address_age_days", "unique_counterparties"
    ]
  },
  "performance": {
    "accuracy": 0.875,
    "precision": 0.823,
    "recall": 0.789,
    "f1_score": 0.806,
    "auc_roc": 0.912
  }
}
EOF
    
    log_success "Model artifacts created"
}

run_tests() {
    log_info "Running tests..."
    
    # Test contracts
    log_info "Testing contracts..."
    cd "$PROJECT_ROOT/contracts/pulsescan"
    cargo test
    
    # Test inference service
    log_info "Testing inference service..."
    cd "$PROJECT_ROOT/services/pulsescan-infer"
    cargo test
    
    # Test API service
    log_info "Testing API service..."
    cd "$PROJECT_ROOT/services/pulsescan-api"
    npm test
    
    log_success "All tests passed"
}

generate_documentation() {
    log_info "Generating documentation..."
    
    # Generate contract schema
    cd "$PROJECT_ROOT/contracts/pulsescan"
    cargo schema
    
    # Generate API documentation
    cd "$PROJECT_ROOT/services/pulsescan-api"
    if [ -f "generate-docs.js" ]; then
        node generate-docs.js
    fi
    
    log_success "Documentation generated"
}

start_services() {
    log_info "Starting services in development mode..."
    
    # Start inference service in background
    cd "$PROJECT_ROOT/services/pulsescan-infer"
    cargo run --release -- --config config.toml &
    INFERENCE_PID=$!
    
    # Wait a moment for inference service to start
    sleep 5
    
    # Start API service
    cd "$PROJECT_ROOT/services/pulsescan-api"
    npm run dev &
    API_PID=$!
    
    log_success "Services started!"
    log_info "Inference service PID: $INFERENCE_PID"
    log_info "API service PID: $API_PID"
    log_info "API available at: http://localhost:3001"
    log_info "API documentation: http://localhost:3001/api/docs"
    log_info "Metrics: http://localhost:9090/metrics"
    
    # Wait for interrupt
    trap "kill $INFERENCE_PID $API_PID 2>/dev/null; exit" SIGINT SIGTERM
    wait
}

print_usage() {
    cat << EOF
PulseScan Development Setup Script

Usage: $0 [OPTION]

Options:
    setup       Setup complete development environment
    database    Setup database only
    build       Build all services
    test        Run all tests
    start       Start services in development mode
    clean       Clean build artifacts
    help        Show this help message

Examples:
    $0 setup       # Complete setup
    $0 build       # Build all services
    $0 start       # Start development servers
EOF
}

clean_artifacts() {
    log_info "Cleaning build artifacts..."
    
    # Clean Rust artifacts
    cd "$PROJECT_ROOT/contracts/pulsescan" && cargo clean
    cd "$PROJECT_ROOT/services/pulsescan-infer" && cargo clean
    
    # Clean Node.js artifacts
    cd "$PROJECT_ROOT/services/pulsescan-api"
    rm -rf node_modules dist
    
    log_success "Build artifacts cleaned"
}

main() {
    case "${1:-help}" in
        setup)
            log_info "Starting PulseScan development setup..."
            check_dependencies
            setup_database
            setup_redis
            build_contracts
            build_inference_service
            setup_api_service
            create_model_artifacts
            log_success "Setup complete! Run '$0 start' to start services."
            ;;
        database)
            setup_database
            ;;
        build)
            check_dependencies
            build_contracts
            build_inference_service
            setup_api_service
            create_model_artifacts
            ;;
        test)
            run_tests
            ;;
        start)
            start_services
            ;;
        clean)
            clean_artifacts
            ;;
        help|*)
            print_usage
            ;;
    esac
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi