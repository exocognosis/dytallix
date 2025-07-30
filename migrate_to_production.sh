#!/bin/bash

# Dytallix Production Branch Migration Script
# This script automates the migration process outlined in PRODUCTION_BRANCH_MIGRATION_PLAN.md

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PRODUCTION_REPO="https://github.com/dytallix/dytallix-mainnet.git"
PRODUCTION_BRANCH="production"
BACKUP_DIR="./migration_backup_$(date +%Y%m%d_%H%M%S)"

echo -e "${BLUE}🚀 Dytallix Production Branch Migration Script${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""

# Function to print step
print_step() {
    echo -e "${BLUE}📋 Step $1: $2${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
}

# Function to confirm action
confirm_action() {
    read -p "$(echo -e ${YELLOW}$1 [y/N]: ${NC})" response
    case "$response" in
        [yY][eE][sS]|[yY]) 
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Check if we're in the right directory
if [[ ! -f "Cargo.toml" ]] || [[ ! -d "blockchain-core" ]]; then
    print_error "This script must be run from the Dytallix project root directory"
    exit 1
fi

print_step "1" "Pre-migration Safety Check"

# Create backup
if confirm_action "Create backup of current repository state?"; then
    mkdir -p "$BACKUP_DIR"
    cp -r . "$BACKUP_DIR/"
    print_success "Backup created at $BACKUP_DIR"
fi

# Check git status
if [[ -n $(git status --porcelain) ]]; then
    print_warning "Working directory has uncommitted changes"
    if ! confirm_action "Continue with migration?"; then
        print_error "Migration aborted. Please commit or stash changes first."
        exit 1
    fi
fi

print_step "2" "Identify Sensitive Files"

# List sensitive files that will be removed
echo -e "${YELLOW}Files to be removed:${NC}"
SENSITIVE_FILES=(
    "secrets/pqc_keys_dev.json"
    "blockchain-core/pqc_keys.json" 
    "pqc_keys.json"
    "security-validation-report-*.txt"
    "developer-tools/test-fixed-encryption_*.json"
    "blockchain-core/compliance_export_*.json"
    "DYTALLIX_MAINNET_LAUNCH_PLAN.md"
    "devTimeline.md"
    "aiModelDev.md"
    "Dytallix_30_60_90_Development_Plan.md"
    "*_IMPLEMENTATION_SUMMARY.md"
    "PHASE_IMPLEMENTATION_COMPLETION_SUMMARY.md"
    "AI_MODULES_DASHBOARD_*.md"
    "infra_security_matrix.csv"
)

SENSITIVE_DIRS=(
    "security-implementation/"
    "security_audit_results/"
    "testnet-audit/"
    "logs/"
    ".pids/"
    "status/"
    "target/"
    ".venv/"
)

for file in "${SENSITIVE_FILES[@]}"; do
    if ls $file 1> /dev/null 2>&1; then
        echo "  - $file"
    fi
done

for dir in "${SENSITIVE_DIRS[@]}"; do
    if [[ -d "$dir" ]]; then
        echo "  - $dir"
    fi
done

if ! confirm_action "Proceed with removing these sensitive files?"; then
    print_error "Migration aborted by user"
    exit 1
fi

print_step "3" "Create Production Branch"

# Create production branch
git checkout -b "$PRODUCTION_BRANCH" 2>/dev/null || git checkout "$PRODUCTION_BRANCH"
print_success "Production branch created/checked out"

print_step "4" "Remove Sensitive Files"

# Remove sensitive files
for file in "${SENSITIVE_FILES[@]}"; do
    if ls $file 1> /dev/null 2>&1; then
        rm -f $file
        git rm -f $file 2>/dev/null || true
        print_success "Removed $file"
    fi
done

# Remove sensitive directories
for dir in "${SENSITIVE_DIRS[@]}"; do
    if [[ -d "$dir" ]]; then
        rm -rf "$dir"
        git rm -rf "$dir" 2>/dev/null || true
        print_success "Removed $dir"
    fi
done

print_step "5" "Create Configuration Templates"

# Create config templates directory
mkdir -p config/templates
mkdir -p secrets/templates

# Create production config template
cat > config/templates/production.template.toml << 'EOF'
# Production Configuration Template
# Copy this file to config/production.toml and update with your values

[network]
listen_address = "0.0.0.0:8080"
rpc_endpoint = "YOUR_RPC_ENDPOINT"
max_connections = 1000

[database]
url = "YOUR_DATABASE_URL"
max_connections = 100

[ai_services]
api_endpoint = "YOUR_AI_SERVICE_ENDPOINT"
api_key = "YOUR_API_KEY"
timeout_seconds = 30

[bridge]
ethereum_endpoint = "YOUR_ETHEREUM_RPC"
cosmos_endpoint = "YOUR_COSMOS_RPC"
polkadot_endpoint = "YOUR_POLKADOT_RPC"

[monitoring]
prometheus_endpoint = "YOUR_PROMETHEUS_ENDPOINT"
grafana_endpoint = "YOUR_GRAFANA_ENDPOINT"

[security]
enable_rate_limiting = true
max_requests_per_minute = 100
EOF

# Create keys template
cat > secrets/templates/keys.template.json << 'EOF'
{
  "note": "Generate keys using: cargo run --bin keygen",
  "signature_keypair": {
    "public_key": "GENERATE_WITH_KEYGEN_TOOL",
    "private_key": "STORE_SECURELY_NEVER_COMMIT"
  },
  "key_exchange_keypair": {
    "public_key": "GENERATE_WITH_KEYGEN_TOOL", 
    "private_key": "STORE_SECURELY_NEVER_COMMIT"
  }
}
EOF

print_success "Configuration templates created"

print_step "6" "Update .gitignore for Production"

# Update .gitignore
cat >> .gitignore << 'EOF'

# Production secrets (NEVER COMMIT)
config/production.toml
config/secrets.toml
secrets/keys.json
secrets/production_keys.json
.env.production

# Development files (keep private)
config/development.toml
secrets/dev_keys.json
secrets/test_keys.json

# Runtime data
data/
logs/
*.pid
.pids/

# Migration backups
migration_backup_*/
EOF

print_success ".gitignore updated for production"

print_step "7" "Create Production README"

# Create production README
cat > README.md << 'EOF'
# 🚀 Dytallix - Post-Quantum AI-Enhanced Blockchain

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Security](https://img.shields.io/badge/Security-Post--Quantum-blue)](https://github.com/dytallix/dytallix-mainnet)

## 🌟 Overview

Dytallix is a next-generation blockchain platform that combines post-quantum cryptography with artificial intelligence to create a secure, scalable, and intelligent decentralized ecosystem.

## 🔑 Key Features

### 🛡️ Post-Quantum Security
- **Dilithium**: Post-quantum digital signatures
- **Falcon**: Lattice-based cryptography  
- **SPHINCS+**: Hash-based signatures
- **Kyber**: Post-quantum key encapsulation

### 🤖 AI Integration
- **Fraud Detection**: Real-time transaction analysis
- **Risk Scoring**: Intelligent risk assessment
- **Contract Auditing**: Automated smart contract security
- **Performance Optimization**: AI-driven system tuning

### 🌉 Cross-Chain Bridge
- **Ethereum Integration**: ERC-20 token bridging
- **Cosmos Ecosystem**: IBC protocol support
- **Polkadot Network**: XCM message passing
- **Multi-Signature Validation**: Secure cross-chain transfers

### ⚡ Performance
- **1000+ TPS**: High-throughput transaction processing
- **WASM Runtime**: Secure smart contract execution
- **Sub-second Finality**: Fast transaction confirmation
- **Auto-scaling**: Dynamic resource management

## 🚀 Quick Start

### Prerequisites
- Rust 1.70+
- Python 3.9+
- Node.js 18+
- Docker (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/dytallix/dytallix-mainnet.git
cd dytallix-mainnet

# Build the project
cargo build --release

# Generate cryptographic keys
cargo run --bin keygen

# Configure the node
cp config/templates/production.template.toml config/production.toml
# Edit config/production.toml with your settings

# Start the node
cargo run --release
```

## 📚 Documentation

- [🏗️ Architecture Overview](docs/architecture.md)
- [🔧 API Reference](docs/api.md)
- [👨‍💻 Development Guide](docs/development.md)
- [🚀 Deployment Guide](docs/deployment.md)
- [🔒 Security Guide](docs/security.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 🔒 Security

Security is our top priority. Please see our [Security Policy](SECURITY.md) for information on reporting vulnerabilities.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌐 Community

- [Documentation](https://docs.dytallix.com)
- [Developer Forum](https://forum.dytallix.com)
- [Discord](https://discord.gg/dytallix)
- [Twitter](https://twitter.com/dytallix)

## ⚡ Status

🟢 **Mainnet Ready** - Production deployment Q1 2026

---

**Built with ❤️ by the Dytallix Team**
EOF

print_success "Production README created"

print_step "8" "Commit Changes"

# Stage all changes
git add .
git commit -m "feat: prepare production branch for public release

- Remove sensitive development files and keys
- Create configuration templates for production
- Update documentation for public consumption
- Sanitize repository for mainnet launch

BREAKING CHANGE: This is the public production branch"

print_success "Changes committed to production branch"

print_step "9" "Summary"

echo ""
echo -e "${GREEN}🎉 Production branch migration completed successfully!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Review the production branch carefully"
echo "2. Create the public repository: dytallix/dytallix-mainnet"
echo "3. Push the production branch to the public repository"
echo "4. Configure GitHub repository settings and branch protection"
echo "5. Set up CI/CD pipeline"
echo ""
echo -e "${YELLOW}⚠️  Important reminders:${NC}"
echo "- Never commit production secrets to the public repository"
echo "- Use environment variables for sensitive configuration"
echo "- Keep the private development repository separate"
echo "- Review all future commits before pushing to production"
echo ""
echo -e "${BLUE}Backup location: ${BACKUP_DIR}${NC}"
echo ""

if confirm_action "Show git log of changes?"; then
    git log --oneline -10
fi

print_success "Migration script completed!"
