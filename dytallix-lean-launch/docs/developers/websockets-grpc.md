---
title: "WebSockets & gRPC"
---

# WebSockets & gRPC

Realtime subscriptions.

> Last updated: 2025-08-20

## WebSocket

```javascript
const ws = new WebSocket('wss://ws.testnet.dytallix.example/blocks');
ws.onclose = () => setTimeout(connect, 1000);
```

## gRPC

```bash
grpcurl testnet.dytallix.example:9090 dytallix.StatusService/StreamBlocks
```

Next: [JS Quickstart](examples/js-quickstart.md)
