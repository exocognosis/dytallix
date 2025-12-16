import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import 'dotenv/config';
import solc from 'solc';
import { ethers } from 'ethers';

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function compile() {
  const source = fs.readFileSync(new URL('./Attestation.sol', import.meta.url), 'utf8');
  const input = {
    language: 'Solidity',
    sources: { 'Attestation.sol': { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } }
    }
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors?.length) {
    const fatal = output.errors.filter(e => e.severity === 'error');
    if (fatal.length) throw new Error(fatal.map(e => e.formattedMessage).join('\n'));
  }
  const contract = output.contracts['Attestation.sol'].QuantumVaultAttestation;
  return { abi: contract.abi, bytecode: contract.evm.bytecode.object };
}

async function main() {
  const rpcUrl = required('RPC_URL');
  const pk = required('DEPLOYER_PRIVATE_KEY');
  const outDir = required('OUT_DIR');

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);

  const { abi, bytecode } = compile();
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const network = await provider.getNetwork();

  const payload = {
    address,
    chainId: network.chainId.toString(),
    abi
  };

  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'attestation.json');
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));

  console.log(JSON.stringify({ deployed: true, address, chainId: payload.chainId, outPath }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
