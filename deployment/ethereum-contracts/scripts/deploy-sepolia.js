const { ethers, upgrades } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🚀 Starting Dytallix Bridge deployment to Sepolia testnet...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)));

  // Deployment configuration
  const config = {
    validatorThreshold: process.env.VALIDATOR_THRESHOLD || 3,
    bridgeFeeBps: process.env.BRIDGE_FEE_BPS || 10, // 0.1%
    bridgeAdmin: process.env.BRIDGE_ADMIN || deployer.address
  };

  console.log("Configuration:", config);

  // 1. Deploy DytallixBridge (upgradeable)
  console.log("\n📦 Deploying DytallixBridge...");
  const DytallixBridge = await ethers.getContractFactory("DytallixBridge");
  
  const bridge = await upgrades.deployProxy(
    DytallixBridge,
    [config.bridgeAdmin, config.validatorThreshold, config.bridgeFeeBps],
    { initializer: 'initialize' }
  );

  await bridge.waitForDeployment();
  const bridgeAddress = await bridge.getAddress();
  console.log("✅ DytallixBridge deployed to:", bridgeAddress);

  // 2. Deploy WrappedTokenFactory
  console.log("\n📦 Deploying WrappedTokenFactory...");
  const WrappedTokenFactory = await ethers.getContractFactory("WrappedTokenFactory");
  const factory = await WrappedTokenFactory.deploy(bridgeAddress);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("✅ WrappedTokenFactory deployed to:", factoryAddress);

  // 3. Deploy initial WrappedDytallix token
  console.log("\n📦 Creating wrapped DYT token...");
  const createTx = await factory.createWrappedToken(
    "dytallix:dgt",
    "Wrapped Dytallix Governance Token",
    "wDGT",
    "dytallix",
    "0x0000000000000000000000000000000000000000" // Placeholder for DGT address on Dytallix chain
  );
  await createTx.wait();
  
  const wrappedDgtAddress = await factory.getWrappedToken("dytallix:dgt");
  console.log("✅ Wrapped DGT deployed to:", wrappedDgtAddress);

  // 4. Configure bridge with supported assets
  console.log("\n⚙️ Configuring bridge...");
  
  // Add wrapped DGT as supported asset
  const addAssetTx = await bridge.addSupportedAsset(wrappedDgtAddress);
  await addAssetTx.wait();
  console.log("✅ Added wrapped DGT as supported asset");

  // 5. Set up initial validators (if provided)
  const validators = process.env.VALIDATORS ? process.env.VALIDATORS.split(',') : [];
  if (validators.length > 0) {
    console.log("👥 Adding validators...");
    for (const validator of validators) {
      if (ethers.isAddress(validator.trim())) {
        const addValidatorTx = await bridge.addValidator(validator.trim());
        await addValidatorTx.wait();
        console.log("✅ Added validator:", validator.trim());
      }
    }
  }

  // 6. Display deployment summary
  console.log("\n🎉 Deployment Summary:");
  console.log("=".repeat(50));
  console.log("Network:", "Sepolia Testnet");
  console.log("Bridge Contract:", bridgeAddress);
  console.log("Factory Contract:", factoryAddress);
  console.log("Wrapped DYT Token:", wrappedDytAddress);
  console.log("Deployer:", deployer.address);
  console.log("Validator Threshold:", config.validatorThreshold);
  console.log("Bridge Fee (bps):", config.bridgeFeeBps);

  // 7. Save deployment information
  const deploymentInfo = {
    network: "sepolia",
    timestamp: new Date().toISOString(),
    contracts: {
      bridge: bridgeAddress,
      factory: factoryAddress,
      wrappedDyt: wrappedDytAddress
    },
    config: config,
    deployer: deployer.address
  };

  const fs = require('fs');
  fs.writeFileSync(
    'deployments/sepolia.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("📄 Deployment info saved to deployments/sepolia.json");

  // 8. Verification instructions
  console.log("\n📋 Next Steps:");
  console.log("1. Verify contracts on Etherscan:");
  console.log(`   npx hardhat verify --network sepolia ${bridgeAddress}`);
  console.log(`   npx hardhat verify --network sepolia ${factoryAddress} ${bridgeAddress}`);
  console.log(`   npx hardhat verify --network sepolia ${wrappedDytAddress} "Wrapped Dytallix" "wDYT" "${deployer.address}" "${bridgeAddress}" "dytallix" "0x0000000000000000000000000000000000000000"`);
  
  console.log("\n2. Fund bridge with test tokens for testing");
  console.log("3. Configure relayer with contract addresses");
  console.log("4. Test bridge functionality with small transfers");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
