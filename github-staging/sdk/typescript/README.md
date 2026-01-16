# @dytallix/sdk

Official JavaScript/TypeScript SDK for interacting with the Dytallix blockchain.

## Features

- ✅ **PQC Wallet Integration** - ML-DSA (Dilithium) and SLH-DSA (SPHINCS+) support
- ✅ **Transaction Signing** - Quantum-resistant cryptographic signatures
- ✅ **Account Queries** - Fetch balances, nonces, transaction history
- ✅ **Token Transfers** - Send DGT/DRT with automatic fee calculation
- ✅ **TypeScript Support** - Full type definitions included
- ✅ **Browser & Node.js** - Works in both environments

## Installation

```bash
npm install @dytallix/sdk
# or
yarn add @dytallix/sdk
# or
pnpm add @dytallix/sdk
```

## Quick Start

### 1. Connect to Dytallix

```typescript
import { DytallixClient } from '@dytallix/sdk';

const client = new DytallixClient({
  rpcUrl: 'https://rpc.testnet.dytallix.network',
  chainId: 'dyt-testnet-1'
});

// Check node status
const status = await client.getStatus();
console.log('Block height:', status.block_height);
```

### 2. Create a PQC Wallet

```typescript
import { PQCWallet } from '@dytallix/sdk';

// Generate ML-DSA (Dilithium) wallet
const wallet = await PQCWallet.generate('ML-DSA');

console.log('Address:', wallet.address);
console.log('Algorithm:', wallet.algorithm);

// Export encrypted keystore
const keystore = await wallet.exportKeystore('your-secure-password');
```

### 3. Query Account Balance

```typescript
const account = await client.getAccount(wallet.address);

console.log('DGT Balance:', account.balances.DGT);
console.log('DRT Balance:', account.balances.DRT);
console.log('Nonce:', account.nonce);
```

### 4. Send a Transaction

```typescript
// Send 10 DRT to another address
const tx = await client.sendTokens({
  from: wallet,
  to: 'pqc1ml...',
  amount: 10,
  denom: 'DRT',
  memo: 'Payment for services'
});

console.log('Transaction hash:', tx.hash);

// Wait for confirmation
const receipt = await client.waitForTransaction(tx.hash);
console.log('Status:', receipt.status); // 'success' or 'failed'
```

### 5. Query Transaction History

```typescript
const txs = await client.getTransactions({
  address: wallet.address,
  limit: 10
});

for (const tx of txs) {
  console.log(`${tx.type}: ${tx.amount} ${tx.denom} - ${tx.status}`);
}
```

## API Reference

### DytallixClient

#### Constructor

```typescript
new DytallixClient(config: ClientConfig)
```

**Config Options:**
- `rpcUrl` (required): Blockchain RPC endpoint
- `chainId` (required): Chain identifier (e.g., 'dyt-testnet-1')
- `timeout`: Request timeout in ms (default: 30000)

#### Methods

##### `getStatus(): Promise<ChainStatus>`
Get current blockchain status.

```typescript
const status = await client.getStatus();
// { block_height: 12345, chain_id: 'dyt-testnet-1', ... }
```

##### `getAccount(address: string): Promise<Account>`
Fetch account details including balances and nonce.

```typescript
const account = await client.getAccount('pqc1ml...');
// { balances: { DGT: 100, DRT: 500 }, nonce: 5, ... }
```

##### `sendTokens(tx: SendTokensRequest): Promise<TransactionResponse>`
Sign and submit a token transfer transaction.

```typescript
const tx = await client.sendTokens({
  from: wallet,
  to: 'pqc1ml...',
  amount: 10,
  denom: 'DRT',
  memo: 'Optional memo'
});
```

##### `waitForTransaction(hash: string, timeout?: number): Promise<TransactionReceipt>`
Wait for transaction confirmation.

```typescript
const receipt = await client.waitForTransaction(tx.hash);
// { status: 'success', block: 12346, ... }
```

##### `getTransactions(query: TransactionQuery): Promise<Transaction[]>`
Query transaction history.

```typescript
const txs = await client.getTransactions({
  address: 'pqc1ml...',
  limit: 20,
  offset: 0
});
```

### PQCWallet

#### Static Methods

##### `generate(algorithm: 'ML-DSA' | 'SLH-DSA'): Promise<PQCWallet>`
Generate a new PQC wallet.

```typescript
const wallet = await PQCWallet.generate('ML-DSA');
```

##### `fromKeystore(keystore: string, password: string): Promise<PQCWallet>`
Import wallet from encrypted keystore.

```typescript
const wallet = await PQCWallet.fromKeystore(keystoreJson, 'password');
```

#### Instance Methods

##### `signTransaction(tx: Transaction): Promise<SignedTransaction>`
Sign a transaction with PQC signature.

```typescript
const signedTx = await wallet.signTransaction(txObject);
```

##### `exportKeystore(password: string): Promise<string>`
Export encrypted keystore JSON.

```typescript
const keystore = await wallet.exportKeystore('secure-password');
```

## TypeScript Types

```typescript
interface Account {
  address: string;
  balances: {
    DGT: number;
    DRT: number;
  };
  nonce: number;
}

interface Transaction {
  hash: string;
  from: string;
  to: string;
  amount: number;
  denom: 'DGT' | 'DRT';
  fee: number;
  memo?: string;
  status: 'pending' | 'success' | 'failed';
  block?: number;
  timestamp: string;
}

interface TransactionReceipt {
  hash: string;
  status: 'success' | 'failed';
  block: number;
  gasUsed: number;
  events: Event[];
}
```

## Examples

### Payment Gateway Integration

```typescript
import { DytallixClient, PQCWallet } from '@dytallix/sdk';

class PaymentGateway {
  private client: DytallixClient;
  private wallet: PQCWallet;

  async initialize() {
    this.client = new DytallixClient({
      rpcUrl: process.env.DYTALLIX_RPC_URL,
      chainId: 'dyt-testnet-1'
    });

    // Load merchant wallet
    const keystoreJson = await fs.readFile('merchant-wallet.json', 'utf-8');
    this.wallet = await PQCWallet.fromKeystore(keystoreJson, process.env.WALLET_PASSWORD);
  }

  async acceptPayment(customerAddress: string, amount: number): Promise<string> {
    // Verify customer has sufficient balance
    const account = await this.client.getAccount(customerAddress);
    if (account.balances.DRT < amount) {
      throw new Error('Insufficient funds');
    }

    // Send request for payment (in real app, customer would sign)
    const tx = await this.client.sendTokens({
      from: this.wallet,
      to: customerAddress,
      amount: amount,
      denom: 'DRT',
      memo: `Payment request for order #${Date.now()}`
    });

    // Wait for confirmation
    await this.client.waitForTransaction(tx.hash);

    return tx.hash;
  }
}
```

### Token Balance Monitor

```typescript
import { DytallixClient } from '@dytallix/sdk';

async function monitorBalance(address: string) {
  const client = new DytallixClient({
    rpcUrl: 'https://rpc.testnet.dytallix.network',
    chainId: 'dyt-testnet-1'
  });

  setInterval(async () => {
    const account = await client.getAccount(address);
    console.log(`Current balances: DGT ${account.balances.DGT}, DRT ${account.balances.DRT}`);
  }, 5000); // Check every 5 seconds
}

monitorBalance('pqc1ml...');
```

## Error Handling

```typescript
import { DytallixError, ErrorCode } from '@dytallix/sdk';

try {
  await client.sendTokens({ ... });
} catch (error) {
  if (error instanceof DytallixError) {
    switch (error.code) {
      case ErrorCode.INSUFFICIENT_FUNDS:
        console.error('Not enough tokens');
        break;
      case ErrorCode.INVALID_SIGNATURE:
        console.error('Transaction signature invalid');
        break;
      case ErrorCode.NONCE_MISMATCH:
        console.error('Nonce out of sync, retry');
        break;
      default:
        console.error('Unknown error:', error.message);
    }
  }
}
```

## Network Configuration

### Testnet

```typescript
const client = new DytallixClient({
  rpcUrl: 'https://rpc.testnet.dytallix.network',
  chainId: 'dyt-testnet-1'
});
```

### Local Development

```typescript
const client = new DytallixClient({
  rpcUrl: 'http://localhost:3030',
  chainId: 'dyt-local-1'
});
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development setup and guidelines.

## License

Apache 2.0 - See [LICENSE](../LICENSE) for details.

## Support

- **Documentation**: https://docs.dytallix.network
- **Discord**: https://discord.gg/dytallix
- **GitHub Issues**: https://github.com/HisMadRealm/dytallix/issues
- **Twitter**: @DytallixNetwork

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.
