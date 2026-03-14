const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
const { compileContracts } = require('./compile');

const projectRoot = path.resolve(__dirname, '..');
const artifactPath = path.join(
  projectRoot,
  'artifacts',
  'contracts',
  'QuantumVaultAttestation.sol',
  'QuantumVaultAttestation.json',
);

function getArgValue(flagName) {
  const index = process.argv.findIndex((entry) => entry === flagName);
  if (index === -1 || index === process.argv.length - 1) {
    return null;
  }
  return process.argv[index + 1];
}

function loadArtifact() {
  if (!fs.existsSync(artifactPath)) {
    compileContracts();
  }

  return JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
}

async function main() {
  compileContracts();
  const artifact = loadArtifact();

  const rpcUrl = getArgValue('--rpc') || process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
  const privateKey = getArgValue('--private-key') || process.env.BLOCKCHAIN_PRIVATE_KEY;
  const fromAddress = getArgValue('--from') || process.env.BLOCKCHAIN_FROM_ADDRESS;

  if (!artifact?.abi || !artifact?.bytecode || artifact.bytecode === '0x') {
    throw new Error(`Artifact at ${artifactPath} is missing ABI or bytecode`);
  }

  console.log(`Deploying QuantumVaultAttestation via RPC ${rpcUrl}...`);
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  let signer;

  if (privateKey) {
    signer = new ethers.Wallet(privateKey, provider);
  } else {
    const candidateAccounts = fromAddress
      ? [fromAddress]
      : await provider.send('eth_accounts', []);

    if (!candidateAccounts.length) {
      throw new Error(
        'No deployer configured. Set BLOCKCHAIN_PRIVATE_KEY or provide BLOCKCHAIN_FROM_ADDRESS/an unlocked RPC account.',
      );
    }

    signer = await provider.getSigner(candidateAccounts[0]);
  }

  const signerAddress = await signer.getAddress();
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
  const contract = await factory.deploy();
  const deploymentTx = contract.deploymentTransaction();

  if (deploymentTx) {
    console.log(`Deployment transaction: ${deploymentTx.hash}`);
  }

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const network = await provider.getNetwork();
  const receipt = deploymentTx ? await provider.getTransactionReceipt(deploymentTx.hash) : null;

  const deploymentsDir = path.join(projectRoot, 'deployments', String(network.chainId));
  fs.mkdirSync(deploymentsDir, { recursive: true });
  fs.writeFileSync(
    path.join(deploymentsDir, 'QuantumVaultAttestation.json'),
    JSON.stringify(
      {
        address,
        chainId: Number(network.chainId),
        deployer: signerAddress,
        transactionHash: deploymentTx?.hash || null,
        blockNumber: receipt?.blockNumber || null,
        deployedAt: new Date().toISOString(),
        artifactPath: path.relative(projectRoot, artifactPath),
      },
      null,
      2,
    ),
  );

  console.log(`QuantumVaultAttestation deployed to: ${address}`);
  console.log(`Chain ID: ${network.chainId.toString()}`);
  console.log(`Deployer: ${signerAddress}`);
  console.log('Update your backend environment with:');
  console.log(`ATTESTATION_CONTRACT_ADDRESS=${address}`);

  return address;
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error instanceof Error ? error.stack || error.message : error);
      process.exit(1);
    });
}

module.exports = main;
