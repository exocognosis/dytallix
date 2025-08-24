#!/bin/bash

# CodeGuard Development Setup Script
# This script sets up the development environment for CodeGuard

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODEGUARD_ROOT="$SCRIPT_DIR/.."

echo "🚀 Setting up CodeGuard development environment..."

# Check prerequisites
check_prerequisites() {
    echo "📋 Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is required but not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        echo "❌ npm is required but not installed"
        exit 1
    fi
    
    # Check Rust
    if ! command -v cargo &> /dev/null; then
        echo "❌ Rust is required but not installed"
        echo "Install from: https://rustup.rs/"
        exit 1
    fi
    
    # Check wasm32 target
    if ! rustup target list --installed | grep -q wasm32-unknown-unknown; then
        echo "📦 Installing wasm32-unknown-unknown target..."
        rustup target add wasm32-unknown-unknown
    fi
    
    echo "✅ Prerequisites check passed"
}

# Install service dependencies
install_dependencies() {
    echo "📦 Installing service dependencies..."
    
    # Orchestrator service
    echo "Installing orchestrator dependencies..."
    cd "$CODEGUARD_ROOT/services/codeguard-orchestrator"
    npm install
    
    # Worker service
    echo "Installing worker dependencies..."
    cd "$CODEGUARD_ROOT/services/codeguard-worker"
    npm install
    
    # Rules engine
    echo "Installing rules engine dependencies..."
    cd "$CODEGUARD_ROOT/services/codeguard-rules"
    npm install
    
    echo "✅ Dependencies installed"
}

# Build contract
build_contract() {
    echo "🔨 Building CodeGuard contract..."
    cd "$CODEGUARD_ROOT/contracts/codeguard"
    cargo build --release --target wasm32-unknown-unknown
    echo "✅ Contract built"
}

# Generate configuration files
generate_config() {
    echo "⚙️ Generating configuration files..."
    
    # Create environment files for services
    cat > "$CODEGUARD_ROOT/services/codeguard-orchestrator/.env" << EOF
# CodeGuard Orchestrator Configuration
PORT=8080
CODEGUARD_CHAIN_RPC=http://localhost:26657
CODEGUARD_CONTRACT_ADDRESS=
CODEGUARD_WORKERS_ENDPOINT=http://localhost:8081
CODEGUARD_RULES_ENDPOINT=http://localhost:8082
CODEGUARD_MNEMONIC=abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
EOF

    cat > "$CODEGUARD_ROOT/services/codeguard-worker/.env" << EOF
# CodeGuard Worker Configuration
WORKER_PORT=8081
AI_MODEL_ENDPOINT=
STATIC_ANALYZER_ENABLED=true
DYNAMIC_ANALYZER_ENABLED=true
EOF

    cat > "$CODEGUARD_ROOT/services/codeguard-rules/.env" << EOF
# CodeGuard Rules Engine Configuration
RULES_PORT=8082
RULES_CONFIG_PATH=./config/rules.json
RULES_STRICT_MODE=false
EOF

    echo "✅ Configuration files generated"
}

# Create test data
create_test_data() {
    echo "📝 Creating test data..."
    
    # Sample contract for testing
    cat > "$CODEGUARD_ROOT/testdata/codeguard/sample-contract.sol" << 'EOF'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SampleContract
 * @dev A sample contract for CodeGuard testing
 */
contract SampleContract {
    address public owner;
    uint256 public value;
    
    event ValueChanged(uint256 newValue);
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }
    
    /**
     * @dev Set a new value
     * @param _value The new value to set
     */
    function setValue(uint256 _value) public onlyOwner {
        value = _value;
        emit ValueChanged(_value);
    }
    
    /**
     * @dev Get the current value
     * @return The current value
     */
    function getValue() public view returns (uint256) {
        return value;
    }
}
EOF

    # Sample scan request
    cat > "$CODEGUARD_ROOT/testdata/codeguard/sample-scan-request.json" << 'EOF'
{
  "contractAddress": "dytallix1sample123456789012345678901234567890",
  "codeHash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "sourceCode": "...",
  "bytecode": "0x608060405234801561001057600080fd5b50..."
}
EOF

    echo "✅ Test data created"
}

# Run tests
run_tests() {
    echo "🧪 Running tests..."
    
    # Contract tests
    echo "Testing contract..."
    cd "$CODEGUARD_ROOT/contracts/codeguard"
    cargo test
    
    echo "✅ All tests passed"
}

# Print usage instructions
print_usage() {
    echo ""
    echo "🎉 CodeGuard development environment setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Start the services:"
    echo "   make codeguard.dev-up"
    echo ""
    echo "2. Test the health endpoints:"
    echo "   curl http://localhost:8080/health  # Orchestrator"
    echo "   curl http://localhost:8081/health  # Worker"
    echo "   curl http://localhost:8082/health  # Rules Engine"
    echo ""
    echo "3. Submit a test scan:"
    echo "   CODEGUARD_CONTRACT=dytallix1test123... CODEGUARD_CODE_HASH=0x123... make codeguard.scan"
    echo ""
    echo "4. View the documentation:"
    echo "   open docs/modules/codeguard/README.md"
    echo ""
    echo "Configuration files created in:"
    echo "- services/codeguard-orchestrator/.env"
    echo "- services/codeguard-worker/.env"
    echo "- services/codeguard-rules/.env"
    echo ""
    echo "Test data available in:"
    echo "- testdata/codeguard/"
}

# Main execution
main() {
    check_prerequisites
    install_dependencies
    build_contract
    generate_config
    create_test_data
    run_tests
    print_usage
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --help)
            echo "CodeGuard Development Setup"
            echo "Usage: $0 [--skip-tests] [--help]"
            echo ""
            echo "Options:"
            echo "  --skip-tests  Skip running tests"
            echo "  --help        Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Override run_tests if skip flag is set
if [[ "$SKIP_TESTS" == "true" ]]; then
    run_tests() {
        echo "⏭️ Skipping tests"
    }
fi

main