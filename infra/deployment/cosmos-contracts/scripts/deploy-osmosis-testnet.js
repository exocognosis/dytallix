const { SigningCosmWasmClient } = require("@cosmjs/cosmwasm-stargate");
const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const { GasPrice } = require("@cosmjs/stargate");
const fs = require('fs');
require("dotenv").config();

async function main() {
  console.log("🌌 Starting Dytallix Bridge deployment to Osmosis testnet...");

  // Configuration
  const config = {
    rpcEndpoint: process.env.OSMOSIS_TESTNET_RPC || "https://osmosis-testnet-rpc.polkachu.com",
    prefix: "osmo",
    denom: "uosmo",
    gasPrice: GasPrice.fromString("0.025uosmo"),
    mnemonic: process.env.MNEMONIC,
    validatorThreshold: parseInt(process.env.VALIDATOR_THRESHOLD) || 3,
    bridgeFeeBps: parseInt(process.env.BRIDGE_FEE_BPS) || 10,
  };

  if (!config.mnemonic) {
    throw new Error("MNEMONIC environment variable is required");
  }

  // Create wallet and client
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(config.mnemonic, {
    prefix: config.prefix,
  });

  const [firstAccount] = await wallet.getAccounts();
  console.log("Deploying with account:", firstAccount.address);

  const client = await SigningCosmWasmClient.connectWithSigner(
    config.rpcEndpoint,
    wallet,
    {
      gasPrice: config.gasPrice,
    }
  );

  // Check balance
  const balance = await client.getBalance(firstAccount.address, config.denom);
  console.log("Account balance:", balance);

  // Read the compiled contract
  const contractWasm = fs.readFileSync("./target/wasm32-unknown-unknown/release/dytallix_cosmos_bridge.wasm");
  
  console.log("📦 Uploading contract...");
  
  // Upload contract
  const uploadResult = await client.upload(
    firstAccount.address,
    contractWasm,
    "auto",
    "Dytallix Bridge Contract"
  );

  console.log("✅ Contract uploaded. Code ID:", uploadResult.codeId);
  console.log("Transaction hash:", uploadResult.transactionHash);

  // Instantiate contract
  console.log("🚀 Instantiating contract...");
  
  const instantiateMsg = {
    admin: firstAccount.address,
    validator_threshold: config.validatorThreshold,
    bridge_fee_bps: config.bridgeFeeBps,
  };

  const instantiateResult = await client.instantiate(
    firstAccount.address,
    uploadResult.codeId,
    instantiateMsg,
    "Dytallix Bridge",
    "auto",
    {
      admin: firstAccount.address,
    }
  );

  console.log("✅ Contract instantiated at:", instantiateResult.contractAddress);
  console.log("Transaction hash:", instantiateResult.transactionHash);

  // Add supported assets
  console.log("⚙️ Configuring supported assets...");
  
  const addAssetMsg = {
    add_supported_asset: {
      asset: "uosmo", // Native OSMO token
    },
  };

  const addAssetResult = await client.execute(
    firstAccount.address,
    instantiateResult.contractAddress,
    addAssetMsg,
    "auto"
  );

  console.log("✅ Added OSMO as supported asset");
  console.log("Transaction hash:", addAssetResult.transactionHash);

  // Query contract state
  console.log("📊 Querying contract state...");
  
  const configQuery = await client.queryContractSmart(
    instantiateResult.contractAddress,
    { config: {} }
  );

  console.log("Contract configuration:", configQuery);

  // Save deployment information
  const deploymentInfo = {
    network: "osmosis-testnet",
    timestamp: new Date().toISOString(),
    codeId: uploadResult.codeId,
    contractAddress: instantiateResult.contractAddress,
    admin: firstAccount.address,
    config: {
      validatorThreshold: config.validatorThreshold,
      bridgeFeeBps: config.bridgeFeeBps,
    },
    transactions: {
      upload: uploadResult.transactionHash,
      instantiate: instantiateResult.transactionHash,
      addAsset: addAssetResult.transactionHash,
    },
  };

  fs.writeFileSync(
    './deployments/osmosis-testnet.json',
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n🎉 Deployment Summary:");
  console.log("=".repeat(50));
  console.log("Network: Osmosis Testnet");
  console.log("Code ID:", uploadResult.codeId);
  console.log("Contract Address:", instantiateResult.contractAddress);
  console.log("Admin:", firstAccount.address);
  console.log("Validator Threshold:", config.validatorThreshold);
  console.log("Bridge Fee (bps):", config.bridgeFeeBps);
  console.log("📄 Deployment info saved to deployments/osmosis-testnet.json");

  console.log("\n📋 Next Steps:");
  console.log("1. Add validators to the bridge contract");
  console.log("2. Configure relayer with contract address");
  console.log("3. Test bridge functionality");
  console.log("4. Set up monitoring and alerts");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
