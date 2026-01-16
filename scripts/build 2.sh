#!/bin/bash

# Dytallix Project Build Script
# Builds all components of the Dytallix blockchain project

set -e

echo "🚀 Building Dytallix - Post-Quantum AI-Enhanced Cryptocurrency"
echo "================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check dependencies
check_dependencies() {
    print_status "Checking dependencies..."
    
    # Check Rust
    if ! command -v cargo &> /dev/null; then
        print_error "Rust/Cargo not found. Please install Rust: https://rustup.rs/"
        exit 1
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 not found. Please install Python 3.9+"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_warning "Node.js not found. Frontend development will be limited."
    fi
    
    print_success "Dependencies check completed"
}

# Build blockchain core
build_blockchain() {
    print_status "Building blockchain core..."
    cd blockchain-core
    
    if cargo build --release; then
        print_success "Blockchain core built successfully"
    else
        print_error "Failed to build blockchain core"
        exit 1
    fi
    
    cd ..
}

# Build PQC crypto module
build_pqc() {
    print_status "Building post-quantum cryptography module..."
    cd pqc-crypto
    
    if cargo build --release; then
        print_success "PQC module built successfully"
    else
        print_error "Failed to build PQC module"
        exit 1
    fi
    
    cd ..
}

# Setup AI services
setup_ai_services() {
    print_status "Setting up AI services..."
    cd ai-services
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install dependencies
    if pip install -r requirements.txt; then
        print_success "AI services dependencies installed"
    else
        print_error "Failed to install AI services dependencies"
        exit 1
    fi
    
    deactivate
    cd ..
}

# Build smart contracts
build_contracts() {
    print_status "Building smart contracts..."
    cd smart-contracts
    
    if cargo build --release; then
        print_success "Smart contracts built successfully"
    else
        print_error "Failed to build smart contracts"
        exit 1
    fi
    
    cd ..
}

# Build developer tools
build_dev_tools() {
    print_status "Building developer tools..."
    cd developer-tools
    
    if cargo build --release; then
        print_success "Developer tools built successfully"
    else
        print_error "Failed to build developer tools"
        exit 1
    fi
    
    cd ..
}

# Create directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p data/blockchain
    mkdir -p data/ai-models
    mkdir -p logs
    mkdir -p config
    
    print_success "Directories created"
}

# Generate configuration files
generate_config() {
    print_status "Generating configuration files..."
    
    # Create node configuration
    cat > config/node.toml << EOF
[network]
listen_address = "127.0.0.1:8080"
peer_discovery = true
max_peers = 50

[consensus]
algorithm = "pos"
validator = true

[pqc]
signature_algorithm = "dilithium5"
key_exchange_algorithm = "kyber1024"

[ai]
oracle_enabled = true
fraud_detection = true
risk_scoring = true
ai_services_url = "http://localhost:8000"

[storage]
data_dir = "./data/blockchain"
EOF

    # Create AI services configuration
    cat > config/ai-services.yaml << EOF
server:
  host: "0.0.0.0"
  port: 8000
  workers: 4

models:
  fraud_detection:
    enabled: true
    model_path: "./data/ai-models/fraud_detector.pkl"
  
  risk_scoring:
    enabled: true
    threshold_high: 0.8
    threshold_medium: 0.5
  
  contract_nlp:
    enabled: true
    max_code_length: 10000

blockchain:
  node_url: "http://localhost:8080"
  oracle_address: "oracle_dytallix_ai_001"

logging:
  level: "INFO"
  file: "./logs/ai-services.log"
EOF

    print_success "Configuration files generated"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    # Test blockchain core
    cd blockchain-core
    if cargo test; then
        print_success "Blockchain core tests passed"
    else
        print_warning "Some blockchain core tests failed"
    fi
    cd ..
    
    # Test PQC module
    cd pqc-crypto
    if cargo test; then
        print_success "PQC module tests passed"
    else
        print_warning "Some PQC module tests failed"
    fi
    cd ..
    
    # Test smart contracts
    cd smart-contracts
    if cargo test; then
        print_success "Smart contracts tests passed"
    else
        print_warning "Some smart contracts tests failed"
    fi
    cd ..
    
    print_success "Tests completed"
}

# Main build process
main() {
    echo
    print_status "Starting Dytallix build process..."
    echo
    
    check_dependencies
    echo
    
    create_directories
    echo
    
    build_pqc
    echo
    
    build_blockchain
    echo
    
    setup_ai_services
    echo
    
    build_contracts
    echo
    
    build_dev_tools
    echo
    
    generate_config
    echo
    
    if [ "$1" = "--test" ]; then
        run_tests
        echo
    fi
    
    print_success "🎉 Dytallix build completed successfully!"
    echo
    echo "Next steps:"
    echo "1. Start the blockchain node: ./blockchain-core/target/release/dytallix-node"
    echo "2. Start AI services: cd ai-services && source venv/bin/activate && python src/main.py"
    echo "3. Use CLI tools: ./developer-tools/target/release/dytallix-cli --help"
    echo
    echo "For more information, see the README.md files in each module."
}

# Parse command line arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Dytallix Build Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --test    Run tests after building"
    echo "  --help    Show this help message"
    echo ""
    exit 0
fi

# Run main function
main "$@"
