# Developer Tools

Command-line interface and development utilities for Dytallix blockchain.

## Features

- Node interaction and management
- Smart contract deployment and testing
- AI service integration testing
- Post-quantum key generation and management
- Transaction creation and monitoring

## Contents
- `CLI_EXAMPLES.md`: Example CLI commands for wallet, AI services, and smart contract test harness
- `README.md`: This file

## Getting Started
- See `CLI_EXAMPLES.md` for usage patterns
- Each module (wallet, ai-services, smart-contracts) contains its own CLI or API

## Commands

### Node Management
```bash
dytallix-cli node start          # Start local node
dytallix-cli node stop           # Stop node
dytallix-cli node status         # Check node status
dytallix-cli node logs           # View node logs
```

### Account Management
```bash
dytallix-cli account create      # Create new PQC account
dytallix-cli account list        # List accounts
dytallix-cli account balance     # Check balance
dytallix-cli account export      # Export account keys
```

### Smart Contracts
```bash
dytallix-cli contract deploy     # Deploy contract
dytallix-cli contract call       # Call contract method
dytallix-cli contract query      # Query contract state
dytallix-cli contract events     # View contract events
```

### AI Services
```bash
dytallix-cli ai analyze-fraud    # Test fraud detection
dytallix-cli ai score-risk       # Test risk scoring
dytallix-cli ai generate-contract # Generate contract from NLP
dytallix-cli ai oracle-status    # Check oracle status
```

## Building

```bash
cargo build --release
```

## Installation

```bash
cargo install --path .
```
