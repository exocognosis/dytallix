---
title: "Faucet Guide"
---

# Faucet Guide

Request test tokens via UI or API.

> Last updated: 2025-08-20

## Web UI

1. Visit https://faucet.dytallix.example.
2. Enter your `dyt1` address.
3. Click *Send*.

## API

```bash
curl -X POST https://api.testnet.dytallix.example/api/faucet \
  -H 'Content-Type: application/json' \
  -d '{"address":"dyt1abc"}'
```

Sample response:

```json
{ "status": "ok", "tx": "ABC123" }
```

Rate limit: 1 request/hour. Error codes: `429` for limit, `400` invalid address.

Troubleshooting: ensure address is correct and network online.

Next: [Explorer Guide](explorer-guide.md)
