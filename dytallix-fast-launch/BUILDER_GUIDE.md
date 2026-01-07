# 🚀 Building on Dytallix: Complete Developer Guide

## Introduction

Welcome! If you've discovered Dytallix and want to build on it, this guide will take you from zero to deploying your first quantum-resistant DApp.

**What you'll learn:**
- ✅ How to run a local Dytallix node
- ✅ How to use the Dytallix SDK
- ✅ How to build a simple payment app
- ✅ How to deploy to testnet
- ✅ How to integrate PQC wallets into your app

---

## 🎯 Prerequisites

Before you start, make sure you have:

1. **Node.js** 18+ and **npm/yarn/pnpm**
2. **Rust** 1.75+ (for running the node locally)
3. **Git**
4. Basic knowledge of JavaScript/TypeScript
5. Understanding of blockchain concepts (transactions, addresses, signatures)

---

## 📦 Phase 1: Local Development Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/HisMadRealm/dytallix.git
cd dytallix/dytallix-fast-launch
```

### Step 2: Start a Local Node

```bash
# Build the node
cd node
cargo build --release

# Start the node
cargo run --release
```

Your node should now be running at `http://localhost:3030`

**Verify it's working:**
```bash
curl http://localhost:3030/status
# Should return: {"block_height": 0, "chain_id": "dyt-local-1", ...}
```

### Step 3: Start the Frontend (Optional)

```bash
# In a new terminal
cd ../frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to see the wallet interface.

---

## 📚 Phase 2: Install and Use the SDK

### Step 1: Create a New Project

```bash
mkdir my-dytallix-app
cd my-dytallix-app
npm init -y
npm install typescript tsx @types/node --save-dev
npm install @dytallix/sdk
```

### Step 2: Create Your First Script

Create `index.ts`:

```typescript
import { DytallixClient, PQCWallet } from '@dytallix/sdk';

async function main() {
  // Connect to local node
  const client = new DytallixClient({
    rpcUrl: 'http://localhost:3030',
    chainId: 'dyt-local-1'
  });

  // Check node status
  const status = await client.getStatus();
  console.log('Node status:', status);

  // Generate a wallet
  const wallet = await PQCWallet.generate('ML-DSA');
  console.log('Wallet address:', wallet.address);

  // Check balance
  const account = await client.getAccount(wallet.address);
  console.log('Balances:', account.balances);
}

main().catch(console.error);
```

### Step 3: Run It

```bash
npx tsx index.ts
```

---

## 💰 Phase 3: Get Test Tokens

Your newly created wallet will have zero balance. Let's get some test tokens:

### Option 1: Use the Faucet API

```bash
curl -X POST http://localhost:8787/api/faucet \
  -H "Content-Type: application/json" \
  -d '{"address":"YOUR_WALLET_ADDRESS"}'
```

### Option 2: Use the Frontend

1. Go to `http://localhost:5173`
2. Click "Faucet"
3. Paste your address
4. Request tokens

### Option 3: Programmatically

```typescript
async function requestTokens(address: string) {
  const response = await fetch('http://localhost:8787/api/faucet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address })
  });

  const result = await response.json();
  console.log('Faucet response:', result);
}
```

---

## 💸 Phase 4: Send Your First Transaction

Now that you have tokens, let's send them:

```typescript
import { DytallixClient, PQCWallet } from '@dytallix/sdk';

async function sendTransaction() {
  const client = new DytallixClient({
    rpcUrl: 'http://localhost:3030',
    chainId: 'dyt-local-1'
  });

  // Import your wallet (or generate a new one)
  const wallet = await PQCWallet.generate('ML-DSA');

  // Send 5 DRT to another address
  const tx = await client.sendTokens({
    from: wallet,
    to: 'pqc1ml...',  // Replace with recipient
    amount: 5,
    denom: 'DRT',
    memo: 'My first PQC transaction!'
  });

  console.log('Transaction hash:', tx.hash);

  // Wait for confirmation
  const receipt = await client.waitForTransaction(tx.hash);
  console.log('Confirmed in block:', receipt.block);
}

sendTransaction().catch(console.error);
```

---

## 🏗️ Phase 5: Build a Simple DApp

Let's build a simple payment gateway:

### Project Structure

```
payment-gateway/
├── src/
│   ├── server.ts
│   ├── payment.ts
│   └── index.html
├── package.json
└── tsconfig.json
```

### `src/payment.ts` - Payment Logic

```typescript
import { DytallixClient, PQCWallet, DytallixError, ErrorCode } from '@dytallix/sdk';

export class PaymentGateway {
  private client: DytallixClient;
  private merchantWallet: PQCWallet;

  constructor(rpcUrl: string, merchantWallet: PQCWallet) {
    this.client = new DytallixClient({
      rpcUrl,
      chainId: 'dyt-local-1'
    });
    this.merchantWallet = merchantWallet;
  }

  async createPaymentRequest(amount: number, orderId: string): Promise<string> {
    // Return merchant address for customer to send to
    return this.merchantWallet.address;
  }

  async verifyPayment(customerAddress: string, amount: number): Promise<boolean> {
    try {
      // Get customer's recent transactions
      const txs = await this.client.getTransactions({
        address: customerAddress,
        limit: 20
      });

      // Check if payment was sent to merchant
      const payment = txs.find(tx => 
        tx.to === this.merchantWallet.address &&
        tx.amount >= amount &&
        tx.status === 'success'
      );

      return !!payment;
    } catch (error) {
      console.error('Payment verification failed:', error);
      return false;
    }
  }

  async refund(customerAddress: string, amount: number): Promise<string> {
    const tx = await this.client.sendTokens({
      from: this.merchantWallet,
      to: customerAddress,
      amount,
      denom: 'DRT',
      memo: 'Refund'
    });

    await this.client.waitForTransaction(tx.hash);
    return tx.hash;
  }
}
```

### `src/server.ts` - Express Server

```typescript
import express from 'express';
import { PQCWallet } from '@dytallix/sdk';
import { PaymentGateway } from './payment';

const app = express();
app.use(express.json());

// Initialize merchant wallet (in production, load from encrypted keystore)
let gateway: PaymentGateway;

async function initialize() {
  const merchantWallet = await PQCWallet.generate('ML-DSA');
  console.log('Merchant wallet:', merchantWallet.address);

  gateway = new PaymentGateway('http://localhost:3030', merchantWallet);
}

// Create payment request
app.post('/api/payment/create', async (req, res) => {
  const { amount, orderId } = req.body;

  const paymentAddress = await gateway.createPaymentRequest(amount, orderId);

  res.json({
    success: true,
    paymentAddress,
    amount,
    orderId
  });
});

// Verify payment
app.post('/api/payment/verify', async (req, res) => {
  const { customerAddress, amount } = req.body;

  const verified = await gateway.verifyPayment(customerAddress, amount);

  res.json({
    success: verified,
    message: verified ? 'Payment confirmed' : 'Payment not found'
  });
});

// Refund
app.post('/api/payment/refund', async (req, res) => {
  const { customerAddress, amount } = req.body;

  const txHash = await gateway.refund(customerAddress, amount);

  res.json({
    success: true,
    txHash,
    message: 'Refund processed'
  });
});

initialize().then(() => {
  app.listen(3000, () => {
    console.log('Payment gateway running on http://localhost:3000');
  });
});
```

### Run Your Payment Gateway

```bash
npm install express @types/express
npx tsx src/server.ts
```

Test it:

```bash
# Create payment request
curl -X POST http://localhost:3000/api/payment/create \
  -H "Content-Type: application/json" \
  -d '{"amount":100,"orderId":"ORDER123"}'

# Verify payment
curl -X POST http://localhost:3000/api/payment/verify \
  -H "Content-Type: application/json" \
  -d '{"customerAddress":"pqc1ml...","amount":100}'
```

---

## 🌐 Phase 6: Deploy to Testnet

Once Dytallix testnet is live, update your code:

```typescript
const client = new DytallixClient({
  rpcUrl: 'https://rpc.testnet.dytallix.network',  // Testnet RPC
  chainId: 'dyt-testnet-1'                          // Testnet chain ID
});
```

Get testnet tokens from the public faucet:
```
https://faucet.testnet.dytallix.network
```

---

## 📖 Phase 7: More Examples

### Monitor Balance Changes

```typescript
async function monitorBalances(address: string) {
  const client = new DytallixClient({
    rpcUrl: 'http://localhost:3030',
    chainId: 'dyt-local-1'
  });

  let previousBalance = 0;

  setInterval(async () => {
    const account = await client.getAccount(address);
    const currentBalance = account.balances.DRT;

    if (currentBalance !== previousBalance) {
      console.log(`Balance changed: ${previousBalance} -> ${currentBalance} DRT`);
      previousBalance = currentBalance;
    }
  }, 5000);  // Check every 5 seconds
}
```

### Batch Payments

```typescript
async function sendBatchPayments(recipients: Array<{address: string, amount: number}>) {
  const client = new DytallixClient({
    rpcUrl: 'http://localhost:3030',
    chainId: 'dyt-local-1'
  });

  const wallet = await PQCWallet.generate('ML-DSA');

  const txHashes: string[] = [];

  for (const recipient of recipients) {
    const tx = await client.sendTokens({
      from: wallet,
      to: recipient.address,
      amount: recipient.amount,
      denom: 'DRT',
      memo: `Batch payment ${txHashes.length + 1}`
    });

    txHashes.push(tx.hash);
    console.log(`Sent ${recipient.amount} DRT to ${recipient.address}`);
  }

  // Wait for all confirmations
  await Promise.all(
    txHashes.map(hash => client.waitForTransaction(hash))
  );

  console.log('All payments confirmed!');
}
```

---

## 🔍 Available APIs

Your local node exposes these endpoints:

### Account APIs
- `GET /account/:address` - Get account balance and nonce
- `GET /balance/:address` - Get balance only
- `GET /transactions?address=:address` - Get transaction history

### Transaction APIs
- `POST /submit` - Submit signed transaction
- `GET /tx/:hash` - Get transaction by hash
- `GET /pending` - Get pending transactions

### Block APIs
- `GET /block/:height` - Get block by height
- `GET /block/latest` - Get latest block
- `GET /status` - Get node status

### Faucet API (Development Only)
- `POST /dev/faucet` - Request test tokens

---

## 🛠️ Troubleshooting

### "Cannot connect to node"

Make sure your node is running:
```bash
ps aux | grep dytallix-node
```

Restart if needed:
```bash
cd dytallix-fast-launch/node
cargo run --release
```

### "Insufficient funds"

Request tokens from the faucet:
```bash
curl -X POST http://localhost:8787/api/faucet \
  -H "Content-Type: application/json" \
  -d '{"address":"YOUR_ADDRESS"}'
```

### "PQC WASM module not loaded"

Ensure the PQC WASM module is initialized:
```typescript
// In browser
<script src="/pqc-wasm.js"></script>

// In Node.js
import { initPQC } from '@dytallix/pqc-wasm';
await initPQC();
```

---

## 📚 Next Steps

1. **Read the API docs**: See `docs/developers/api-reference.md`
2. **Join the community**: Discord (https://discord.gg/N8Q4A2KE) / GitHub Discussions
3. **Build something cool**: Share your project!
4. **Contribute**: Help improve the SDK or docs

---

## 🎓 Advanced Topics

### Custom Token Types (Coming Soon)
```typescript
// Deploy a custom token
const tokenAddress = await client.deployToken({
  name: 'MyToken',
  symbol: 'MTK',
  supply: 1000000
});
```

### Smart Contracts (Roadmap)
```typescript
// Deploy a smart contract
const contractAddress = await client.deployContract({
  bytecode: '0x...',
  abi: [...],
  args: []
});
```

### Cross-Chain Bridge (Roadmap)
```typescript
// Bridge tokens to Ethereum
const bridgeTx = await client.bridge({
  from: 'pqc1ml...',
  to: '0x...',  // Ethereum address
  amount: 100,
  destinationChain: 'ethereum'
});
```

---

## 🤝 Get Help

- **Documentation**: https://docs.dytallix.network
- **Discord**: https://discord.gg/dytallix
- **GitHub Issues**: https://github.com/HisMadRealm/dytallix/issues
- **Stack Overflow**: Tag `dytallix`

---

## 📜 License

This guide is licensed under Apache 2.0. See LICENSE for details.

---

**Happy Building! 🚀**

The future is quantum-resistant, and you're building it.
