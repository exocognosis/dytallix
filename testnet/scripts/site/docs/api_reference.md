# Dytallix Testnet API Reference

## Base URLs

- **RPC**: `http://rpc.dytallix.com:26657`
- **REST API**: `http://api.dytallix.com:1317`
- **WebSocket**: `ws://rpc.dytallix.com:26657/websocket`

## Authentication

The Dytallix testnet API does not require authentication for read operations. Write operations require valid transaction signatures using post-quantum cryptography.

## Rate Limits

- **API calls**: 100 requests per minute per IP
- **WebSocket connections**: 5 concurrent per IP
- **Transaction submission**: 10 TPS per address

## Endpoints

### Node Information

#### Get Node Status
```http
GET /status
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "node_info": {
      "protocol_version": {
        "p2p": "8",
        "block": "11",
        "app": "1"
      },
      "id": "abc123def456...",
      "listen_addr": "tcp://0.0.0.0:26656",
      "network": "dytallix-testnet-1",
      "version": "0.34.19",
      "channels": "40202122233038606100",
      "moniker": "dytallix-testnet-node",
      "other": {
        "tx_index": "on",
        "rpc_address": "tcp://0.0.0.0:26657"
      }
    },
    "sync_info": {
      "latest_block_hash": "7a8b9c...",
      "latest_app_hash": "def456...",
      "latest_block_height": "847293",
      "latest_block_time": "2025-07-31T15:30:00Z",
      "earliest_block_hash": "000000...",
      "earliest_app_hash": "111111...",
      "earliest_block_height": "1",
      "earliest_block_time": "2025-07-31T15:19:10Z",
      "catching_up": false
    },
    "validator_info": {
      "address": "abc123...",
      "pub_key": {
        "type": "dilithium5",
        "value": "def456..."
      },
      "voting_power": "250000000"
    }
  }
}
```

### Blockchain Data

#### Get Latest Block
```http
GET /blocks/latest
```

#### Get Block by Height
```http
GET /blocks/{height}
```

#### Get Transaction
```http
GET /txs/{hash}
```

### Account Information

#### Get Account
```http
GET /cosmos/auth/v1beta1/accounts/{address}
```

#### Get Account Balance
```http
GET /cosmos/bank/v1beta1/balances/{address}
```

**Example Response:**
```json
{
  "balances": [
    {
      "denom": "udgt",
      "amount": "1000000000"
    }
  ],
  "pagination": {
    "next_key": null,
    "total": "1"
  }
}
```

### Staking

#### Get Validators
```http
GET /cosmos/staking/v1beta1/validators
```

#### Get Delegations
```http
GET /cosmos/staking/v1beta1/delegations/{delegator_addr}
```

### Smart Contracts (WASM)

#### Get Contract Info
```http
GET /cosmwasm/wasm/v1/contract/{address}
```

#### Query Contract
```http
GET /cosmwasm/wasm/v1/contract/{address}/smart/{query}
```

### Governance

#### Get Proposals
```http
GET /cosmos/gov/v1beta1/proposals
```

#### Get Proposal
```http
GET /cosmos/gov/v1beta1/proposals/{proposal_id}
```

## Transaction Broadcasting

### Broadcast Transaction
```http
POST /cosmos/tx/v1beta1/txs
```

**Request Body:**
```json
{
  "tx_bytes": "base64_encoded_transaction",
  "mode": "BROADCAST_MODE_SYNC"
}
```

**Broadcast Modes:**
- `BROADCAST_MODE_SYNC`: Wait for transaction to be checked
- `BROADCAST_MODE_ASYNC`: Return immediately
- `BROADCAST_MODE_BLOCK`: Wait for transaction to be included in block

## WebSocket Subscriptions

Connect to `ws://rpc.dytallix.com:26657/websocket` for real-time updates.

### Subscribe to New Blocks
```json
{
  "jsonrpc": "2.0",
  "method": "subscribe",
  "id": 1,
  "params": {
    "query": "tm.event='NewBlock'"
  }
}
```

### Subscribe to Transactions
```json
{
  "jsonrpc": "2.0",
  "method": "subscribe",
  "id": 2,
  "params": {
    "query": "tm.event='Tx'"
  }
}
```

### Subscribe to Validator Updates
```json
{
  "jsonrpc": "2.0",
  "method": "subscribe",
  "id": 3,
  "params": {
    "query": "tm.event='ValidatorSetUpdates'"
  }
}
```

## Post-Quantum Cryptography

### Supported Algorithms

| Algorithm | Type | Usage |
|-----------|------|-------|
| Dilithium5 | Digital Signature | Transaction signing |
| Falcon512 | Digital Signature | Lightweight operations |
| SPHINCS+ | Digital Signature | Long-term security |
| Kyber1024 | Key Exchange | Session establishment |

### Transaction Signing

Transactions must be signed with PQC algorithms:

```javascript
// Example using dytallix-js SDK
const tx = await wallet.signTransaction({
  msgs: [transferMsg],
  fee: {
    amount: [{ denom: 'udgt', amount: '1250' }],
    gas: '50000'
  },
  memo: 'PQC transaction',
  algorithm: 'dilithium5'
});

const result = await client.broadcast(tx);
```

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Node temporarily unavailable |

### Transaction Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 4 | Insufficient funds | Account balance too low |
| 5 | Invalid signature | PQC signature verification failed |
| 11 | Out of gas | Transaction exceeded gas limit |
| 19 | Tx already in mempool | Duplicate transaction |

## SDK Examples

### JavaScript/TypeScript
```bash
npm install @dytallix/sdk
```

```javascript
import { DytallixClient } from '@dytallix/sdk';

const client = new DytallixClient({
  rpcUrl: 'http://rpc.dytallix.com:26657',
  apiUrl: 'http://api.dytallix.com:1317'
});

// Get latest block
const block = await client.getLatestBlock();

// Get account balance
const balance = await client.getBalance('dytallix1...');

// Send transaction
const tx = await client.sendTokens({
  from: 'dytallix1...',
  to: 'dytallix1...',
  amount: '1000000',
  denom: 'udgt'
});
```

### Python
```bash
pip install dytallix-python
```

```python
from dytallix import DytallixClient

client = DytallixClient(
    rpc_url="http://rpc.dytallix.com:26657",
    api_url="http://api.dytallix.com:1317"
)

# Get latest block
block = client.get_latest_block()

# Get account balance
balance = client.get_balance("dytallix1...")

# Send transaction
tx = client.send_tokens(
    from_address="dytallix1...",
    to_address="dytallix1...",
    amount="1000000",
    denom="udgt"
)
```

### Go
```bash
go get github.com/HisMadRealm/dytallix/sdk/go
```

```go
package main

import (
    "github.com/HisMadRealm/dytallix/sdk/go"
)

func main() {
    client := dytallix.NewClient(dytallix.Config{
        RPCUrl: "http://rpc.dytallix.com:26657",
        APIUrl: "http://api.dytallix.com:1317",
    })

    // Get latest block
    block, err := client.GetLatestBlock()

    // Get account balance
    balance, err := client.GetBalance("dytallix1...")

    // Send transaction
    tx, err := client.SendTokens(dytallix.SendTokensReq{
        From:   "dytallix1...",
        To:     "dytallix1...",
        Amount: "1000000",
        Denom:  "udgt",
    })
}
```

## Testnet-Specific Features

### Faucet API

Get test tokens from the faucet:

```http
POST http://faucet.dytallix.com/api/faucet
Content-Type: application/json

{
  "address": "dytallix1your_address_here"
}
```

**Response:**
```json
{
  "success": true,
  "tx_hash": "0x7a8b9c...",
  "amount": "1000000000",
  "message": "1000 DGT sent successfully"
}
```

### Network Reset

The testnet may be reset periodically for upgrades. Monitor announcements in:
- Discord: https://discord.gg/fw34A8bK
- GitHub: https://github.com/HisMadRealm/dytallix

## Support

- **Discord**: [discord.gg/fw34A8bK](https://discord.gg/fw34A8bK)
- **Email**: [hello@dytallix.com](mailto:hello@dytallix.com)
- **GitHub Issues**: [github.com/HisMadRealm/dytallix/issues](https://github.com/HisMadRealm/dytallix/issues)

---

*Last Updated: July 31, 2025*
*API Version: v1.0.0-testnet*
