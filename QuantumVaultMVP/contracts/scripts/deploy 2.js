const hre = require("hardhat");

async function main() {
  console.log("Deploying QuantumVaultAttestation contract...");

  const QuantumVaultAttestation = await hre.ethers.getContractFactory("QuantumVaultAttestation");
  const contract = await QuantumVaultAttestation.deploy();

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  
  console.log(`QuantumVaultAttestation deployed to: ${address}`);
  console.log(`\nUpdate your backend .env file with:`);
  console.log(`ATTESTATION_CONTRACT_ADDRESS=${address}`);

  return address;
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;
