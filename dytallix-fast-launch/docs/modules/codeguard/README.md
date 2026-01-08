---
title: CodeGuard Security Scanner Module
---

# CodeGuard Security Scanner Module

Comprehensive smart contract security scanning and attestation system with post-quantum cryptography support.

## Overview

CodeGuard is an AI-powered security scanner that analyzes smart contracts for vulnerabilities, provides risk assessments, and issues cryptographically signed attestations. The system uses a distributed architecture with multiple analysis engines and a rules-based evaluation framework.

## Architecture

### Core Components

1. **CodeGuard Smart Contract** (`contracts/codeguard`)
   - CosmWasm-based attestation contract
   - Stores scan results with PQ signatures
   - Minimum security score enforcement
   - AI model version validation

2. **Orchestrator Service** (`services/codeguard-orchestrator`)
   - Workflow coordination
   - API gateway for scan requests
   - Contract integration
   - Result aggregation

3. **Worker Service** (`services/codeguard-worker`)
   - Static analysis engine
   - Dynamic analysis engine
   - Code quality assessment
   - AI model inference

4. **Rules Engine** (`services/codeguard-rules`)
   - Configurable security rules
   - Scoring adjustments
   - Rule set management
   - Compliance checking

## Features

### Security Analysis
- **Static Analysis**: Pattern-based vulnerability detection, access control verification
- **Dynamic Analysis**: Bytecode analysis, execution path analysis, gas optimization
- **Code Quality**: Complexity metrics, documentation coverage, best practices
- **AI Integration**: Machine learning model inference for advanced threat detection

### Attestation System
- **Post-Quantum Cryptography**: PQC signatures for future-proof security
- **On-Chain Storage**: Immutable scan results stored on blockchain
- **Version Control**: AI model version tracking and validation
- **Minimum Scores**: Configurable security thresholds

### Rule Engine
- **Flexible Rules**: Configurable security rules and policies
- **Multiple Rule Sets**: Default, DeFi, NFT-specific rule sets
- **Custom Rules**: Support for custom rule definitions
- **Scoring Logic**: Weighted scoring with penalties and bonuses

## Quick Start

### 1. Build CodeGuard Contract
```bash
make codeguard.build
```

### 2. Start Development Environment
```bash
make codeguard.dev-up
```

### 3. Run Security Scan
```bash
CODEGUARD_CONTRACT=dytallix1abc123... \
CODEGUARD_CODE_HASH=0x456def... \
make codeguard.scan
```

### 4. Test Components
```bash
make codeguard.test
```

## API Reference

### Orchestrator Service (Port 8080)

#### Submit Scan
```http
POST /scan
Content-Type: application/json

{
  "contractAddress": "dytallix1...",
  "codeHash": "0x..."
}
```

#### Get Scan Result
```http
GET /scan/{scanId}
```

#### Verify Contract
```http
GET /contracts/{address}/verify
```

### Worker Service (Port 8081)

#### Analyze Contract
```http
POST /analyze
Content-Type: application/json

{
  "contractAddress": "dytallix1...",
  "codeHash": "0x...",
  "sourceCode": "contract MyContract { ... }",
  "bytecode": "0x608060405..."
}
```

#### Get Capabilities
```http
GET /capabilities
```

### Rules Engine (Port 8082)

#### Evaluate Analysis
```http
POST /evaluate
Content-Type: application/json

{
  "analysis": { ... },
  "ruleSet": "defi"
}
```

#### Get Available Rules
```http
GET /rules?category=security&severity=high
```

#### Get Rule Sets
```http
GET /rulesets
```

## Configuration

### Environment Variables

#### Orchestrator
```bash
CODEGUARD_CONTRACT_ADDRESS=dytallix1...
CODEGUARD_CHAIN_RPC=http://localhost:26657
CODEGUARD_WORKERS_ENDPOINT=http://localhost:8081
CODEGUARD_RULES_ENDPOINT=http://localhost:8082
```

#### Worker
```bash
WORKER_PORT=8081
AI_MODEL_ENDPOINT=http://localhost:8090
STATIC_ANALYZER_ENABLED=true
DYNAMIC_ANALYZER_ENABLED=true
```

#### Rules Engine
```bash
RULES_PORT=8082
RULES_CONFIG_PATH=./config/rules.json
RULES_STRICT_MODE=false
```

## Smart Contract Interface

### Instantiate Message
```rust
InstantiateMsg {
    min_score: Decimal,           // Minimum security score (0-100)
    signer_pubkey_pq: String,     // PQ public key for attestations
    allow_model_versions: Vec<String>, // Allowed AI model versions
}
```

### Execute Messages
```rust
// Submit security scan result
SubmitScan {
    contract_address: String,
    code_hash: String,
    security_score: Decimal,
    vulnerability_report: String,
    model_version: String,
    pq_signature: String,
}

// Update minimum score (admin only)
UpdateMinScore { min_score: Decimal }

// Manage model versions (admin only)
AddModelVersion { version: String }
RemoveModelVersion { version: String }
```

### Query Messages
```rust
// Get contract configuration
Config {}

// Get scan result for contract
GetScan { contract_address: String }

// List all scanned contracts
ListScans { start_after: Option<String>, limit: Option<u32> }

// Get scanning statistics
ScanStats {}

// Verify contract meets requirements
VerifyContract { contract_address: String }
```

## Rule Sets

### Default Rule Set
- Minimum security score threshold
- Maximum vulnerability count
- Access control requirements
- Complexity limits
- Documentation coverage

### DeFi Rule Set
- Reentrancy protection required
- No tx.origin usage
- Oracle implementation checks
- Enhanced security thresholds

### NFT Rule Set
- ERC721 compliance
- Metadata security
- Reduced complexity requirements

### Custom Rules
```json
{
  "id": "custom_rule",
  "type": "required_patterns",
  "description": "Custom security requirement",
  "severity": "high",
  "penalty": 15,
  "config": {
    "patterns": [
      {
        "name": "security_pattern",
        "regex": "require\\(.*\\)"
      }
    ]
  }
}
```

## Security Considerations

### Post-Quantum Cryptography
- Future-proof against quantum computing attacks
- Cryptographic signatures for attestation integrity
- Model version validation prevents tampering

### Access Control
- Admin-only configuration updates
- Signed attestations prevent forgery
- Minimum score enforcement

### Data Integrity
- Immutable on-chain storage
- Hash-based contract identification
- Timestamped scan results

## Development

### Adding New Analysis Types
1. Implement analyzer in `services/codeguard-worker/src/analyzers/`
2. Register in `contract-analyzer.js`
3. Update scoring logic in orchestrator

### Creating Custom Rules
1. Define rule structure in rules engine
2. Implement rule function
3. Add to rule set configuration
4. Test with sample contracts

### Extending AI Models
1. Configure model endpoint
2. Update inference payload
3. Integrate scoring results
4. Validate model versions

## Deployment

### Contract Deployment
```bash
# Build optimized contract
make codeguard.build

# Deploy to testnet (requires setup)
make codeguard.deploy-contract
```

### Service Deployment
```bash
# Using Docker Compose
docker-compose -f docker-compose.codeguard.yml up -d

# Using Kubernetes
kubectl apply -f helm/codeguard/
```

## Monitoring and Observability

### Health Checks
- `/health` endpoints on all services
- Service dependency validation
- Resource utilization monitoring

### Metrics
- Scan completion rates
- Analysis processing times
- Rule violation statistics
- Contract verification status

### Logging
- Structured logging for all components
- Scan audit trails
- Error tracking and alerting

## Troubleshooting

### Common Issues

#### Contract Build Fails
```bash
# Install Rust targets
rustup target add wasm32-unknown-unknown

# Rebuild
make codeguard.build
```

#### Services Won't Start
```bash
# Check dependencies
cd services/codeguard-orchestrator && npm install
cd services/codeguard-worker && npm install
cd services/codeguard-rules && npm install

# Start individually
make codeguard.dev-up
```

#### Scan Submission Fails
```bash
# Verify services are running
curl http://localhost:8080/health
curl http://localhost:8081/health
curl http://localhost:8082/health

# Check environment variables
echo $CODEGUARD_CONTRACT_ADDRESS
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=codeguard:* make codeguard.dev-up
```

## Future Enhancements

### Planned Features
- Enhanced AI model integration
- Multi-chain support
- Real-time monitoring dashboard
- Advanced rule authoring UI
- Integration with CI/CD pipelines

### Research Areas
- Zero-knowledge proof integration
- Formal verification support
- Automated vulnerability patching
- Cross-contract dependency analysis

Return: [Modules Overview](index.md)