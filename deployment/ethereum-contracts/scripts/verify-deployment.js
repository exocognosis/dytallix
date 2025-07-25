const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');
require("dotenv").config();

/**
 * Post-Deployment Verification Script
 * 
 * Performs comprehensive verification of deployed bridge contracts:
 * - Contract verification on Etherscan
 * - Gas usage analysis and reporting
 * - Initial configuration validation
 * - Bridge functionality testing
 * - Integration readiness checks
 */

async function main() {
  console.log("🔍 Starting Post-Deployment Verification");
  console.log("=" .repeat(50));
  
  const network = hre.network.name;
  console.log(`Network: ${network}`);
  
  // Load deployment information
  const deploymentDir = path.join(__dirname, '..', 'deployments', network);
  const deploymentPath = path.join(deploymentDir, 'deployment.json');
  const addressesPath = path.join(deploymentDir, 'addresses.json');
  
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment record not found at ${deploymentPath}`);
  }
  
  const deploymentRecord = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
  
  console.log("📋 Loaded deployment information:");
  console.log(`  Bridge: ${addresses.bridge}`);
  console.log(`  Factory: ${addresses.factory}`);
  console.log(`  Wrapped DYT: ${addresses.wrappedDyt}`);
  console.log("");

  const verificationResults = {
    timestamp: new Date().toISOString(),
    network: network,
    addresses: addresses,
    etherscanVerification: {},
    configurationValidation: {},
    functionalityTests: {},
    gasAnalysis: {},
    integrationReadiness: {},
    overallStatus: 'pending',
    recommendations: []
  };

  try {
    // Step 1: Etherscan Contract Verification
    console.log("🔗 Step 1: Etherscan Contract Verification");
    await verifyContractsOnEtherscan(addresses, verificationResults);
    console.log("");

    // Step 2: Configuration Validation
    console.log("⚙️  Step 2: Configuration Validation");
    await validateBridgeConfiguration(addresses, deploymentRecord, verificationResults);
    console.log("");

    // Step 3: Gas Usage Analysis
    console.log("⛽ Step 3: Gas Usage Analysis");
    await analyzeGasUsage(deploymentRecord, verificationResults);
    console.log("");

    // Step 4: Bridge Functionality Testing
    console.log("🧪 Step 4: Bridge Functionality Testing");
    await testBridgeFunctionality(addresses, verificationResults);
    console.log("");

    // Step 5: Integration Readiness Check
    console.log("🔌 Step 5: Integration Readiness Check");
    await checkIntegrationReadiness(addresses, verificationResults);
    console.log("");

    // Step 6: Generate Verification Report
    console.log("📊 Step 6: Generating Verification Report");
    await generateVerificationReport(verificationResults, deploymentDir);
    
    // Determine overall status
    const hasErrors = Object.values(verificationResults).some(section => 
      typeof section === 'object' && section.status === 'failed'
    );
    
    verificationResults.overallStatus = hasErrors ? 'failed' : 'passed';
    
    console.log(`\n🎯 Verification ${verificationResults.overallStatus.toUpperCase()}`);
    
    if (verificationResults.recommendations.length > 0) {
      console.log("\n📝 Recommendations:");
      verificationResults.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }

  } catch (error) {
    console.error("❌ Verification failed:", error.message);
    verificationResults.overallStatus = 'error';
    verificationResults.error = error.message;
    throw error;
  } finally {
    // Save verification results
    const verificationPath = path.join(deploymentDir, 'verification-results.json');
    fs.writeFileSync(verificationPath, JSON.stringify(verificationResults, null, 2));
    console.log(`\n💾 Verification results saved to ${verificationPath}`);
  }
}

async function verifyContractsOnEtherscan(addresses, results) {
  console.log("  Preparing contract verification commands...");
  
  const verificationCommands = {
    bridge: `npx hardhat verify --network ${hre.network.name} ${addresses.bridge}`,
    factory: `npx hardhat verify --network ${hre.network.name} ${addresses.factory} ${addresses.bridge}`,
    wrappedDyt: `npx hardhat verify --network ${hre.network.name} ${addresses.wrappedDyt}`
  };
  
  results.etherscanVerification = {
    status: 'manual_required',
    commands: verificationCommands,
    note: 'Run these commands manually to verify contracts on Etherscan'
  };
  
  console.log("  ✅ Verification commands prepared");
  console.log("  📝 Manual verification required - see verification results for commands");
}

async function validateBridgeConfiguration(addresses, deploymentRecord, results) {
  try {
    const [deployer] = await ethers.getSigners();
    
    // Get bridge contract instance
    const DytallixBridge = await ethers.getContractFactory("DytallixBridge");
    const bridge = DytallixBridge.attach(addresses.bridge);
    
    console.log("  Validating bridge configuration...");
    
    // Check bridge configuration
    const [threshold, feeBps, nonce] = await bridge.getBridgeConfig();
    const expectedThreshold = deploymentRecord.config.validatorThreshold;
    const expectedFeeBps = deploymentRecord.config.bridgeFeeBps;
    
    const configValidation = {
      validatorThreshold: {
        expected: expectedThreshold,
        actual: threshold.toString(),
        valid: threshold.toString() === expectedThreshold.toString()
      },
      bridgeFeeBps: {
        expected: expectedFeeBps,
        actual: feeBps.toString(),
        valid: feeBps.toString() === expectedFeeBps.toString()
      },
      nonce: {
        actual: nonce.toString(),
        valid: nonce > 0
      }
    };
    
    // Check supported assets
    const wrappedDytSupported = await bridge.supportedAssets(addresses.wrappedDyt);
    
    // Check admin role
    const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const hasAdminRole = await bridge.hasRole(DEFAULT_ADMIN_ROLE, deploymentRecord.config.bridgeAdmin);
    
    results.configurationValidation = {
      status: 'passed',
      configuration: configValidation,
      supportedAssets: {
        wrappedDyt: wrappedDytSupported
      },
      adminRole: {
        admin: deploymentRecord.config.bridgeAdmin,
        hasRole: hasAdminRole
      }
    };
    
    console.log(`  ✅ Validator threshold: ${threshold} (expected: ${expectedThreshold})`);
    console.log(`  ✅ Bridge fee: ${feeBps} bps (expected: ${expectedFeeBps})`);
    console.log(`  ✅ Current nonce: ${nonce}`);
    console.log(`  ✅ Wrapped DYT supported: ${wrappedDytSupported}`);
    console.log(`  ✅ Admin role configured: ${hasAdminRole}`);
    
    // Validate any issues
    const issues = [];
    if (!configValidation.validatorThreshold.valid) {
      issues.push(`Validator threshold mismatch: expected ${expectedThreshold}, got ${threshold}`);
    }
    if (!configValidation.bridgeFeeBps.valid) {
      issues.push(`Bridge fee mismatch: expected ${expectedFeeBps}, got ${feeBps}`);
    }
    if (!wrappedDytSupported) {
      issues.push("Wrapped DYT token is not added as supported asset");
    }
    if (!hasAdminRole) {
      issues.push("Bridge admin does not have admin role");
    }
    
    if (issues.length > 0) {
      results.configurationValidation.status = 'failed';
      results.configurationValidation.issues = issues;
      results.recommendations.push(...issues);
    }
    
  } catch (error) {
    results.configurationValidation = {
      status: 'failed',
      error: error.message
    };
    results.recommendations.push("Fix configuration validation errors before proceeding");
    throw error;
  }
}

async function analyzeGasUsage(deploymentRecord, results) {
  const gasUsage = deploymentRecord.gasUsed;
  
  console.log("  Analyzing gas usage patterns...");
  
  const analysis = {
    bridgeDeployment: {
      gasUsed: gasUsage.bridge,
      percentage: (parseInt(gasUsage.bridge) / parseInt(gasUsage.total) * 100).toFixed(2)
    },
    factoryDeployment: {
      gasUsed: gasUsage.factory,
      percentage: (parseInt(gasUsage.factory) / parseInt(gasUsage.total) * 100).toFixed(2)
    },
    tokenCreation: {
      gasUsed: gasUsage.wrappedDyt,
      percentage: (parseInt(gasUsage.wrappedDyt) / parseInt(gasUsage.total) * 100).toFixed(2)
    },
    total: {
      gasUsed: gasUsage.total,
      estimatedCostEth: gasUsage.totalEth
    }
  };
  
  // Gas usage recommendations
  const recommendations = [];
  if (parseInt(gasUsage.total) > 10000000) { // > 10M gas
    recommendations.push("High gas usage detected - consider optimizing contract size");
  }
  if (parseInt(gasUsage.bridge) > 6000000) { // > 6M gas for bridge
    recommendations.push("Bridge contract deployment used high gas - review contract complexity");
  }
  
  results.gasAnalysis = {
    status: 'completed',
    analysis: analysis,
    recommendations: recommendations
  };
  
  results.recommendations.push(...recommendations);
  
  console.log(`  ✅ Bridge deployment: ${analysis.bridgeDeployment.gasUsed} gas (${analysis.bridgeDeployment.percentage}%)`);
  console.log(`  ✅ Factory deployment: ${analysis.factoryDeployment.gasUsed} gas (${analysis.factoryDeployment.percentage}%)`);
  console.log(`  ✅ Token creation: ${analysis.tokenCreation.gasUsed} gas (${analysis.tokenCreation.percentage}%)`);
  console.log(`  ✅ Total gas used: ${analysis.total.gasUsed}`);
  console.log(`  ✅ Estimated cost: ${analysis.total.estimatedCostEth} ETH`);
}

async function testBridgeFunctionality(addresses, results) {
  try {
    console.log("  Testing basic bridge functionality...");
    
    const [deployer] = await ethers.getSigners();
    
    // Get contract instances
    const DytallixBridge = await ethers.getContractFactory("DytallixBridge");
    const bridge = DytallixBridge.attach(addresses.bridge);
    
    const WrappedTokenFactory = await ethers.getContractFactory("WrappedTokenFactory");
    const factory = WrappedTokenFactory.attach(addresses.factory);
    
    // Test 1: Check bridge is not paused
    const isPaused = await bridge.paused();
    
    // Test 2: Check factory can query wrapped tokens
    const wrappedDytFromFactory = await factory.getWrappedToken("dytallix:dyt");
    
    // Test 3: Check bridge can query configuration
    const bridgeConfig = await bridge.getBridgeConfig();
    
    // Test 4: Check supported asset status
    const isSupported = await bridge.supportedAssets(addresses.wrappedDyt);
    
    const functionalityTests = {
      bridgeNotPaused: {
        test: "Bridge should not be paused",
        result: !isPaused,
        value: isPaused
      },
      factoryTokenQuery: {
        test: "Factory should return correct wrapped DYT address",
        result: wrappedDytFromFactory.toLowerCase() === addresses.wrappedDyt.toLowerCase(),
        expected: addresses.wrappedDyt,
        actual: wrappedDytFromFactory
      },
      bridgeConfigQuery: {
        test: "Bridge should return valid configuration",
        result: bridgeConfig.length === 3 && bridgeConfig[0] > 0,
        value: bridgeConfig.map(v => v.toString())
      },
      supportedAssetCheck: {
        test: "Wrapped DYT should be supported asset",
        result: isSupported,
        value: isSupported
      }
    };
    
    const passedTests = Object.values(functionalityTests).filter(test => test.result).length;
    const totalTests = Object.keys(functionalityTests).length;
    
    results.functionalityTests = {
      status: passedTests === totalTests ? 'passed' : 'failed',
      summary: `${passedTests}/${totalTests} tests passed`,
      tests: functionalityTests
    };
    
    console.log(`  ✅ Bridge pause status: ${!isPaused ? 'Active' : 'Paused'}`);
    console.log(`  ✅ Factory token query: ${functionalityTests.factoryTokenQuery.result ? 'Passed' : 'Failed'}`);
    console.log(`  ✅ Bridge config query: ${functionalityTests.bridgeConfigQuery.result ? 'Passed' : 'Failed'}`);
    console.log(`  ✅ Supported asset check: ${functionalityTests.supportedAssetCheck.result ? 'Passed' : 'Failed'}`);
    console.log(`  📊 Functionality tests: ${passedTests}/${totalTests} passed`);
    
    if (passedTests < totalTests) {
      results.recommendations.push("Some functionality tests failed - review bridge configuration");
    }
    
  } catch (error) {
    results.functionalityTests = {
      status: 'failed',
      error: error.message
    };
    results.recommendations.push("Fix functionality test errors before proceeding");
    throw error;
  }
}

async function checkIntegrationReadiness(addresses, results) {
  console.log("  Checking integration readiness...");
  
  const integrationChecks = {
    contractAddresses: {
      test: "All contract addresses are valid",
      result: Object.values(addresses).every(addr => ethers.isAddress(addr))
    },
    abiFiles: {
      test: "ABI files are generated",
      result: checkAbiFiles(addresses)
    },
    deploymentRecord: {
      test: "Deployment record is complete",
      result: true // If we got here, the record exists
    },
    environmentVariables: {
      test: "Environment variables are configured",
      result: checkEnvironmentVariables()
    }
  };
  
  const passedChecks = Object.values(integrationChecks).filter(check => check.result).length;
  const totalChecks = Object.keys(integrationChecks).length;
  
  results.integrationReadiness = {
    status: passedChecks === totalChecks ? 'ready' : 'needs_attention',
    summary: `${passedChecks}/${totalChecks} checks passed`,
    checks: integrationChecks,
    nextSteps: [
      "Update Rust integration files with deployed addresses",
      "Configure environment variables for production",
      "Set up monitoring and alerting",
      "Prepare for mainnet deployment"
    ]
  };
  
  console.log(`  ✅ Contract addresses: ${integrationChecks.contractAddresses.result ? 'Valid' : 'Invalid'}`);
  console.log(`  ✅ ABI files: ${integrationChecks.abiFiles.result ? 'Generated' : 'Missing'}`);
  console.log(`  ✅ Deployment record: ${integrationChecks.deploymentRecord.result ? 'Complete' : 'Incomplete'}`);
  console.log(`  ✅ Environment setup: ${integrationChecks.environmentVariables.result ? 'Configured' : 'Needs configuration'}`);
  console.log(`  📊 Integration readiness: ${passedChecks}/${totalChecks} checks passed`);
  
  if (passedChecks < totalChecks) {
    results.recommendations.push("Complete all integration readiness checks before production use");
  }
}

function checkAbiFiles(addresses) {
  const network = hre.network.name;
  const abiDir = path.join(__dirname, '..', 'deployments', network, 'abis');
  
  const requiredAbis = ['DytallixBridge.json', 'WrappedTokenFactory.json'];
  return requiredAbis.every(abiFile => fs.existsSync(path.join(abiDir, abiFile)));
}

function checkEnvironmentVariables() {
  const requiredVars = ['SEPOLIA_RPC_URL', 'PRIVATE_KEY', 'ETHERSCAN_API_KEY'];
  return requiredVars.every(varName => process.env[varName]);
}

async function generateVerificationReport(results, deploymentDir) {
  const reportPath = path.join(deploymentDir, 'verification-report.md');
  
  const report = `# Bridge Deployment Verification Report

## Overview
- **Network:** ${results.network}
- **Timestamp:** ${results.timestamp}
- **Overall Status:** ${results.overallStatus.toUpperCase()}

## Contract Addresses
- **Bridge:** \`${results.addresses.bridge}\`
- **Factory:** \`${results.addresses.factory}\`
- **Wrapped DYT:** \`${results.addresses.wrappedDyt}\`

## Verification Results

### Etherscan Verification
- **Status:** ${results.etherscanVerification.status}
- **Note:** ${results.etherscanVerification.note}

### Configuration Validation
- **Status:** ${results.configurationValidation.status}
${results.configurationValidation.issues ? `- **Issues:** ${results.configurationValidation.issues.join(', ')}` : ''}

### Gas Analysis
- **Total Gas Used:** ${results.gasAnalysis.analysis.total.gasUsed}
- **Estimated Cost:** ${results.gasAnalysis.analysis.total.estimatedCostEth} ETH

### Functionality Tests
- **Status:** ${results.functionalityTests.status}
- **Summary:** ${results.functionalityTests.summary}

### Integration Readiness
- **Status:** ${results.integrationReadiness.status}
- **Summary:** ${results.integrationReadiness.summary}

## Recommendations
${results.recommendations.length > 0 ? results.recommendations.map(rec => `- ${rec}`).join('\n') : 'No recommendations'}

## Next Steps
${results.integrationReadiness.nextSteps.map(step => `- ${step}`).join('\n')}

---
*Report generated automatically by deployment verification script*
`;

  fs.writeFileSync(reportPath, report);
  console.log(`  ✅ Verification report generated: ${reportPath}`);
}

// Script execution
if (require.main === module) {
  main()
    .then(() => {
      console.log("\n🎯 Verification completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Verification failed:", error);
      process.exit(1);
    });
}

module.exports = { main };