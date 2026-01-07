# Dytallix SDK Quickstart

> **Get up and running with the Dytallix SDK in under 2 minutes!**

This quickstart guide simulates the complete first-time developer experience with the Dytallix SDK. Even if the live testnet RPC isn't reachable, you'll get a working demonstration using our mock RPC server.

## 🚀 Quick Start

### Prerequisites

- Node.js ≥ 20
- npm ≥ 9

### Installation

```bash
# Create a new project directory
mkdir my-dytallix-app
cd my-dytallix-app

# Initialize npm project
npm init -y

# Install Dytallix SDK and Express (for mock server)
npm install @dytallix/sdk express
```

### Basic Usage

```javascript
import { DytallixClient } from '@dytallix/sdk';

const client = new DytallixClient({
  rpcUrl: 'https://rpc.testnet.dytallix.network',
  chainId: 'dyt-testnet-1'
});

// Check node status
const status = await client.getStatus();
console.log('Block height:', status.block_height);
```

## 🎯 Demo Scripts

This quickstart includes several demo scripts to help you get started:

### 1. Simple Status Check

```bash
node index.js
```

This runs a basic connection test to the testnet RPC. If the RPC is unreachable, it will fail gracefully.

### 2. Full Demo with Fallback

```bash
npm run demo
```

This comprehensive demo:
- ✅ Attempts to connect to live testnet RPC
- 🔄 Falls back to local mock RPC if testnet is unreachable
- 📊 Displays connection status and block height
- 📝 Shows next steps for continued development

### 3. Mock RPC Server Only

```bash
npm run start:mock
```

This starts just the mock RPC server on port 26657, useful for:
- Testing offline
- CI/CD pipelines
- Development environments

Then in another terminal:

```bash
RPC_URL=http://localhost:26657 node index.js
```

## 🔐 PQC Wallet Generation (Optional)

To generate post-quantum cryptographic wallets:

```bash
# Install the PQC WASM module (optional)
npm install @dytallix/pqc-wasm

# Run demo with PQC wallet generation
npm run demo -- --with-pqc
```

Example output:

```
🔐 Initializing PQC cryptography...
🔑 Generating ML-DSA (Dilithium) wallet...

✅ Wallet generated successfully!
   Address:    pqc1ml...xyz
   Algorithm:  ML-DSA
   Public Key: 0xABCD...
```

## 📖 What You'll Learn

This quickstart demonstrates:

1. **SDK Installation** - How to install and import the Dytallix SDK
2. **Client Configuration** - Connecting to RPC endpoints
3. **Status Queries** - Fetching blockchain state
4. **Error Handling** - Graceful fallbacks when services are unavailable
5. **PQC Wallets** - Generating quantum-resistant wallets (optional)

## 🏗️ Project Structure

```
sdk-quickstart/
├── package.json          # Dependencies and scripts
├── index.js             # Simple status check
├── demo.js              # Full demo with fallback
├── mock-rpc.js          # Mock RPC server
└── README.md            # This file
```

## 🔧 Mock RPC Server

The mock RPC server simulates a Dytallix node for testing purposes. It responds to:

- `GET /status` - Returns mock blockchain status
- `POST /rpc` - Accepts JSON-RPC requests
- `GET /health` - Health check endpoint

### Mock Response Example

```json
{
  "block_height": 12345,
  "chain_id": "dyt-testnet-1",
  "latest_block_hash": "0xABCDEF1234567890",
  "latest_block_time": "2025-10-15T01:20:41.351Z"
}
```

## 🎓 Next Steps

### 1. Install the Dytallix CLI

```bash
npm install -g @dytallix/cli
```

### 2. Read the Documentation

Visit [https://docs.dytallix.network](https://docs.dytallix.network) for:
- Detailed API reference
- Advanced tutorials
- Architecture guides
- Best practices

### 3. Run a Local Node

```bash
docker run -p 26657:26657 dytallix/node:latest
```

### 4. Get Testnet Tokens

Visit the faucet: [https://faucet.testnet.dytallix.network](https://faucet.testnet.dytallix.network)

### 5. Explore More Examples

Check out the `examples/` directory in the SDK repository:
- `basic-usage.js` - Simple queries
- `create-wallet.js` - Wallet management
- `send-transaction.js` - Token transfers
- `typescript-usage.ts` - TypeScript examples

## 🐛 Troubleshooting

### "Cannot find package '@dytallix/sdk'"

Make sure you've installed the SDK:

```bash
npm install @dytallix/sdk
```

### "Connection timeout" or "ENOTFOUND"

The testnet RPC might be temporarily unavailable. Use the demo with fallback:

```bash
npm run demo
```

Or connect to the mock server:

```bash
# Terminal 1
npm run start:mock

# Terminal 2
RPC_URL=http://localhost:26657 node index.js
```

### "Module type must be specified"

Add `"type": "module"` to your `package.json`:

```json
{
  "type": "module",
  ...
}
```

### Port 26657 already in use

Change the mock server port:

```bash
PORT=3000 npm run start:mock
```

Then use:

```bash
RPC_URL=http://localhost:3000 node index.js
```

## 📚 Additional Resources

- **SDK Documentation**: [sdk-for-github/README.md](../sdk-for-github/README.md)
- **GitHub Repository**: [https://github.com/HisMadRealm/dytallix](https://github.com/HisMadRealm/dytallix)
- **Website**: [https://dytallix.network](https://dytallix.network)
- **Discord Community**: [Join our Discord](https://discord.gg/dytallix)

## 📝 License

Apache-2.0 - See [LICENSE](../LICENSE) for details.

---

**Built with ❤️ by the Dytallix Team**

Questions? Issues? Open a ticket on [GitHub Issues](https://github.com/HisMadRealm/dytallix/issues).
