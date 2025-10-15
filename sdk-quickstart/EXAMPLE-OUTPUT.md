# SDK Quickstart Demo Output

This document shows example outputs from the Dytallix SDK Quickstart scripts.

## Demo Script Output (Full Flow with Fallback)

```
╔════════════════════════════════════════════════════════════╗
║  🌟 Dytallix SDK Quickstart                              ║
║                                                            ║
║  Welcome! This script will verify your SDK installation   ║
║  and demonstrate basic functionality.                      ║
╚════════════════════════════════════════════════════════════╝

🔍 Testing connection to: https://rpc.testnet.dytallix.network
❌ Testnet RPC not reachable: getaddrinfo ENOTFOUND rpc.testnet.dytallix.network
   This is okay! We'll use a local mock server instead.

🚀 Starting local mock RPC server...

╔════════════════════════════════════════════════════════════╗
║  🚀 Dytallix Mock RPC Server                              ║
║                                                            ║
║  Status:    RUNNING                                        ║
║  Port:      26657                                          ║
║  Endpoint:  http://localhost:26657/status                  ║
║                                                            ║
║  This server simulates a Dytallix node for SDK testing    ║
╚════════════════════════════════════════════════════════════╝


🔍 Testing connection to: http://localhost:26657
📡 Mock RPC: Received /status request

╔════════════════════════════════════════════════════════════╗
║  ✅ Dytallix SDK Verified!                                ║
║                                                            ║
║  RPC:          http://localhost:26657                   ║
║  Chain ID:     dyt-testnet-1                            ║
║  Block Height: 12345                                    ║
║                                                            ║
║  Your SDK is working correctly! 🎉                        ║
╚════════════════════════════════════════════════════════════╝
  

📚 Next Steps:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 🏗️  Install Dytallix CLI:
   npm install -g @dytallix/cli

2. 📖 Read the documentation:
   https://docs.dytallix.network

3. 🐳 Run a local node with Docker:
   docker run -p 26657:26657 dytallix/node:latest

4. 💰 Get testnet tokens:
   Visit https://faucet.testnet.dytallix.network

5. 🔨 Build something amazing!
   Check out examples/ directory for more demos


🛑 Stopping mock RPC server...
✨ Quickstart complete!
```

## Simple Status Check Output

```
✅ Dytallix SDK is working!
   RPC: http://localhost:26657
   Chain ID: dyt-testnet-1
   Block height: 12345
```

## Mock RPC Server Output

```
╔════════════════════════════════════════════════════════════╗
║  🚀 Dytallix Mock RPC Server                              ║
║                                                            ║
║  Status:    RUNNING                                        ║
║  Port:      26657                                          ║
║  Endpoint:  http://localhost:26657/status                  ║
║                                                            ║
║  This server simulates a Dytallix node for SDK testing    ║
╚════════════════════════════════════════════════════════════╝

📡 Mock RPC: Received /status request
📡 Mock RPC: Received /status request
```

## One-Liner Test Output

```bash
$ node -e "import('@dytallix/sdk').then(async (m) => { const c = new m.DytallixClient({ rpcUrl: 'http://localhost:26657', chainId: 'dyt-testnet-1' }); const s = await c.getStatus(); console.log('Block height:', s.block_height); });"
Block height: 12345
```

## Mock Server JSON Responses

### GET /status
```json
{
  "block_height": 12345,
  "chain_id": "dyt-testnet-1",
  "latest_block_hash": "0xABCDEF1234567890",
  "latest_block_time": "2025-10-15T01:28:56.512Z"
}
```

### GET /health
```json
{
  "status": "ok",
  "message": "Mock RPC server is running"
}
```
