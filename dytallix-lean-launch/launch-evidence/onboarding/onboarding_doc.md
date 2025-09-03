# Dytallix Onboarding Walkthrough

This document provides a comprehensive end-to-end walkthrough for developers getting started with the Dytallix blockchain system, covering the complete flow from initial setup to governance participation.

## Overview

The Dytallix onboarding process includes:
1. **Key Generation** - Creating quantum-resistant cryptographic keys
2. **Faucet Funding** - Obtaining testnet tokens for development
3. **WASM Deployment** - Deploying smart contracts to the blockchain
4. **Governance Participation** - Creating and voting on proposals
5. **AI Risk Management** - Interacting with AI safety systems

## Prerequisites

- Node.js 18+ installed
- Docker and Docker Compose available
- Basic understanding of blockchain concepts
- Familiarity with command-line interfaces

## Step 1: Environment Setup

### 1.1 Clone and Setup Repository

```bash
git clone https://github.com/HisMadRealm/dytallix.git
cd dytallix
npm install
```

### 1.2 Initialize Development Environment

```bash
# Start the development environment
npm run start:faucet:dev

# In a separate terminal, verify system health
npm run self-test
```

## Step 2: Key Generation

### 2.1 Generate Post-Quantum Cryptographic Keys

Dytallix uses post-quantum cryptography (PQC) for enhanced security against quantum computing threats.

```bash
# Navigate to the lean launch directory
cd dytallix-lean-launch

# Generate a new PQC mnemonic
npm run gen-pqc-mnemonic
```

**Expected Output:**
```
Generated PQC mnemonic: [24-word mnemonic phrase]
Private key: [hex-encoded private key]
Public key: [hex-encoded public key]
Address: dytallix1[bech32-encoded address]
```

**Example Transaction Hash:** `ABC123DEF456...` *(placeholder - will be populated during actual testing)*

### 2.2 Secure Key Storage

Store your mnemonic phrase securely:
- Never share your private key or mnemonic
- Use a hardware wallet for mainnet operations
- Keep multiple encrypted backups

## Step 3: Faucet Funding

### 3.1 Request Testnet Tokens

```bash
# Fund your address from the testnet faucet
npm run faucet:fund -- --address dytallix1[your-address]
```

**Expected Output:**
```
Faucet request submitted successfully
Transaction hash: [transaction-hash]
Amount: 1000000 udyt
Status: Success
```

**Example Funding Transaction:** `DEF789ABC123...` *(placeholder - will be populated during actual testing)*

### 3.2 Verify Balance

```bash
# Check your account balance
./dytallixd query bank balances dytallix1[your-address]
```

## Step 4: WASM Smart Contract Deployment

### 4.1 Prepare Contract

```bash
# Build the sample counter contract
cd smart-contracts/counter
cargo build --release --target wasm32-unknown-unknown

# Optimize the WASM binary
docker run --rm -v "$(pwd)":/code \
  --mount type=volume,source="$(basename "$(pwd)")_cache",target=/code/target \
  --mount type=volume,source=registry_cache,target=/usr/local/cargo/registry \
  cosmwasm/rust-optimizer:0.12.13
```

### 4.2 Deploy Contract

```bash
# Store the contract on-chain
./dytallixd tx wasm store artifacts/counter.wasm \
  --from [your-key-name] \
  --gas 2000000 \
  --gas-prices 0.025udyt \
  --broadcast-mode block

# Instantiate the contract
./dytallixd tx wasm instantiate [code-id] '{"count": 0}' \
  --from [your-key-name] \
  --label "counter-demo" \
  --gas 1000000 \
  --gas-prices 0.025udyt \
  --broadcast-mode block
```

**Example Deployment Transaction:** `GHI456JKL789...` *(placeholder - will be populated during actual testing)*

### 4.3 Interact with Contract

```bash
# Query contract state
./dytallixd query wasm contract-state smart [contract-address] '{"get_count": {}}'

# Execute contract function
./dytallixd tx wasm execute [contract-address] '{"increment": {}}' \
  --from [your-key-name] \
  --gas 500000 \
  --gas-prices 0.025udyt
```

## Step 5: Governance Participation

### 5.1 Create a Governance Proposal

```bash
# Submit a text proposal
./dytallixd tx gov submit-proposal \
  --title "Sample Proposal" \
  --description "This is a test proposal for onboarding demonstration" \
  --type Text \
  --deposit 10000000udyt \
  --from [your-key-name] \
  --gas 500000 \
  --gas-prices 0.025udyt
```

**Example Proposal Transaction:** `JKL789MNO012...` *(placeholder - will be populated during actual testing)*

### 5.2 Vote on Proposals

```bash
# List active proposals
./dytallixd query gov proposals --status voting_period

# Vote on a proposal (options: yes, no, abstain, no_with_veto)
./dytallixd tx gov vote [proposal-id] yes \
  --from [your-key-name] \
  --gas 200000 \
  --gas-prices 0.025udyt
```

**Example Vote Transaction:** `MNO012PQR345...` *(placeholder - will be populated during actual testing)*

### 5.3 Monitor Proposal Status

```bash
# Check proposal details
./dytallixd query gov proposal [proposal-id]

# Check voting results
./dytallixd query gov tally [proposal-id]
```

## Step 6: AI Risk Management Integration

### 6.1 Query AI Risk Assessment

```bash
# Check AI risk monitoring status
curl -X GET "http://localhost:8080/api/ai-risk/status" \
  -H "Authorization: Bearer [your-api-token]"
```

**Expected Response:**
```json
{
  "status": "monitoring",
  "risk_level": "low",
  "last_assessment": "2024-01-15T10:30:00Z",
  "active_safeguards": ["behavioral_monitoring", "capability_limiting"]
}
```

### 6.2 Submit Risk Assessment Request

```bash
# Request AI risk evaluation for a specific scenario
curl -X POST "http://localhost:8080/api/ai-risk/assess" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [your-api-token]" \
  -d '{
    "scenario": "smart_contract_deployment",
    "parameters": {
      "contract_complexity": "medium",
      "automation_level": "supervised"
    }
  }'
```

**Example Assessment Transaction:** `PQR345STU678...` *(placeholder - will be populated during actual testing)*

## Step 7: System Monitoring and Observability

### 7.1 Access Monitoring Dashboard

Navigate to the Grafana dashboard at `http://localhost:3000` (default credentials: admin/admin)

Key metrics to monitor:
- **Transaction throughput**: Blocks per second and transactions per block
- **Network health**: Validator uptime and consensus participation  
- **Resource usage**: CPU, memory, and disk utilization
- **PQC performance**: Signature generation and verification times

### 7.2 View System Logs

```bash
# View blockchain node logs
docker logs dytallix-node -f

# View faucet service logs
docker logs dytallix-faucet -f

# View AI risk service logs
docker logs dytallix-ai-risk -f
```

## Step 8: Advanced Features

### 8.1 Cross-Chain Bridge Operations

```bash
# Initiate cross-chain transfer (placeholder)
# Actual implementation will be available in future releases
echo "Cross-chain bridge operations coming soon"
```

### 8.2 Staking and Validation

```bash
# Delegate tokens to a validator
./dytallixd tx staking delegate [validator-address] 1000000udyt \
  --from [your-key-name] \
  --gas 300000 \
  --gas-prices 0.025udyt

# Check delegation status
./dytallixd query staking delegations [your-address]
```

## Troubleshooting

### Common Issues

1. **Connection Refused**: Ensure all services are running with `docker-compose up -d`
2. **Insufficient Funds**: Request more tokens from the faucet
3. **Gas Estimation Failed**: Increase gas limit or check transaction parameters
4. **Key Not Found**: Verify key name and ensure it's properly imported

### Support Resources

- **Documentation**: `/docs` directory in the repository
- **API Reference**: `http://localhost:8080/swagger` when services are running
- **Community**: GitHub Discussions and Issues
- **Security**: Report security issues privately via security@dytallix.com

## Next Steps

After completing this onboarding walkthrough:

1. **Explore Advanced Features**: Dive deeper into smart contract development
2. **Join the Community**: Participate in governance discussions
3. **Contribute**: Submit improvements and bug reports
4. **Stay Updated**: Follow release notes and security advisories

## Evidence Collection

During your onboarding process, collect the following evidence:
- Screenshots of successful key generation
- Transaction hashes from faucet funding
- Contract deployment confirmations
- Governance participation records
- AI risk assessment responses

Store these in the `launch-evidence/onboarding/onboarding_screenshots/` directory for audit purposes.

---

**Document Version**: 1.0  
**Last Updated**: {{ current_date }}  
**Next Review**: {{ next_review_date }}  

*This document serves as evidence of comprehensive onboarding procedures for launch readiness validation.*