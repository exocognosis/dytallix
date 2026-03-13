const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');
require("dotenv").config();

/**
 * Bridge Configuration Script
 * 
 * Handles initial bridge configuration and setup:
 * - Additional validator management
 * - Asset configuration and management
 * - Bridge parameter adjustments
 * - Security settings configuration
 * - Emergency controls setup
 */

async function main() {
  console.log("⚙️  Starting Bridge Configuration");
  console.log("=" .repeat(50));
  
  const network = hre.network.name;
  console.log(`Network: ${network}`);
  
  // Load deployment information
  const deploymentDir = path.join(__dirname, '..', 'deployments', network);
  const addressesPath = path.join(deploymentDir, 'addresses.json');
  
  if (!fs.existsSync(addressesPath)) {
    throw new Error(`Deployment addresses not found at ${addressesPath}`);
  }
  
  const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
  
  console.log("📋 Contract Addresses:");
  console.log(`  Bridge: ${addresses.bridge}`);
  console.log(`  Factory: ${addresses.factory}`);
  console.log(`  Wrapped DYT: ${addresses.wrappedDyt}`);
  console.log("");

  const [deployer] = await ethers.getSigners();
  console.log(`👤 Configuring with account: ${deployer.address}`);
  
  // Configuration parameters
  const config = {
    // Additional validators to add
    additionalValidators: process.env.ADDITIONAL_VALIDATORS ? 
      process.env.ADDITIONAL_VALIDATORS.split(',').map(v => v.trim()) : [],
    
    // Additional assets to support
    additionalAssets: process.env.ADDITIONAL_ASSETS ? 
      JSON.parse(process.env.ADDITIONAL_ASSETS) : [],
    
    // Bridge parameters
    newValidatorThreshold: process.env.NEW_VALIDATOR_THRESHOLD ? 
      parseInt(process.env.NEW_VALIDATOR_THRESHOLD) : null,
    newBridgeFeeBps: process.env.NEW_BRIDGE_FEE_BPS ? 
      parseInt(process.env.NEW_BRIDGE_FEE_BPS) : null,
    
    // Security settings
    pauseBridge: process.env.PAUSE_BRIDGE === 'true',
    unpauseBridge: process.env.UNPAUSE_BRIDGE === 'true',
    
    // Emergency settings
    emergencyAdmin: process.env.EMERGENCY_ADMIN || null,
    operatorAddresses: process.env.OPERATORS ? 
      process.env.OPERATORS.split(',').map(v => v.trim()) : []
  };

  console.log("⚙️  Configuration Parameters:");
  console.log(`  Additional Validators: ${config.additionalValidators.length}`);
  console.log(`  Additional Assets: ${config.additionalAssets.length}`);
  console.log(`  New Validator Threshold: ${config.newValidatorThreshold || 'No change'}`);
  console.log(`  New Bridge Fee: ${config.newBridgeFeeBps || 'No change'} bps`);
  console.log(`  Pause Bridge: ${config.pauseBridge}`);
  console.log(`  Unpause Bridge: ${config.unpauseBridge}`);
  console.log("");

  // Get contract instances
  const DytallixBridge = await ethers.getContractFactory("DytallixBridge");
  const bridge = DytallixBridge.attach(addresses.bridge);
  
  const WrappedTokenFactory = await ethers.getContractFactory("WrappedTokenFactory");
  const factory = WrappedTokenFactory.attach(addresses.factory);

  const configurationResults = {
    timestamp: new Date().toISOString(),
    network: network,
    addresses: addresses,
    actions: [],
    gasUsed: 0,
    errors: []
  };

  try {
    // Step 1: Validator Management
    if (config.additionalValidators.length > 0) {
      console.log("👥 Step 1: Adding Additional Validators");
      await addValidators(bridge, config.additionalValidators, configurationResults);
      console.log("");
    }

    // Step 2: Asset Management
    if (config.additionalAssets.length > 0) {
      console.log("💰 Step 2: Adding Additional Assets");
      await addAssets(bridge, factory, config.additionalAssets, configurationResults);
      console.log("");
    }

    // Step 3: Bridge Parameter Updates
    if (config.newValidatorThreshold || config.newBridgeFeeBps) {
      console.log("🔧 Step 3: Updating Bridge Parameters");
      await updateBridgeParameters(bridge, config, configurationResults);
      console.log("");
    }

    // Step 4: Role Management
    if (config.emergencyAdmin || config.operatorAddresses.length > 0) {
      console.log("🛡️  Step 4: Managing Roles and Permissions");
      await manageRoles(bridge, config, configurationResults);
      console.log("");
    }

    // Step 5: Bridge State Management
    if (config.pauseBridge || config.unpauseBridge) {
      console.log("⏸️  Step 5: Managing Bridge State");
      await manageBridgeState(bridge, config, configurationResults);
      console.log("");
    }

    // Step 6: Configuration Verification
    console.log("✅ Step 6: Verifying Configuration");
    await verifyConfiguration(bridge, configurationResults);
    console.log("");

    // Save configuration results
    const configPath = path.join(deploymentDir, 'configuration-results.json');
    fs.writeFileSync(configPath, JSON.stringify(configurationResults, null, 2));
    console.log(`💾 Configuration results saved to ${configPath}`);

    // Display summary
    console.log("🎉 CONFIGURATION COMPLETED");
    console.log("=" .repeat(50));
    console.log(`Actions performed: ${configurationResults.actions.length}`);
    console.log(`Total gas used: ${configurationResults.gasUsed}`);
    
    if (configurationResults.errors.length > 0) {
      console.log("\n⚠️  Configuration Errors:");
      configurationResults.errors.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log("\n✅ All configuration steps completed successfully");
    }

  } catch (error) {
    console.error("❌ Configuration failed:", error.message);
    configurationResults.errors.push(`Configuration failed: ${error.message}`);
    throw error;
  }
}

async function addValidators(bridge, validators, results) {
  for (const validator of validators) {
    if (!ethers.isAddress(validator)) {
      console.log(`  ⚠️  Skipping invalid validator address: ${validator}`);
      results.errors.push(`Invalid validator address: ${validator}`);
      continue;
    }

    try {
      console.log(`  Adding validator: ${validator}`);
      const tx = await bridge.addValidator(validator);
      const receipt = await tx.wait();
      
      results.actions.push({
        type: 'add_validator',
        validator: validator,
        transaction: tx.hash,
        gasUsed: receipt.gasUsed.toString()
      });
      results.gasUsed += parseInt(receipt.gasUsed.toString());
      
      console.log(`    ✅ Added validator (Gas: ${receipt.gasUsed.toString()})`);
      
    } catch (error) {
      console.log(`    ❌ Failed to add validator: ${error.message}`);
      results.errors.push(`Failed to add validator ${validator}: ${error.message}`);
    }
  }
}

async function addAssets(bridge, factory, assets, results) {
  for (const asset of assets) {
    try {
      console.log(`  Processing asset: ${asset.symbol}`);
      
      // Create wrapped token if it doesn't exist
      if (asset.createWrapped) {
        console.log(`    Creating wrapped token for ${asset.symbol}...`);
        const createTx = await factory.createWrappedToken(
          asset.assetId,
          asset.name,
          asset.symbol,
          asset.sourceChain,
          asset.sourceAddress || "0x0000000000000000000000000000000000000000"
        );
        const createReceipt = await createTx.wait();
        
        const wrappedAddress = await factory.getWrappedToken(asset.assetId);
        
        results.actions.push({
          type: 'create_wrapped_token',
          assetId: asset.assetId,
          symbol: asset.symbol,
          address: wrappedAddress,
          transaction: createTx.hash,
          gasUsed: createReceipt.gasUsed.toString()
        });
        results.gasUsed += parseInt(createReceipt.gasUsed.toString());
        
        console.log(`    ✅ Wrapped token created: ${wrappedAddress}`);
        
        // Add to bridge as supported asset
        asset.address = wrappedAddress;
      }
      
      // Add asset to bridge
      if (asset.address) {
        console.log(`    Adding ${asset.symbol} as supported asset...`);
        const addTx = await bridge.addSupportedAsset(asset.address);
        const addReceipt = await addTx.wait();
        
        results.actions.push({
          type: 'add_supported_asset',
          symbol: asset.symbol,
          address: asset.address,
          transaction: addTx.hash,
          gasUsed: addReceipt.gasUsed.toString()
        });
        results.gasUsed += parseInt(addReceipt.gasUsed.toString());
        
        console.log(`    ✅ Asset added as supported (Gas: ${addReceipt.gasUsed.toString()})`);
      }
      
    } catch (error) {
      console.log(`    ❌ Failed to process asset ${asset.symbol}: ${error.message}`);
      results.errors.push(`Failed to process asset ${asset.symbol}: ${error.message}`);
    }
  }
}

async function updateBridgeParameters(bridge, config, results) {
  try {
    const currentConfig = await bridge.getBridgeConfig();
    const currentThreshold = currentConfig[0];
    const currentFeeBps = currentConfig[1];
    
    const newThreshold = config.newValidatorThreshold || currentThreshold;
    const newFeeBps = config.newBridgeFeeBps || currentFeeBps;
    
    console.log(`  Current threshold: ${currentThreshold}, fee: ${currentFeeBps} bps`);
    console.log(`  New threshold: ${newThreshold}, fee: ${newFeeBps} bps`);
    
    if (newThreshold != currentThreshold || newFeeBps != currentFeeBps) {
      console.log("  Updating bridge configuration...");
      const updateTx = await bridge.updateBridgeConfig(newThreshold, newFeeBps);
      const updateReceipt = await updateTx.wait();
      
      results.actions.push({
        type: 'update_bridge_config',
        oldThreshold: currentThreshold.toString(),
        newThreshold: newThreshold.toString(),
        oldFeeBps: currentFeeBps.toString(),
        newFeeBps: newFeeBps.toString(),
        transaction: updateTx.hash,
        gasUsed: updateReceipt.gasUsed.toString()
      });
      results.gasUsed += parseInt(updateReceipt.gasUsed.toString());
      
      console.log(`  ✅ Bridge configuration updated (Gas: ${updateReceipt.gasUsed.toString()})`);
    } else {
      console.log("  No changes needed for bridge configuration");
    }
    
  } catch (error) {
    console.log(`  ❌ Failed to update bridge parameters: ${error.message}`);
    results.errors.push(`Failed to update bridge parameters: ${error.message}`);
  }
}

async function manageRoles(bridge, config, results) {
  const OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("OPERATOR_ROLE"));
  const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
  
  // Add emergency admin
  if (config.emergencyAdmin && ethers.isAddress(config.emergencyAdmin)) {
    try {
      console.log(`  Adding emergency admin: ${config.emergencyAdmin}`);
      const grantTx = await bridge.grantRole(DEFAULT_ADMIN_ROLE, config.emergencyAdmin);
      const grantReceipt = await grantTx.wait();
      
      results.actions.push({
        type: 'grant_admin_role',
        address: config.emergencyAdmin,
        transaction: grantTx.hash,
        gasUsed: grantReceipt.gasUsed.toString()
      });
      results.gasUsed += parseInt(grantReceipt.gasUsed.toString());
      
      console.log(`    ✅ Emergency admin role granted (Gas: ${grantReceipt.gasUsed.toString()})`);
      
    } catch (error) {
      console.log(`    ❌ Failed to grant admin role: ${error.message}`);
      results.errors.push(`Failed to grant admin role to ${config.emergencyAdmin}: ${error.message}`);
    }
  }
  
  // Add operators
  for (const operator of config.operatorAddresses) {
    if (!ethers.isAddress(operator)) {
      console.log(`  ⚠️  Skipping invalid operator address: ${operator}`);
      results.errors.push(`Invalid operator address: ${operator}`);
      continue;
    }
    
    try {
      console.log(`  Adding operator: ${operator}`);
      const grantTx = await bridge.grantRole(OPERATOR_ROLE, operator);
      const grantReceipt = await grantTx.wait();
      
      results.actions.push({
        type: 'grant_operator_role',
        address: operator,
        transaction: grantTx.hash,
        gasUsed: grantReceipt.gasUsed.toString()
      });
      results.gasUsed += parseInt(grantReceipt.gasUsed.toString());
      
      console.log(`    ✅ Operator role granted (Gas: ${grantReceipt.gasUsed.toString()})`);
      
    } catch (error) {
      console.log(`    ❌ Failed to grant operator role: ${error.message}`);
      results.errors.push(`Failed to grant operator role to ${operator}: ${error.message}`);
    }
  }
}

async function manageBridgeState(bridge, config, results) {
  try {
    const currentPaused = await bridge.paused();
    console.log(`  Current bridge state: ${currentPaused ? 'Paused' : 'Active'}`);
    
    if (config.pauseBridge && !currentPaused) {
      console.log("  Pausing bridge...");
      const pauseTx = await bridge.pause();
      const pauseReceipt = await pauseTx.wait();
      
      results.actions.push({
        type: 'pause_bridge',
        transaction: pauseTx.hash,
        gasUsed: pauseReceipt.gasUsed.toString()
      });
      results.gasUsed += parseInt(pauseReceipt.gasUsed.toString());
      
      console.log(`  ✅ Bridge paused (Gas: ${pauseReceipt.gasUsed.toString()})`);
      
    } else if (config.unpauseBridge && currentPaused) {
      console.log("  Unpausing bridge...");
      const unpauseTx = await bridge.unpause();
      const unpauseReceipt = await unpauseTx.wait();
      
      results.actions.push({
        type: 'unpause_bridge',
        transaction: unpauseTx.hash,
        gasUsed: unpauseReceipt.gasUsed.toString()
      });
      results.gasUsed += parseInt(unpauseReceipt.gasUsed.toString());
      
      console.log(`  ✅ Bridge unpaused (Gas: ${unpauseReceipt.gasUsed.toString()})`);
      
    } else {
      console.log("  No state change needed");
    }
    
  } catch (error) {
    console.log(`  ❌ Failed to manage bridge state: ${error.message}`);
    results.errors.push(`Failed to manage bridge state: ${error.message}`);
  }
}

async function verifyConfiguration(bridge, results) {
  try {
    // Verify bridge configuration
    const [threshold, feeBps, nonce] = await bridge.getBridgeConfig();
    const isPaused = await bridge.paused();
    
    console.log(`  ✅ Validator threshold: ${threshold}`);
    console.log(`  ✅ Bridge fee: ${feeBps} bps`);
    console.log(`  ✅ Current nonce: ${nonce}`);
    console.log(`  ✅ Bridge state: ${isPaused ? 'Paused' : 'Active'}`);
    
    results.finalConfiguration = {
      validatorThreshold: threshold.toString(),
      bridgeFeeBps: feeBps.toString(),
      nonce: nonce.toString(),
      isPaused: isPaused
    };
    
  } catch (error) {
    console.log(`  ❌ Failed to verify configuration: ${error.message}`);
    results.errors.push(`Failed to verify configuration: ${error.message}`);
  }
}

// Script execution
if (require.main === module) {
  main()
    .then(() => {
      console.log("\n🎯 Configuration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Configuration failed:", error);
      process.exit(1);
    });
}

module.exports = { main };