const fs = require('fs');
const path = require('path');

/**
 * Post-Deployment Integration Updater
 * 
 * Automatically updates all integration files and documentation
 * after a successful bridge deployment.
 */

async function updateIntegrationFiles(deploymentData) {
  console.log("🔄 Updating integration files and documentation...");
  
  const network = deploymentData.network;
  const addresses = deploymentData.contracts;
  const config = deploymentData.config;
  const timestamp = deploymentData.timestamp;
  
  try {
    // 1. Update Rust deployed addresses
    await updateRustDeployedAddresses(network, addresses, timestamp);
    
    // 2. Update deployment log
    await updateDeploymentLog(deploymentData);
    
    // 3. Create environment template
    await createEnvironmentTemplate(network, addresses);
    
    // 4. Update integration documentation
    await updateIntegrationDocs(network, addresses, deploymentData);
    
    console.log("✅ All integration files updated successfully");
    
  } catch (error) {
    console.error("❌ Failed to update integration files:", error.message);
    throw error;
  }
}

async function updateRustDeployedAddresses(network, addresses, timestamp) {
  console.log("  📝 Updating Rust deployed addresses...");
  
  const rustFilePath = path.join(
    __dirname, 
    '..',
    '..',
    '..',
    'interoperability',
    'src',
    'connectors',
    'ethereum',
    'deployed_addresses.rs'
  );
  
  let content = fs.readFileSync(rustFilePath, 'utf8');
  
  if (network === 'sepolia') {
    // Update Sepolia addresses
    content = content.replace(
      /pub const SEPOLIA_ADDRESSES: NetworkAddresses = NetworkAddresses \{[\s\S]*?\};/,
      `pub const SEPOLIA_ADDRESSES: NetworkAddresses = NetworkAddresses {
    bridge_address: "${addresses.bridge}",
    factory_address: "${addresses.factory}",
    wrapped_dyt_address: "${addresses.wrappedDyt}",
    chain_id: 11155111,
};`
    );
    
    // Update timestamp comment
    content = content.replace(
      /\/\/\/ Updated: TBD/,
      `/// Updated: ${timestamp}`
    );
  }
  
  fs.writeFileSync(rustFilePath, content);
  console.log(`    ✅ Updated ${network} addresses in Rust file`);
}

async function updateDeploymentLog(deploymentData) {
  console.log("  📖 Updating deployment log...");
  
  const docPath = path.join(__dirname, '..', '..', '..', 'docs', 'DEPLOYMENT_LOG.md');
  let content = fs.readFileSync(docPath, 'utf8');
  
  const network = deploymentData.network;
  const addresses = deploymentData.contracts;
  const config = deploymentData.config;
  const gasUsed = deploymentData.gasUsed;
  const transactions = deploymentData.transactions;
  
  if (network === 'sepolia') {
    // Update status
    content = content.replace(
      /### Deployment Status: 🟡 PENDING/,
      `### Deployment Status: ✅ DEPLOYED`
    );
    
    // Update deployment date
    content = content.replace(
      /\| \*\*Deployment Date\*\* \| TBD \|/,
      `| **Deployment Date** | ${new Date(deploymentData.timestamp).toISOString().split('T')[0]} |`
    );
    
    // Update deployer address
    content = content.replace(
      /\| \*\*Deployer Address\*\* \| TBD \|/,
      `| **Deployer Address** | ${deploymentData.deployer} |`
    );
    
    // Update contract addresses
    content = content.replace(
      /\| \*\*DytallixBridge\*\* \| TBD \| 🟡 Pending \|/,
      `| **DytallixBridge** | \`${addresses.bridge}\` | 🟡 Pending Verification |`
    );
    content = content.replace(
      /\| \*\*WrappedTokenFactory\*\* \| TBD \| 🟡 Pending \|/,
      `| **WrappedTokenFactory** | \`${addresses.factory}\` | 🟡 Pending Verification |`
    );
    content = content.replace(
      /\| \*\*Wrapped DYT Token\*\* \| TBD \| 🟡 Pending \|/,
      `| **Wrapped DYT Token** | \`${addresses.wrappedDyt}\` | 🟡 Pending Verification |`
    );
    
    // Update transaction hashes
    content = content.replace(
      /\| \*\*DytallixBridge\*\* \| TBD \|/,
      `| **DytallixBridge** | \`${transactions.bridge}\` |`
    );
    content = content.replace(
      /\| \*\*WrappedTokenFactory\*\* \| TBD \|/,
      `| **WrappedTokenFactory** | \`${transactions.factory}\` |`
    );
    content = content.replace(
      /\| \*\*Wrapped DYT Token\*\* \| TBD \|/,
      `| **Wrapped DYT Token** | \`${transactions.wrappedDyt}\` |`
    );
    
    // Update configuration
    content = content.replace(
      /\| \*\*Validator Threshold\*\* \| TBD \|/,
      `| **Validator Threshold** | ${config.validatorThreshold} |`
    );
    content = content.replace(
      /\| \*\*Bridge Fee \(bps\)\*\* \| TBD \|/,
      `| **Bridge Fee (bps)** | ${config.bridgeFeeBps} |`
    );
    content = content.replace(
      /\| \*\*Admin Address\*\* \| TBD \|/,
      `| **Admin Address** | \`${config.bridgeAdmin}\` |`
    );
    
    // Update gas usage
    content = content.replace(
      /\| \*\*Bridge Deployment\*\* \| TBD \| TBD \|/,
      `| **Bridge Deployment** | ${gasUsed.bridge} | ${(parseInt(gasUsed.bridge) * 20e-9).toFixed(4)} ETH |`
    );
    content = content.replace(
      /\| \*\*Factory Deployment\*\* \| TBD \| TBD \|/,
      `| **Factory Deployment** | ${gasUsed.factory} | ${(parseInt(gasUsed.factory) * 20e-9).toFixed(4)} ETH |`
    );
    content = content.replace(
      /\| \*\*Token Creation\*\* \| TBD \| TBD \|/,
      `| **Token Creation** | ${gasUsed.wrappedDyt} | ${(parseInt(gasUsed.wrappedDyt) * 20e-9).toFixed(4)} ETH |`
    );
    content = content.replace(
      /\| \*\*Total\*\* \| TBD \| TBD \|/,
      `| **Total** | ${gasUsed.total} | ${gasUsed.totalEth} |`
    );
    
    // Update verification commands
    content = content.replace(
      /npx hardhat verify --network sepolia <BRIDGE_ADDRESS>/,
      `npx hardhat verify --network sepolia ${addresses.bridge}`
    );
    content = content.replace(
      /npx hardhat verify --network sepolia <FACTORY_ADDRESS> <BRIDGE_ADDRESS>/,
      `npx hardhat verify --network sepolia ${addresses.factory} ${addresses.bridge}`
    );
    content = content.replace(
      /npx hardhat verify --network sepolia <WRAPPED_DYT_ADDRESS>/,
      `npx hardhat verify --network sepolia ${addresses.wrappedDyt}`
    );
    
    // Update environment variables
    content = content.replace(
      /SEPOLIA_BRIDGE_ADDRESS=<BRIDGE_ADDRESS>/,
      `SEPOLIA_BRIDGE_ADDRESS=${addresses.bridge}`
    );
    content = content.replace(
      /SEPOLIA_FACTORY_ADDRESS=<FACTORY_ADDRESS>/,
      `SEPOLIA_FACTORY_ADDRESS=${addresses.factory}`
    );
    content = content.replace(
      /SEPOLIA_WRAPPED_DYT_ADDRESS=<WRAPPED_DYT_ADDRESS>/,
      `SEPOLIA_WRAPPED_DYT_ADDRESS=${addresses.wrappedDyt}`
    );
    
    // Update Rust integration
    content = content.replace(
      /pub const SEPOLIA_BRIDGE_ADDRESS: &str = "<BRIDGE_ADDRESS>";/,
      `pub const SEPOLIA_BRIDGE_ADDRESS: &str = "${addresses.bridge}";`
    );
    content = content.replace(
      /pub const SEPOLIA_FACTORY_ADDRESS: &str = "<FACTORY_ADDRESS>";/,
      `pub const SEPOLIA_FACTORY_ADDRESS: &str = "${addresses.factory}";`
    );
    content = content.replace(
      /pub const SEPOLIA_WRAPPED_DYT_ADDRESS: &str = "<WRAPPED_DYT_ADDRESS>";/,
      `pub const SEPOLIA_WRAPPED_DYT_ADDRESS: &str = "${addresses.wrappedDyt}";`
    );
    
    // Update Etherscan links
    content = content.replace(
      /- \*\*Etherscan Bridge\*\*: \[TBD\]\(https:\/\/sepolia\.etherscan\.io\/address\/\)/,
      `- **Etherscan Bridge**: [${addresses.bridge}](https://sepolia.etherscan.io/address/${addresses.bridge})`
    );
    content = content.replace(
      /- \*\*Etherscan Factory\*\*: \[TBD\]\(https:\/\/sepolia\.etherscan\.io\/address\/\)/,
      `- **Etherscan Factory**: [${addresses.factory}](https://sepolia.etherscan.io/address/${addresses.factory})`
    );
    content = content.replace(
      /- \*\*Etherscan Wrapped DYT\*\*: \[TBD\]\(https:\/\/sepolia\.etherscan\.io\/address\/\)/,
      `- **Etherscan Wrapped DYT**: [${addresses.wrappedDyt}](https://sepolia.etherscan.io/address/${addresses.wrappedDyt})`
    );
    
    // Update deployment history
    const deploymentDate = new Date(deploymentData.timestamp).toISOString().split('T')[0];
    content = content.replace(
      /\| TBD \| Sepolia \| v1\.0\.0 \| 🟡 Pending \| Initial testnet deployment \|/,
      `| ${deploymentDate} | Sepolia | v1.0.0 | ✅ Deployed | Initial testnet deployment |`
    );
  }
  
  fs.writeFileSync(docPath, content);
  console.log("    ✅ Updated deployment log");
}

async function createEnvironmentTemplate(network, addresses) {
  console.log("  🔧 Creating environment template...");
  
  const envPath = path.join(__dirname, '..', 'deployments', network, '.env.integration');
  
  const envContent = `# Integration Environment Variables for ${network.toUpperCase()}
# Generated automatically after deployment

# Network Configuration
ETHEREUM_NETWORK=${network}
ETHEREUM_CHAIN_ID=${network === 'sepolia' ? '11155111' : '1'}

# Contract Addresses
BRIDGE_CONTRACT_ADDRESS=${addresses.bridge}
FACTORY_CONTRACT_ADDRESS=${addresses.factory}
WRAPPED_DYT_ADDRESS=${addresses.wrappedDyt}

# Etherscan URLs
BRIDGE_ETHERSCAN_URL=https://${network === 'sepolia' ? 'sepolia.' : ''}etherscan.io/address/${addresses.bridge}
FACTORY_ETHERSCAN_URL=https://${network === 'sepolia' ? 'sepolia.' : ''}etherscan.io/address/${addresses.factory}
WRAPPED_DYT_ETHERSCAN_URL=https://${network === 'sepolia' ? 'sepolia.' : ''}etherscan.io/address/${addresses.wrappedDyt}

# Integration Configuration
BRIDGE_ENABLED=true
BRIDGE_MIN_CONFIRMATIONS=6
BRIDGE_MAX_RETRY_ATTEMPTS=3
`;

  fs.writeFileSync(envPath, envContent);
  console.log(`    ✅ Created environment template at deployments/${network}/.env.integration`);
}

async function updateIntegrationDocs(network, addresses, deploymentData) {
  console.log("  📚 Creating integration documentation...");
  
  const integrationPath = path.join(__dirname, '..', 'deployments', network, 'INTEGRATION.md');
  
  const integrationContent = `# ${network.toUpperCase()} Integration Guide

## Overview
This document provides integration information for the Dytallix Bridge deployed on ${network} testnet.

## Contract Addresses

| Contract | Address | Purpose |
|----------|---------|---------|
| **DytallixBridge** | \`${addresses.bridge}\` | Main bridge contract for cross-chain transfers |
| **WrappedTokenFactory** | \`${addresses.factory}\` | Factory for creating wrapped tokens |
| **Wrapped DYT Token** | \`${addresses.wrappedDyt}\` | Wrapped DYT token for Ethereum |

## Integration Steps

### 1. Environment Setup
Add these variables to your environment:

\`\`\`bash
BRIDGE_CONTRACT_ADDRESS=${addresses.bridge}
FACTORY_CONTRACT_ADDRESS=${addresses.factory}
WRAPPED_DYT_ADDRESS=${addresses.wrappedDyt}
ETHEREUM_NETWORK=${network}
ETHEREUM_CHAIN_ID=${network === 'sepolia' ? '11155111' : '1'}
\`\`\`

### 2. Contract ABIs
Contract ABIs are available in:
- \`deployments/${network}/abis/DytallixBridge.json\`
- \`deployments/${network}/abis/WrappedTokenFactory.json\`

### 3. Rust Integration
Update your Rust code to use the deployed addresses:

\`\`\`rust
use crate::connectors::ethereum::{get_network_addresses, SEPOLIA_ADDRESSES};

let addresses = get_network_addresses(11155111).unwrap();
println!("Bridge address: {}", addresses.bridge_address);
\`\`\`

### 4. Web3 Integration
Example JavaScript integration:

\`\`\`javascript
const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('${network === 'sepolia' ? 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID' : 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID'}');
const bridgeAddress = '${addresses.bridge}';

// Load contract ABI and create contract instance
const bridgeAbi = require('./deployments/${network}/abis/DytallixBridge.json');
const bridge = new ethers.Contract(bridgeAddress, bridgeAbi, provider);
\`\`\`

## Testing

### Basic Bridge Test
\`\`\`bash
# Test bridge configuration
npx hardhat run scripts/verify-deployment.js --network ${network}

# Test asset locking (requires tokens)
npx hardhat run scripts/test-bridge.js --network ${network}
\`\`\`

### Functionality Checklist
- [ ] Bridge contract is not paused
- [ ] Wrapped DYT token is supported
- [ ] Bridge configuration is correct
- [ ] Event monitoring works
- [ ] Cross-chain transfers complete

## Monitoring

### Events to Monitor
- \`AssetLocked\`: When assets are locked for cross-chain transfer
- \`AssetUnlocked\`: When assets are unlocked after transfer
- \`AssetAdded\`: When new assets are supported
- \`ValidatorAdded\`: When validators are added

### Health Checks
- Bridge pause status: Should be \`false\`
- Validator count: Should meet threshold requirements
- Asset support: Wrapped DYT should be supported

## Support

- **Repository**: [dytallix](https://github.com/HisMadRealm/dytallix)
- **Documentation**: [Bridge Documentation](../../docs/DEPLOYMENT_LOG.md)
- **Network**: ${network} testnet
- **Chain ID**: ${network === 'sepolia' ? '11155111' : '1'}

---
*Generated on ${new Date(deploymentData.timestamp).toISOString()}*
`;

  fs.writeFileSync(integrationPath, integrationContent);
  console.log(`    ✅ Created integration guide at deployments/${network}/INTEGRATION.md`);
}

// Export for use by deployment scripts
module.exports = { updateIntegrationFiles };

// Command line usage
if (require.main === module) {
  const network = process.argv[2] || 'sepolia';
  const deploymentPath = path.join(__dirname, '..', 'deployments', network, 'deployment.json');
  
  if (!fs.existsSync(deploymentPath)) {
    console.error(`❌ Deployment record not found: ${deploymentPath}`);
    process.exit(1);
  }
  
  const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  
  updateIntegrationFiles(deploymentData)
    .then(() => {
      console.log("🎉 Integration files updated successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Failed to update integration files:", error);
      process.exit(1);
    });
}