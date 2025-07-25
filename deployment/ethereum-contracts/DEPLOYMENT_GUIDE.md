# Complete Bridge Deployment Guide

This guide provides step-by-step instructions for deploying the Dytallix Bridge to Ethereum Sepolia testnet with complete automation and verification.

## Prerequisites

### 1. Environment Setup
- Node.js 18+ installed
- npm or yarn package manager
- Git repository access
- Ethereum wallet with Sepolia ETH for deployment

### 2. Required API Keys
- **Infura/Alchemy Project ID**: For Ethereum RPC access
- **Etherscan API Key**: For contract verification
- **Private Key**: For deployment transactions (keep secure!)

### 3. Minimum Requirements
- **Sepolia ETH**: At least 0.05 ETH for deployment costs
- **Gas Price**: Be aware of current network conditions

## Quick Deployment

### 1. Install Dependencies
```bash
cd deployment/ethereum-contracts
npm install
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your credentials
nano .env
```

Required environment variables:
```bash
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=your_private_key_without_0x_prefix
ETHERSCAN_API_KEY=your_etherscan_api_key
BRIDGE_ADMIN=0x...  # Optional, defaults to deployer address
VALIDATOR_THRESHOLD=2  # Optional, defaults to 2
BRIDGE_FEE_BPS=10  # Optional, 0.1% fee
```

### 3. Deploy Bridge (Complete)
```bash
npm run deploy:sepolia:complete
```

This single command will:
- ✅ Deploy all bridge contracts (Bridge, Factory, Wrapped DYT)
- ✅ Configure initial settings
- ✅ Save deployment records and ABIs
- ✅ Update integration files automatically
- ✅ Generate comprehensive documentation

### 4. Verify Deployment
```bash
npm run verify:deployment
```

### 5. Verify Contracts on Etherscan (Manual)
```bash
# Commands will be displayed after deployment, example:
npx hardhat verify --network sepolia 0x... 
```

## Advanced Configuration

### Custom Validator Setup
```bash
# Set validators before deployment
export VALIDATORS="0x1234...,0x5678...,0x9abc..."
npm run deploy:sepolia:complete
```

### Post-Deployment Configuration
```bash
# Add more validators or assets
export ADDITIONAL_VALIDATORS="0xdef..."
export ADDITIONAL_ASSETS='[{"symbol":"USDC","address":"0x..."}]'
npm run configure:bridge
```

## Deployment Verification

### Automated Checks
The deployment includes comprehensive verification:

1. **Contract Deployment**: All contracts deployed successfully
2. **Gas Usage Analysis**: Reasonable gas consumption
3. **Configuration Validation**: Settings match expected values
4. **Functionality Tests**: Basic bridge operations work
5. **Integration Readiness**: Files updated for development

### Manual Verification Steps

1. **Check Etherscan**: Verify contracts are visible and correct
2. **Test Transactions**: Send small test transfers
3. **Monitor Events**: Ensure event monitoring works
4. **Integration Tests**: Run full integration test suite

## File Structure After Deployment

```
deployment/ethereum-contracts/
├── deployments/sepolia/
│   ├── deployment.json         # Complete deployment record
│   ├── addresses.json          # Contract addresses
│   ├── verification-results.json  # Verification results
│   ├── .env.integration        # Environment variables
│   ├── INTEGRATION.md          # Integration guide
│   └── abis/
│       ├── DytallixBridge.json
│       └── WrappedTokenFactory.json
├── scripts/
│   ├── deploy-bridge-complete.js    # Main deployment
│   ├── verify-deployment.js         # Post-deployment verification
│   ├── configure-bridge.js          # Bridge configuration
│   └── update-integration-files.js  # Integration updater
└── docs/DEPLOYMENT_LOG.md            # Updated deployment log
```

## Integration Updates

After deployment, the following files are automatically updated:

### 1. Rust Integration
```rust
// interoperability/src/connectors/ethereum/deployed_addresses.rs
pub const SEPOLIA_ADDRESSES: NetworkAddresses = NetworkAddresses {
    bridge_address: "0x...", // Updated automatically
    factory_address: "0x...", // Updated automatically
    wrapped_dyt_address: "0x...", // Updated automatically
    chain_id: 11155111,
};
```

### 2. Documentation
- `docs/DEPLOYMENT_LOG.md` - Updated with deployment details
- `deployments/sepolia/INTEGRATION.md` - Integration guide

### 3. Environment Templates
- `deployments/sepolia/.env.integration` - Environment variables

## Troubleshooting

### Common Issues

#### 1. "Insufficient Balance" Error
```bash
# Check your balance
npx hardhat run scripts/check-balance.js --network sepolia

# Get more Sepolia ETH from faucets:
# - https://faucet.quicknode.com/ethereum/sepolia
# - https://sepoliafaucet.com/
```

#### 2. "Gas Price Too High" Error
```bash
# Wait for lower gas prices or increase gas limit
export GAS_LIMIT=6000000
npm run deploy:sepolia:complete
```

#### 3. "Contract Verification Failed"
```bash
# Manually verify using displayed commands
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> [CONSTRUCTOR_ARGS]
```

#### 4. "RPC Connection Failed"
```bash
# Check RPC URL and API key
curl -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' $SEPOLIA_RPC_URL
```

### Recovery Procedures

#### Partial Deployment Failure
```bash
# Check what was deployed
cat deployments/sepolia/failed-deployment.json

# Resume from specific step if needed
# (Manual intervention may be required)
```

#### Integration Update Failure
```bash
# Manually run integration updater
npm run update:integration sepolia
```

## Security Considerations

### 1. Private Key Security
- ⚠️ **Never commit private keys to git**
- ✅ Use environment variables or secure key management
- ✅ Use different keys for testnet and mainnet

### 2. Contract Security
- ✅ All contracts are upgradeable with admin controls
- ✅ Bridge can be paused in emergencies
- ✅ Multi-signature validation for cross-chain transfers

### 3. Operational Security
- ✅ Validate all addresses before sending funds
- ✅ Start with small test transfers
- ✅ Monitor all bridge operations

## Next Steps

After successful Sepolia deployment:

1. **Integration Testing**: Test all bridge functionality
2. **Performance Testing**: Validate under load
3. **Security Audit**: Professional security review
4. **Mainnet Preparation**: Plan mainnet deployment
5. **Documentation**: Update user documentation
6. **Monitoring**: Set up production monitoring

## Support

- **Repository**: [dytallix](https://github.com/HisMadRealm/dytallix)
- **Issues**: Use GitHub issues for bug reports
- **Documentation**: Check `docs/` directory for more information

---

## Quick Reference

### Essential Commands
```bash
# Complete deployment
npm run deploy:sepolia:complete

# Verify deployment
npm run verify:deployment

# Configure bridge
npm run configure:bridge

# Update integration files
npm run update:integration
```

### Important Files
- **Deployment Record**: `deployments/sepolia/deployment.json`
- **Contract Addresses**: `deployments/sepolia/addresses.json`
- **Integration Guide**: `deployments/sepolia/INTEGRATION.md`
- **Deployment Log**: `docs/DEPLOYMENT_LOG.md`