---
title: Autonomous Agents on Dytallix
---

# Autonomous Agents on Dytallix

This guide provides a full workflow for both humans and AI agents to:

1. Download and use the Dytallix SDK.
2. Spin up a local Dytallix node + faucet services.
3. Create agent wallets.
4. Request test tokens from the faucet.
5. Execute value transfers and store account snapshots.
6. Build applications that automate these flows.

## Prerequisites

- Node.js 18+
- npm 9+
- Rust toolchain (`cargo`, `rustc`)
- Git

## 1) Start a local Dytallix environment

From `dytallix-fast-launch/`:

```bash
npm install
./scripts/build-node.sh
./scripts/start-node.sh
./start-all-services.sh
```

Expected endpoints:

- API/Faucet gateway: `http://localhost:3001`
- Blockchain proxy RPC: `http://localhost:3001/blockchain`
- Faucet routes: `http://localhost:3001/faucet`

## 2) Install or build the SDK

Use npm package distribution:

```bash
npm install @dytallix/sdk
```

Or build from source (recommended for local development):

```bash
cd sdk
npm install
npm run build
```

## 3) Create an agent runtime

The SDK exports `AutonomousAgentKit` and `AgentValueStore` abstractions.

```ts
import {
  AutonomousAgentKit,
  InMemoryAgentValueStore,
  PQCWallet
} from '@dytallix/sdk';

PQCWallet.setProvider(yourPqcProvider);

const kit = new AutonomousAgentKit({
  rpcUrl: 'http://localhost:3001/blockchain',
  faucetUrl: 'http://localhost:3001/faucet',
  chainId: 'dyt-local-1'
});

const store = new InMemoryAgentValueStore();
```

## 4) Wallet creation + faucet funding

```ts
const treasury = await kit.createAgent('treasury-agent', 'ML-DSA');
const worker = await kit.createAgent('worker-agent', 'SLH-DSA');

await kit.requestTokens(treasury, {
  dgtAmount: 2,
  drtAmount: 50
});
```

## 5) Execute transactions and store value

```ts
const tx = await kit.transferValue(
  treasury,
  worker.wallet.address,
  5,
  'DRT',
  'agent-budget'
);

await kit.waitForSettlement(tx.hash, 45_000);

await kit.snapshot(treasury, store);
await kit.snapshot(worker, store);
```

## 6) Run the complete example

A full example app is available:

```bash
cd sdk
npx tsx examples/autonomous-agent.ts
```

## 7) App architecture recommendations

For production-grade autonomous agents:

- Use a KMS/HSM-backed PQC provider implementation.
- Persist snapshots and agent state in durable storage.
- Add policy checks (max transfer amount, allowed recipients, budget windows).
- Add retry + idempotency keys around faucet and transfer paths.
- Capture post-settlement snapshots for accounting and dispute resolution.

## API Summary

`AutonomousAgentKit` methods:

- `createAgent(agentId, algorithm?)`
- `requestTokens(agent, { dgtAmount?, drtAmount? })`
- `transferValue(from, toAddress, amount, denom, memo?)`
- `waitForSettlement(hash, timeoutMs?)`
- `snapshot(agent, valueStore?)`

`InMemoryAgentValueStore` is included for local development and testing.
