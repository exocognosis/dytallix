# Dytallix Bridge Deployment Guide

## 🎯 **Deployment Status: READY FOR TESTNET** ✅

Both Ethereum and Cosmos smart contracts are now compiled and ready for deployment to testnets.

## 📦 **What We've Built**

### **Ethereum Contracts (Sepolia Testnet Ready)**
- **DytallixBridge.sol** - Main bridge contract with asset locking/unlocking
- **WrappedDytallix.sol** - ERC-20 wrapped token implementation  
- **WrappedTokenFactory.sol** - Factory for deploying new wrapped tokens
- **Hardhat deployment infrastructure** with scripts and configuration

### **Cosmos Contracts (Osmosis Testnet Ready)**
- **CosmWasm bridge contract** - Asset management and cross-chain validation
- **Deployment scripts** for Osmosis and Cosmos Hub testnets
- **Full query and execute message handling**

## 🚀 **Deploy to Testnets NOW**

### **Step 1: Deploy Ethereum Bridge to Sepolia**

```bash
cd /Users/rickglenn/Desktop/dytallix/deployment/ethereum-contracts

# Install dependencies (already done)
npm install

# Copy environment template and configure
cp .env.example .env
# Edit .env with your:
# - SEPOLIA_RPC_URL (Infura/Alchemy)
# - PRIVATE_KEY (deployment wallet)
# - ETHERSCAN_API_KEY (for verification)

# Deploy to Sepolia testnet
npm run deploy:sepolia
```

**Required Environment Variables:**
```bash
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=your_private_key_without_0x_prefix
ETHERSCAN_API_KEY=your_etherscan_api_key
BRIDGE_ADMIN=0xYourAdminAddress
VALIDATOR_THRESHOLD=3
BRIDGE_FEE_BPS=10
```

### **Step 2: Deploy Cosmos Bridge to Osmosis Testnet**

```bash
cd /Users/rickglenn/Desktop/dytallix/deployment/cosmos-contracts

# Install Node.js dependencies
npm install

# Build the WASM contract
cargo build --release --target wasm32-unknown-unknown

# Copy environment template and configure  
cp .env.example .env
# Edit .env with your:
# - MNEMONIC (12/24 word seed phrase)
# - OSMOSIS_TESTNET_RPC endpoint
# - Validator addresses

# Deploy to Osmosis testnet
npm run deploy:osmo-testnet
```

**Required Environment Variables:**
```bash
MNEMONIC="your twelve word mnemonic phrase for deployment wallet"
OSMOSIS_TESTNET_RPC=https://rpc.osmotest5.osmosis.zone  
VALIDATOR_THRESHOLD=3
BRIDGE_FEE_BPS=10
VALIDATORS=osmo1validator1,osmo1validator2,osmo1validator3
```

## 💰 **Get Testnet Funds**

### **Sepolia ETH**
- [Sepolia Faucet](https://faucets.chain.link/sepolia)
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)

### **Osmosis Testnet OSMO**
- [Osmosis Testnet Faucet](https://faucet.osmosis.zone/)
- Request via Discord: #faucet channel

## 📊 **After Deployment**

### **Verify Deployment**
1. **Ethereum**: Contracts will be auto-verified on Etherscan
2. **Cosmos**: Query contract state to confirm functionality

### **Configure Bridge**
1. Add supported assets to both contracts
2. Set up validator addresses and signatures
3. Configure bridge fees and thresholds

### **Test Bridge Functionality**
1. Lock assets on source chain
2. Verify cross-chain message transmission
3. Unlock assets on destination chain
4. Test wrapped token minting/burning

## 🔗 **Integration with Dytallix Core**

The deployed contract addresses need to be configured in:

1. **Interoperability Module**:
   ```rust
   // Update in /interoperability/src/connectors/ethereum/mod.rs
   const ETHEREUM_BRIDGE_ADDRESS: &str = "0xDeployedBridgeAddress";
   
   // Update in /interoperability/src/connectors/cosmos/mod.rs  
   const COSMOS_BRIDGE_ADDRESS: &str = "osmo1deployedcontractaddress";
   ```

2. **Frontend Configuration**:
   ```javascript
   // Update in /frontend/src/config/contracts.js
   export const CONTRACTS = {
     ethereum: {
       bridge: "0xDeployedBridgeAddress",
       factory: "0xDeployedFactoryAddress"
     },
     cosmos: {
       bridge: "osmo1deployedcontractaddress"
     }
   };
   ```

## 📋 **Deployment Checklist**

- [ ] Configure environment variables for both chains
- [ ] Fund deployment wallets with testnet tokens
- [ ] Deploy Ethereum contracts to Sepolia
- [ ] Deploy Cosmos contracts to Osmosis testnet
- [ ] Verify contracts on block explorers
- [ ] Add supported assets to bridge contracts
- [ ] Configure validators and thresholds
- [ ] Update Dytallix core with contract addresses
- [ ] Test end-to-end bridge functionality

## 🎉 **Ready to Deploy!**

All contracts are compiled and ready. You can now deploy to testnets and start testing real cross-chain transactions!

**Next Commands:**
```bash
# Deploy Ethereum (from ethereum-contracts directory)
npm run deploy:sepolia

# Deploy Cosmos (from cosmos-contracts directory)  
npm run deploy:osmo-testnet
```

The bridge will be **LIVE** on testnets after deployment! 🚀
