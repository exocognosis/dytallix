---
title: "Quickstart"
---

# Quickstart

Get a node running and send your first transaction.

> Last updated: 2025-08-20

## Prerequisites

- Linux or macOS
- Node.js 18+
- Git 2+
- Docker 24+

## Steps

1. Clone the repo.
   ```bash
   git clone https://github.com/dytallix/dytallix-lean-launch.git
   cd dytallix-lean-launch
   ```
2. Install dependencies.
   ```bash
   npm install
   ```
3. Start a local node.
   ```bash
   docker compose up -d node
   ```
   Or connect to public RPC at `https://rpc.testnet.dytallix.example`.
4. Request tokens.
   ```bash
   curl -X POST https://api.testnet.dytallix.example/api/faucet -d '{"address":"dyt1..."}'
   ```
5. Send a transaction.
   ```bash
   node scripts/send-sample-tx.js
   ```
6. View the tx.
   ```bash
   echo "https://explorer.dytallix.example/tx/<hash>"
   ```

## Done in ~5 minutes

- [ ] Node running
- [ ] Tokens received
- [ ] Tx sent
- [ ] Tx visible in explorer

Common errors & fixes

- RPC 404 → check network URL.
- Faucet 429 → wait and retry.

Next: [Testnet Rules](testnet-rules.md)
