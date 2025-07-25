const { ethers, upgrades } = require("hardhat");
const fs = require('fs');
const path = require('path');
require("dotenv").config();

/**
 * Enhanced Bridge Deployment Script for Ethereum Sepolia Testnet
 * 
 * Features:
 * - Complete contract deployment with initialization
 * - Gas usage reporting and optimization
 * - Deployment record keeping
 * - Contract verification preparation
 * - ABI saving for integration
 * - Comprehensive error handling
 * - Multi-signature validator setup
 * - Initial asset configuration
 */

async function main() {
  console.log("🚀 Starting Enhanced Dytallix Bridge Deployment to Sepolia Testnet");
  console.log("=" .repeat(70));
  
  // Deployment configuration
  const config = {
    network: "sepolia",
    validatorThreshold: parseInt(process.env.VALIDATOR_THRESHOLD) || 2,
    bridgeFeeBps: parseInt(process.env.BRIDGE_FEE_BPS) || 10, // 0.1%
    bridgeAdmin: process.env.BRIDGE_ADMIN || null,
    maxValidators: parseInt(process.env.MAX_VALIDATORS) || 5,
    initialValidators: process.env.VALIDATORS ? process.env.VALIDATORS.split(',').map(v => v.trim()) : [],
    gasLimit: process.env.GAS_LIMIT || 5000000,
    gasPrice: process.env.GAS_PRICE || null // Use network default if not specified
  };

  console.log("📋 Deployment Configuration:");
  console.log(`  Network: ${config.network}`);
  console.log(`  Validator Threshold: ${config.validatorThreshold}`);
  console.log(`  Bridge Fee (bps): ${config.bridgeFeeBps}`);
  console.log(`  Max Validators: ${config.maxValidators}`);
  console.log(`  Initial Validators: ${config.initialValidators.length}`);
  console.log("");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const deployerBalance = await deployer.provider.getBalance(deployerAddress);
  
  console.log("👤 Deployer Information:");
  console.log(`  Address: ${deployerAddress}`);
  console.log(`  Balance: ${ethers.formatEther(deployerBalance)} ETH`);
  
  // Set bridge admin to deployer if not specified
  if (!config.bridgeAdmin) {
    config.bridgeAdmin = deployerAddress;
  }
  console.log(`  Bridge Admin: ${config.bridgeAdmin}`);
  console.log("");

  // Check minimum balance
  const minBalance = ethers.parseEther("0.05"); // 0.05 ETH minimum
  if (deployerBalance < minBalance) {
    throw new Error(`Insufficient balance. Need at least 0.05 ETH for deployment, have ${ethers.formatEther(deployerBalance)} ETH`);
  }

  // Validate configuration
  if (config.validatorThreshold > config.maxValidators) {
    throw new Error("Validator threshold cannot exceed maximum validators");
  }
  
  if (config.initialValidators.length > 0 && config.initialValidators.length < config.validatorThreshold) {
    console.warn("⚠️  Warning: Initial validators count is less than threshold");
  }

  // Deployment tracking
  const deploymentRecord = {
    network: config.network,
    chainId: (await deployer.provider.getNetwork()).chainId.toString(),
    timestamp: new Date().toISOString(),
    deployer: deployerAddress,
    config: config,
    contracts: {},
    transactions: {},
    gasUsed: {},
    verification: {},
    errors: []
  };

  let totalGasUsed = 0n;

  try {
    // Step 1: Deploy DytallixBridge (Upgradeable)
    console.log("📦 Step 1: Deploying DytallixBridge (Upgradeable)...");
    
    const DytallixBridge = await ethers.getContractFactory("DytallixBridge");
    
    // Estimate gas for deployment
    console.log("⛽ Estimating gas for DytallixBridge deployment...");
    
    const bridge = await upgrades.deployProxy(
      DytallixBridge,
      [config.bridgeAdmin, config.validatorThreshold, config.bridgeFeeBps],
      { 
        initializer: 'initialize',
        kind: 'uups' // Use UUPS upgradeable pattern
      }
    );

    const bridgeDeployTx = await bridge.waitForDeployment();
    const bridgeAddress = await bridge.getAddress();
    const bridgeReceipt = await deployer.provider.getTransactionReceipt(bridge.deploymentTransaction().hash);
    
    deploymentRecord.contracts.bridge = bridgeAddress;
    deploymentRecord.transactions.bridge = bridge.deploymentTransaction().hash;
    deploymentRecord.gasUsed.bridge = bridgeReceipt.gasUsed.toString();
    totalGasUsed += bridgeReceipt.gasUsed;

    console.log("✅ DytallixBridge deployed successfully");
    console.log(`   Address: ${bridgeAddress}`);
    console.log(`   Transaction: ${bridge.deploymentTransaction().hash}`);
    console.log(`   Gas Used: ${bridgeReceipt.gasUsed.toString()}`);
    console.log("");

    // Step 2: Deploy WrappedTokenFactory
    console.log("📦 Step 2: Deploying WrappedTokenFactory...");
    
    const WrappedTokenFactory = await ethers.getContractFactory("WrappedTokenFactory");
    const factory = await WrappedTokenFactory.deploy(bridgeAddress);
    await factory.waitForDeployment();
    
    const factoryAddress = await factory.getAddress();
    const factoryReceipt = await deployer.provider.getTransactionReceipt(factory.deploymentTransaction().hash);
    
    deploymentRecord.contracts.factory = factoryAddress;
    deploymentRecord.transactions.factory = factory.deploymentTransaction().hash;
    deploymentRecord.gasUsed.factory = factoryReceipt.gasUsed.toString();
    totalGasUsed += factoryReceipt.gasUsed;

    console.log("✅ WrappedTokenFactory deployed successfully");
    console.log(`   Address: ${factoryAddress}`);
    console.log(`   Transaction: ${factory.deploymentTransaction().hash}`);
    console.log(`   Gas Used: ${factoryReceipt.gasUsed.toString()}`);
    console.log("");

    // Step 3: Create Initial Wrapped DYT Token
    console.log("📦 Step 3: Creating Wrapped DYT Token...");
    
    const createWrappedTx = await factory.createWrappedToken(
      "dytallix:dyt",
      "Wrapped Dytallix",
      "wDYT",
      "dytallix",
      "0x0000000000000000000000000000000000000000" // Placeholder for native DYT
    );
    const createReceipt = await createWrappedTx.wait();
    
    const wrappedDytAddress = await factory.getWrappedToken("dytallix:dyt");
    
    deploymentRecord.contracts.wrappedDyt = wrappedDytAddress;
    deploymentRecord.transactions.wrappedDyt = createWrappedTx.hash;
    deploymentRecord.gasUsed.wrappedDyt = createReceipt.gasUsed.toString();
    totalGasUsed += createReceipt.gasUsed;

    console.log("✅ Wrapped DYT Token created successfully");
    console.log(`   Address: ${wrappedDytAddress}`);
    console.log(`   Transaction: ${createWrappedTx.hash}`);
    console.log(`   Gas Used: ${createReceipt.gasUsed.toString()}`);
    console.log("");

    // Step 4: Configure Bridge
    console.log("⚙️  Step 4: Configuring Bridge...");
    
    // Add wrapped DYT as supported asset
    console.log("   Adding wrapped DYT as supported asset...");
    const addAssetTx = await bridge.addSupportedAsset(wrappedDytAddress);
    const addAssetReceipt = await addAssetTx.wait();
    totalGasUsed += addAssetReceipt.gasUsed;
    
    console.log(`   ✅ Wrapped DYT added as supported asset (Gas: ${addAssetReceipt.gasUsed.toString()})`);

    // Step 5: Set up validators
    if (config.initialValidators.length > 0) {
      console.log("👥 Step 5: Setting up validators...");
      
      for (const validator of config.initialValidators) {
        if (ethers.isAddress(validator)) {
          try {
            console.log(`   Adding validator: ${validator}`);
            const addValidatorTx = await bridge.addValidator(validator);
            const validatorReceipt = await addValidatorTx.wait();
            totalGasUsed += validatorReceipt.gasUsed;
            console.log(`   ✅ Validator added (Gas: ${validatorReceipt.gasUsed.toString()})`);
          } catch (error) {
            console.log(`   ❌ Failed to add validator ${validator}: ${error.message}`);
            deploymentRecord.errors.push(`Failed to add validator ${validator}: ${error.message}`);
          }
        } else {
          console.log(`   ⚠️  Skipping invalid validator address: ${validator}`);
          deploymentRecord.errors.push(`Invalid validator address: ${validator}`);
        }
      }
      console.log("");
    }

    // Step 6: Save deployment information
    console.log("💾 Step 6: Saving deployment information...");
    
    deploymentRecord.gasUsed.total = totalGasUsed.toString();
    deploymentRecord.gasUsed.totalEth = ethers.formatEther(totalGasUsed * BigInt(bridgeReceipt.gasPrice || 0));
    
    // Create deployments directory if it doesn't exist
    const deploymentDir = path.join(__dirname, '..', 'deployments', config.network);
    if (!fs.existsSync(deploymentDir)) {
      fs.mkdirSync(deploymentDir, { recursive: true });
    }
    
    // Save deployment record
    const deploymentPath = path.join(deploymentDir, 'deployment.json');
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentRecord, null, 2));
    console.log(`   ✅ Deployment record saved to ${deploymentPath}`);
    
    // Save contract addresses for easy access
    const addressesPath = path.join(deploymentDir, 'addresses.json');
    const addresses = {
      network: config.network,
      chainId: deploymentRecord.chainId,
      bridge: bridgeAddress,
      factory: factoryAddress,
      wrappedDyt: wrappedDytAddress,
      deployer: deployerAddress,
      timestamp: deploymentRecord.timestamp
    };
    fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
    console.log(`   ✅ Contract addresses saved to ${addressesPath}`);
    
    // Save ABIs for integration
    console.log("   Saving contract ABIs...");
    const abiDir = path.join(deploymentDir, 'abis');
    if (!fs.existsSync(abiDir)) {
      fs.mkdirSync(abiDir, { recursive: true });
    }
    
    // Save bridge ABI
    const bridgeAbi = DytallixBridge.interface.format('json');
    fs.writeFileSync(path.join(abiDir, 'DytallixBridge.json'), bridgeAbi);
    
    // Save factory ABI
    const factoryAbi = WrappedTokenFactory.interface.format('json');
    fs.writeFileSync(path.join(abiDir, 'WrappedTokenFactory.json'), factoryAbi);
    
    console.log("   ✅ Contract ABIs saved");
    
    // Update integration files automatically
    console.log("   🔄 Updating integration files...");
    try {
      const { updateIntegrationFiles } = require('./update-integration-files.js');
      await updateIntegrationFiles(deploymentRecord);
      console.log("   ✅ Integration files updated automatically");
    } catch (error) {
      console.log("   ⚠️  Failed to update integration files automatically:", error.message);
      console.log("   💡 Run: node scripts/update-integration-files.js " + config.network);
    }
    
    console.log("");

    // Step 7: Display deployment summary
    console.log("🎉 DEPLOYMENT COMPLETED SUCCESSFULLY");
    console.log("=" .repeat(70));
    console.log(`Network: ${config.network} (Chain ID: ${deploymentRecord.chainId})`);
    console.log(`Deployer: ${deployerAddress}`);
    console.log(`Timestamp: ${deploymentRecord.timestamp}`);
    console.log("");
    console.log("📝 Contract Addresses:");
    console.log(`  DytallixBridge: ${bridgeAddress}`);
    console.log(`  WrappedTokenFactory: ${factoryAddress}`);
    console.log(`  Wrapped DYT Token: ${wrappedDytAddress}`);
    console.log("");
    console.log("⛽ Gas Usage Summary:");
    console.log(`  Bridge Deployment: ${deploymentRecord.gasUsed.bridge}`);
    console.log(`  Factory Deployment: ${deploymentRecord.gasUsed.factory}`);
    console.log(`  Token Creation: ${deploymentRecord.gasUsed.wrappedDyt}`);
    console.log(`  Total Gas Used: ${totalGasUsed.toString()}`);
    console.log(`  Estimated Cost: ${deploymentRecord.gasUsed.totalEth} ETH`);
    console.log("");
    console.log("📋 Next Steps:");
    console.log("1. Run contract verification:");
    console.log(`   npm run verify:sepolia`);
    console.log("");
    console.log("2. Run post-deployment validation:");
    console.log(`   npx hardhat run scripts/verify-deployment.js --network sepolia`);
    console.log("");
    console.log("3. Configure bridge settings:");
    console.log(`   npx hardhat run scripts/configure-bridge.js --network sepolia`);
    console.log("");
    console.log("4. Update integration files with new addresses");
    console.log("5. Test bridge functionality with small transfers");
    
    if (deploymentRecord.errors.length > 0) {
      console.log("");
      console.log("⚠️  Deployment Warnings/Errors:");
      deploymentRecord.errors.forEach(error => console.log(`   - ${error}`));
    }

    return deploymentRecord;

  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    
    // Save partial deployment record for debugging
    deploymentRecord.errors.push(`Deployment failed: ${error.message}`);
    deploymentRecord.status = 'failed';
    
    const deploymentDir = path.join(__dirname, '..', 'deployments', config.network);
    if (!fs.existsSync(deploymentDir)) {
      fs.mkdirSync(deploymentDir, { recursive: true });
    }
    
    const failedDeploymentPath = path.join(deploymentDir, 'failed-deployment.json');
    fs.writeFileSync(failedDeploymentPath, JSON.stringify(deploymentRecord, null, 2));
    console.log(`💾 Failed deployment record saved to ${failedDeploymentPath}`);
    
    throw error;
  }
}

// Script execution
if (require.main === module) {
  main()
    .then(() => {
      console.log("\n🎯 Deployment script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Deployment script failed:", error);
      process.exit(1);
    });
}

module.exports = { main };