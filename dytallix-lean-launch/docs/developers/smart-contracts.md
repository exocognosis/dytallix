---
title: "Smart Contracts"
---

# Smart Contracts

Deploy contracts on the testnet.

> Last updated: 2025-08-20

## Tooling

- Rust and CosmWasm
- `npm run build:contract`

## Deploy

```bash
npm run deploy:contract -- path/to/contract.wasm
```

## Pre-deploy Checklist

- Audit code
- Estimate gas
- Set admin address

Common errors & fixes

- `insufficient fee` → increase gas.
- `upload failed` → ensure wasm compiled.

Next: [SDK](sdk.md)
