---
title: "API Reference"
---

# API Reference

REST endpoints for the testnet.

> Last updated: 2025-08-20

OpenAPI spec: [openapi.yaml](/openapi/openapi.yaml) | [Rendered Reference](openapi.md)

## Faucet

```bash
curl -X POST https://api.testnet.dytallix.example/api/faucet -d '{"address":"dyt1abc"}'
```

## Status

```bash
curl https://api.testnet.dytallix.example/api/status
# {"block_height":12345}
```

## JS Fetch

```javascript
fetch('https://api.testnet.dytallix.example/api/balance?address=dyt1abc')
  .then(r => r.json())
  .then(console.log);
```

Next: [WebSockets & gRPC](websockets-grpc.md)
