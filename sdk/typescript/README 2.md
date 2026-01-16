# @dytallix/sdk

Official TypeScript SDK for the Dytallix blockchain with post-quantum cryptography (PQC) support.

[![npm version](https://badge.fury.io/js/@dytallix%2Fsdk.svg)](https://www.npmjs.com/package/@dytallix/sdk)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Features

- 🔐 **PQC Wallet Generation** - ML-DSA-65 (FIPS 204) quantum-resistant keys
- ✍️ **Transaction & Message Signing** - Secure PQC signatures with verification
- 🌐 **RPC Client** - Full blockchain interaction (accounts, blocks, transactions)
- 🚰 **Faucet Integration** - Testnet token requests built-in
- 💎 **Staking Rewards** - Query and claim staking rewards
- 📦 **TypeScript** - Full type definitions included
- 🖥️ **Node.js & Browser** - Works in both environments

## Installation

\`\`\`bash
npm install @dytallix/sdk pqc-wasm
\`\`\`

> **Note:** \`pqc-wasm\` provides the quantum-resistant cryptography bindings and is a required peer dependency.

## Quick Start

\`\`\`typescript
import { 
  DytallixClient, 
  PQCWallet, 
  initPQC,
  TESTNET_RPC,
  TESTNET_CHAIN_ID 
} from '@dytallix/sdk';

// Initialize PQC (required before wallet operations)
await initPQC();

// Connect to testnet
const client = new DytallixClient({
  rpcUrl: TESTNET_RPC,
  chainId: TESTNET_CHAIN_ID
});

// Check chain status
const status = await client.getStatus();
console.log('Block height:', status.block_height);

// Generate a new wallet
const wallet = await PQCWallet.generate();
console.log('Address:', wallet.address);

// Request testnet tokens
const faucet = await client.requestFaucet(wallet.address, ['DGT', 'DRT']);
console.log('Faucet:', faucet.success ? 'Received tokens!' : faucet.error);

// Query balance
const account = await client.getAccount(wallet.address);
console.log('DGT Balance:', account.balances.DGT);
console.log('DRT Balance:', account.balances.DRT);

// Sign and verify a message
const signature = await wallet.signMessage('Hello Dytallix!');
const isValid = await wallet.verifySignature('Hello Dytallix!', signature);
console.log('Signature valid:', isValid);
\`\`\`

## API Reference

### Initialization

#### \`initPQC(): Promise<void>\`

Initialize the PQC WASM module. **Must be called before wallet operations.**

\`\`\`typescript
import { initPQC } from '@dytallix/sdk';
await initPQC();
\`\`\`

---

### PQCWallet

#### \`PQCWallet.generate(algorithm?): Promise<PQCWallet>\`

Generate a new wallet with ML-DSA-65 keys.

\`\`\`typescript
const wallet = await PQCWallet.generate();
console.log(wallet.address);      // dyt1...
console.log(wallet.algorithm);    // fips204/ml-dsa-65
\`\`\`

#### \`wallet.signTransaction(txObj): Promise<SignedTx>\`

Sign a transaction object with the wallet's private key.

#### \`wallet.signMessage(message): Promise<Uint8Array>\`

Sign an arbitrary message and return the signature bytes.

\`\`\`typescript
const signature = await wallet.signMessage('Hello World');
console.log('Signature length:', signature.length); // 3309 bytes (Dilithium)
\`\`\`

#### \`wallet.verifySignature(message, signature): Promise<boolean>\`

Verify a message signature.

\`\`\`typescript
const isValid = await wallet.verifySignature('Hello World', signature);
\`\`\`

#### \`wallet.exportKeystore(password): Promise<string>\`

Export wallet as encrypted JSON keystore.

\`\`\`typescript
const keystore = await wallet.exportKeystore('my-secure-password');
// Save to file
\`\`\`

#### \`PQCWallet.fromKeystore(json, password): Promise<PQCWallet>\`

Import wallet from encrypted keystore.

\`\`\`typescript
const wallet = await PQCWallet.fromKeystore(keystoreJson, 'my-password');
\`\`\`

---

### DytallixClient

#### Constructor

\`\`\`typescript
const client = new DytallixClient({
  rpcUrl: 'https://dytallix.com/rpc',
  chainId: 'dytallix-testnet-1',
  timeout: 30000  // optional, defaults to 30s
});
\`\`\`

#### \`client.getStatus(): Promise<ChainStatus>\`

Get current blockchain status.

\`\`\`typescript
const status = await client.getStatus();
// { block_height: 123456, chain_id: 'dytallix-testnet-1', ... }
\`\`\`

#### \`client.getAccount(address): Promise<Account>\`

Fetch account balances and nonce.

\`\`\`typescript
const account = await client.getAccount('dyt1...');
// { balances: { DGT: 100, DRT: 500 }, nonce: 5 }
\`\`\`

#### \`client.getBlocks(query?): Promise<Block[]>\`

List recent blocks with optional pagination.

\`\`\`typescript
const blocks = await client.getBlocks({ limit: 10, offset: 0 });
blocks.forEach(b => console.log(\`Block \${b.height}: \${b.hash}\`));
\`\`\`

#### \`client.getBlock(id): Promise<Block>\`

Get a specific block by height or hash.

\`\`\`typescript
const block = await client.getBlock(12345);
console.log('Transactions:', block.transactions);
\`\`\`

#### \`client.getStakingRewards(address): Promise<StakingRewards>\`

Get pending staking rewards for an address.

\`\`\`typescript
const rewards = await client.getStakingRewards('dyt1...');
console.log('Pending DGT:', rewards.rewards.DGT);
console.log('Pending DRT:', rewards.rewards.DRT);
\`\`\`

#### \`client.claimRewards(wallet): Promise<ClaimRewardsResponse>\`

Claim staking rewards (signs and submits transaction).

\`\`\`typescript
const result = await client.claimRewards(wallet);
if (result.success) {
  console.log('Claimed:', result.claimed);
}
\`\`\`

#### \`client.requestFaucet(address, tokens): Promise<FaucetResponse>\`

Request testnet tokens from the faucet.

\`\`\`typescript
const result = await client.requestFaucet('dyt1...', ['DGT', 'DRT']);
if (result.success) {
  result.dispensed.forEach(d => console.log(\`\${d.symbol}: \${d.amount}\`));
}
\`\`\`

#### \`client.sendTokens(request): Promise<TransactionResponse>\`

Send tokens to another address.

\`\`\`typescript
const tx = await client.sendTokens({
  from: wallet,
  to: 'dyt1recipient...',
  amount: 10,
  denom: 'DRT',
  memo: 'Payment'
});
console.log('TX Hash:', tx.hash);
\`\`\`

#### \`client.waitForTransaction(hash, timeout?): Promise<TransactionReceipt>\`

Wait for transaction confirmation.

\`\`\`typescript
const receipt = await client.waitForTransaction(tx.hash);
console.log('Status:', receipt.status); // 'success' or 'failed'
\`\`\`

---

## Network Constants

\`\`\`typescript
import { TESTNET_RPC, TESTNET_CHAIN_ID, VERSION } from '@dytallix/sdk';

// TESTNET_RPC = 'https://dytallix.com/rpc'
// TESTNET_CHAIN_ID = 'dytallix-testnet-1'
// VERSION = '0.2.0'
\`\`\`

## Token Denominations

| Token | Symbol | Micro-unit | Description |
|-------|--------|------------|-------------|
| DGT | Dytallix Governance Token | udgt | Staking & governance |
| DRT | Dytallix Reward Token | udrt | Transaction fees & rewards |

**Conversion:** 1 DGT = 1,000,000 udgt

## Error Handling

\`\`\`typescript
import { DytallixError, ErrorCode } from '@dytallix/sdk';

try {
  await initPQC();
} catch (error) {
  if (error instanceof DytallixError) {
    switch (error.code) {
      case ErrorCode.PQC_NOT_INITIALIZED:
        console.error('Install pqc-wasm: npm install pqc-wasm');
        break;
      case ErrorCode.PQC_SIGN_FAILED:
        console.error('Signing failed');
        break;
      case ErrorCode.PQC_VERIFY_FAILED:
        console.error('Signature verification failed');
        break;
    }
  }
}
\`\`\`

## Examples

See the [examples/](./examples/) directory for complete working examples:

- \`e2e_test.js\` - Full end-to-end test against live testnet- `deploy_contract.js` - Smart contract deployment example

---

## Running a Node

### Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/DytallixHQ/Dytallix.git
cd Dytallix

# Build and run with Docker
docker build -t dytallix-node .
docker run -p 3030:3030 -p 30303:30303 dytallix-node
```

### From Source

```bash
# Prerequisites: Rust 1.82+, clang, protobuf-compiler

# Clone and build with contracts feature
git clone https://github.com/DytallixHQ/Dytallix.git
cd Dytallix/dytallix-fast-launch/node
cargo build --release --features "contracts,metrics"

# Run
./target/release/dytallix-fast-node
```

### Connect to Testnet

```bash
# Set environment variables
export DYT_CHAIN_ID=dytallix-testnet-1
export DYT_RPC_PORT=3030
export DYT_SEED_NODE=178.156.187.81:30303

./target/release/dytallix-fast-node
```

### Genesis Configuration

The testnet genesis configuration is available at [genesis.json](../genesis.json). Key parameters:

| Parameter | Value |
|-----------|-------|
| Chain ID | `dytallix-testnet-1` |
| Block Time | 3 seconds |
| PQC Algorithm | ML-DSA-65 |
| Contracts | Enabled |

---

## Smart Contracts

Dytallix supports WASM smart contracts with gas metering.

### Deploy a Contract

```typescript
import { DytallixClient, PQCWallet, initPQC } from '@dytallix/sdk';
import fs from 'fs';

await initPQC();
const client = new DytallixClient({ rpcUrl: 'https://dytallix.com/rpc' });
const wallet = await PQCWallet.generate();

// Read WASM bytecode
const wasmCode = fs.readFileSync('my_contract.wasm');

// Deploy
const result = await client.deployContract({
  code: wasmCode.toString('hex'),
  deployer: wallet.address,
  gasLimit: 2_000_000
});

console.log('Contract deployed at:', result.address);
console.log('Transaction hash:', result.txHash);
```

### Call a Contract

```typescript
const result = await client.callContract({
  address: 'dyt1contract...',
  method: 'get_value',
  args: '',
  gasLimit: 500_000
});

console.log('Result:', result.result);
console.log('Gas used:', result.gasUsed);
console.log('Logs:', result.logs);
```

### Query Contract State

```typescript
const state = await client.getContractState({
  address: 'dyt1contract...',
  key: 'counter'
});

console.log('State value:', state);
```

### Contract SDK Methods

| Method | Description |
|--------|-------------|
| `deployContract(request)` | Deploy WASM bytecode |
| `callContract(request)` | Execute a contract method |
| `getContractState(query)` | Read contract storage |
| `getGenesis()` | Get chain configuration |

---
## License

Apache-2.0
