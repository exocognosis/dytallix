---
title: "SDK"
---

# SDK

Client libraries for interacting with the chain.

> Last updated: 2025-08-20

## Install

```bash
npm install @dytallix/sdk
```

## JS Example

```javascript
import {Client} from '@dytallix/sdk';
const c = new Client('https://rpc.testnet.dytallix.example');
await c.status();
```

## Python Example

```python
from dytallix import Client
c = Client('https://rpc.testnet.dytallix.example')
print(c.status())
```

## Go Example

```go
client := NewClient("https://rpc.testnet.dytallix.example")
client.Status()
```

Errors are returned with HTTP status codes. Retry with exponential backoff.

Next: [API Reference](api-reference.md)
