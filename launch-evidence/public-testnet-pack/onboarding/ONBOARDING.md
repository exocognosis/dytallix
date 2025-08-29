# Dytallix Developer Onboarding Guide

## Welcome to Dytallix Development

This guide provides comprehensive onboarding for developers joining the Dytallix ecosystem.

## Prerequisites

### Required Tools
- **Rust** (latest stable): `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Node.js** (v18+): For frontend development and tooling
- **Git**: Version control and collaboration
- **Docker** (optional): For containerized development
- **Visual Studio Code** (recommended): With Rust analyzer extension

### System Requirements
- **Operating System**: Linux, macOS, or Windows (WSL2 recommended)
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 20GB available space
- **Network**: Stable internet connection for dependency downloads

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/HisMadRealm/dytallix.git
cd dytallix
```

### 2. Run Developer Onboarding Script

```bash
# One-command setup
./scripts/dev_onboard.sh
```

This script will:
- Validate your development environment
- Generate sample configuration files
- Create test wallet credentials
- Verify build toolchain
- Generate onboarding artifacts hash manifest

### 3. Verify Installation

```bash
# Run gating checks
make gate

# This runs:
# - cargo check --workspace --all-targets
# - cargo test --lib
# - cargo clippy --workspace --all-targets -- -D warnings
```

### 4. Start Development Environment

```bash
# Start all services
make dev

# Or start individual components:
make faucet          # Test faucet functionality
make build          # Build all components
make test           # Run full test suite
```

## Development Workflow

### Daily Development Loop

1. **Update dependencies**: `cargo update && npm install`
2. **Run gating checks**: `make gate`
3. **Make changes**: Edit code using your preferred editor
4. **Test locally**: `make test-unit && make test-e2e`
5. **Commit changes**: `git add . && git commit -m "Description"`
6. **Push**: `git push origin your-branch`

### Code Quality Standards

All code must pass gating requirements:
- **Zero compiler warnings**: `cargo clippy -- -D warnings`
- **All tests passing**: `cargo test --lib`
- **Clean builds**: `cargo check --workspace --all-targets`
- **Formatting**: `cargo fmt --all`

### Branch Protection

- **Main branch**: Protected, requires PR with reviews
- **Feature branches**: Use descriptive names (e.g., `feature/pqc-integration`)
- **Hotfix branches**: For critical production fixes
- **Release branches**: For stable release preparation

## Architecture Overview

### Core Components

```
dytallix/
├── blockchain-core/     # Core blockchain logic
├── cli/                # Command-line interface
├── faucet/             # Token distribution service
├── explorer/           # Blockchain explorer UI
├── governance/         # On-chain governance
├── smart-contracts/    # CosmWasm smart contracts
├── dytallix-lean-launch/ # Frontend application
└── scripts/            # Automation and tooling
```

### Key Technologies
- **Cosmos SDK**: Blockchain framework
- **CosmWasm**: Smart contract platform
- **Tendermint**: BFT consensus
- **React/TypeScript**: Frontend development
- **Rust**: Core development language
- **Post-Quantum Cryptography**: Future-proof security

## Configuration

### Environment Setup

Copy and customize configuration files:

```bash
# Core configuration
cp config/config.toml.example config/config.toml

# Frontend environment
cp dytallix-lean-launch/.env.example dytallix-lean-launch/.env

# Update with your local settings
vim config/config.toml
```

### Key Configuration Options

```toml
# config.toml
[network]
chain_id = "dytallix-devnet"
rpc_endpoint = "http://localhost:26657"
api_endpoint = "http://localhost:1317"

[faucet]
endpoint = "http://localhost:8787/api/faucet" 
enabled = true
rate_limit = "100/hour"

[development]
debug_logging = true
hot_reload = true
test_mode = true
```

## Testing

### Unit Tests
```bash
# Run all unit tests
cargo test --lib

# Run specific test module
cargo test --lib blockchain_core::tests

# Run with output
cargo test --lib -- --nocapture
```

### Integration Tests
```bash
# End-to-end testing
make test-e2e

# Faucet integration
FAUCET_URL=http://localhost:8787/api/faucet cargo test --test faucet_integration
```

### Performance Testing
```bash
# Benchmark critical paths
cargo bench

# Load testing (requires testnet)
./scripts/gas_benchmark.sh
```

## Debugging

### Common Issues

1. **Build Failures**
   - Run `cargo clean && cargo build`
   - Check Rust version: `rustc --version`
   - Update dependencies: `cargo update`

2. **Test Failures**
   - Check environment variables
   - Verify network connectivity
   - Review test logs in `target/debug`

3. **Clippy Warnings**
   - Fix all warnings: `cargo clippy --fix`
   - Check specific warnings: `cargo clippy -- -D warnings`

### Development Tools

```bash
# Code formatting
cargo fmt --all

# Documentation generation
cargo doc --open

# Dependency analysis
cargo tree

# Security audit
cargo audit
```

## Contribution Guidelines

### Code Review Process

1. **Create feature branch** from main
2. **Implement changes** following coding standards
3. **Write/update tests** for new functionality
4. **Update documentation** as needed
5. **Submit pull request** with clear description
6. **Address review feedback** promptly
7. **Ensure gating passes** before merge

### Coding Standards

- **Rust**: Follow official Rust style guide
- **TypeScript**: Use ESLint and Prettier
- **Commit messages**: Use conventional commits format
- **Documentation**: Include inline docs and README updates

### Security Considerations

- **Never commit secrets** or private keys
- **Use environment variables** for configuration
- **Validate all inputs** in public functions
- **Follow OWASP guidelines** for web security
- **Report security issues** privately to maintainers

## Resources

### Documentation
- [Cosmos SDK Docs](https://docs.cosmos.network/)
- [CosmWasm Documentation](https://docs.cosmwasm.com/)
- [Rust Book](https://doc.rust-lang.org/book/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Community
- **Discord**: Development discussions and support
- **GitHub Issues**: Bug reports and feature requests
- **Wiki**: Extended documentation and tutorials
- **Office Hours**: Weekly developer meetings

### Getting Help

1. **Check documentation** in `docs/` directory
2. **Search existing issues** on GitHub
3. **Ask in Discord** #development channel
4. **Create GitHub issue** for bugs or features
5. **Attend office hours** for complex questions

## Next Steps

After completing onboarding:

1. **Explore codebase**: Start with `blockchain-core/` module
2. **Pick first issue**: Look for "good first issue" labels
3. **Join community**: Introduce yourself in Discord
4. **Set up IDE**: Configure Rust analyzer and debugging
5. **Read architecture docs**: Understand system design

## Troubleshooting

### Onboarding Script Issues

If `./scripts/dev_onboard.sh` fails:

1. Check prerequisites are installed
2. Verify network connectivity
3. Run with verbose output: `bash -x ./scripts/dev_onboard.sh`
4. Check generated log files in `launch-evidence/`

### Build Environment Issues

Common environment fixes:
```bash
# Reset Rust toolchain
rustup update
rustup default stable

# Clear caches
cargo clean
npm cache clean --force

# Verify toolchain
rustc --version
cargo --version
node --version
```

Welcome to the Dytallix development community! We're excited to have you contribute to the future of secure, scalable blockchain technology.