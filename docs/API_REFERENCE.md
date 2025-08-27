# Dytallix API Reference

This document provides comprehensive API documentation for all Dytallix endpoints.

## Base URLs

- **Development**: `http://localhost:8787`
- **Testnet**: `https://api.testnet.dytallix.com`
- **Production**: `https://api.dytallix.com`

## Authentication

Most endpoints are public. Rate limiting applies to prevent abuse.

## Core Blockchain APIs

### Query Endpoints

#### GET `/balance/{address}`
Get account balance information.

**Parameters:**
- `address` (path): Dytallix address (dyt1...)
- `denom` (query, optional): Specific denomination (udgt, udrt)

**Response:**
```json
{
  "address": "dyt1...",
  "balances": {
    "udgt": {
      "balance": "1000000",
      "formatted": "1.0 DGT"
    },
    "udrt": {
      "balance": "500000", 
      "formatted": "0.5 DRT"
    }
  },
  "legacy_balance": "1000000"
}
```

#### GET `/tx/{hash}`
Get transaction details by hash.

**Parameters:**
- `hash` (path): Transaction hash (0x...)

**Response:**
```json
{
  "hash": "0x...",
  "block_height": 12345,
  "timestamp": "2024-08-27T04:06:00Z",
  "from": "dyt1...",
  "to": "dyt1...",
  "amount": "1000000",
  "gas_used": 21000,
  "status": "success"
}
```

#### GET `/block/{id}`
Get block information.

**Parameters:**
- `id` (path): Block height or hash

**Response:**
```json
{
  "height": 12345,
  "hash": "0x...",
  "timestamp": "2024-08-27T04:06:00Z",
  "validator": "dyt1...",
  "tx_count": 42,
  "size": 1024
}
```

#### GET `/validators`
Get active validator set.

**Response:**
```json
{
  "validators": [
    {
      "address": "dyt1...",
      "voting_power": "1000000",
      "commission": "0.05",
      "status": "active"
    }
  ]
}
```

#### GET `/proposals`
Get governance proposals.

**Response:**
```json
{
  "proposals": [
    {
      "id": 1,
      "title": "Network Upgrade",
      "status": "voting",
      "voting_end": "2024-09-01T00:00:00Z"
    }
  ]
}
```

#### GET `/api/emission`
Get token emission information.

**Response:**
```json
{
  "ok": true,
  "timestamp": "2024-08-27T04:06:00Z",
  "current_emission_rate": 25.0,
  "total_supply": 5250000.0,
  "circulating_supply": 4987500.0,
  "next_reduction_block": 210000,
  "blocks_until_reduction": 109000,
  "reduction_factor": 0.5,
  "current_block": 101000,
  "current_epoch": 0,
  "blocks_per_epoch": 210000
}
```

#### GET `/stats`
Get general network statistics.

**Response:**
```json
{
  "network": "dytallix-main",
  "height": 12345,
  "validators": 100,
  "total_supply": "21000000",
  "tx_count_24h": 5432
}
```

## AI & Security APIs

### Anomaly Detection

#### POST `/api/anomaly/run`
Trigger anomaly detection analysis.

**Request Body:**
```json
{
  "txHash": "0x1234567890abcdef...",
  "windowSize": "100tx"
}
```

**Response:**
```json
{
  "ok": true,
  "timestamp": "2024-08-27T04:06:00Z",
  "triggered": true,
  "anomalies": 2,
  "message": "Force detection completed: 2 anomalies found"
}
```

#### GET `/api/anomaly/status`
Get anomaly detection engine status.

**Response:**
```json
{
  "ok": true,
  "timestamp": "2024-08-27T04:06:00Z",
  "stats": {
    "collectors": {
      "mempool": { "status": "active", "count": 1542 },
      "blocks": { "status": "active", "count": 12345 }
    },
    "detectors": {
      "tx_spike": { "threshold": 100, "triggered": 5 }
    }
  }
}
```

#### POST `/api/anomaly/test-alerts`
Test anomaly alerting configuration.

**Response:**
```json
{
  "ok": true,
  "timestamp": "2024-08-27T04:06:00Z",
  "results": {
    "discord": { "success": true },
    "email": { "success": false, "error": "SMTP timeout" }
  },
  "message": "Alerting test completed"
}
```

#### GET `/anomaly`
Get current anomaly status (backwards compatible).

**Response:**
```json
{
  "ok": true,
  "timestamp": "2024-08-27T04:06:00Z",
  "anomalies": [
    {
      "id": "83c83ac4-7924-45a0-a483-f150e1bde31e",
      "type": "tx_spike",
      "severity": "critical",
      "entity": { "kind": "network", "id": "dytallix-main" },
      "timestamp": 1756191366697,
      "explanation": "Transaction spike detected: 223 tx/sec is 255% above baseline (63 tx/sec). Z-score: 3.97",
      "metrics": {
        "tx_rate": 223,
        "baseline_mean": 62.83,
        "z_score": 3.97
      }
    }
  ],
  "status": "critical"
}
```

### Contract Security

#### POST `/api/contract/scan`
Scan smart contract for security vulnerabilities.

**Request Body:**
```json
{
  "code": "pragma solidity ^0.8.0;\ncontract Example { ... }"
}
```

**Response:**
```json
{
  "ok": true,
  "timestamp": "2024-08-27T04:06:00Z",
  "summary": {
    "total": 3,
    "bySeverity": {
      "high": 1,
      "medium": 1,
      "low": 1
    }
  },
  "issues": [
    {
      "id": "s1",
      "severity": "high",
      "rule": "Reentrancy",
      "line": 73,
      "recommendation": "Use checks-effects-interactions; consider ReentrancyGuard."
    }
  ],
  "meta": {
    "ranAt": "2024-08-27T04:06:00Z",
    "model": "contract-scanner:production",
    "analyzers": ["slither", "mythril"],
    "duration_ms": 1250
  }
}
```

## Faucet API

#### POST `/api/faucet`
Request testnet tokens.

**Request Body:**
```json
{
  "address": "dyt1qyq2vzmnp7xjhgfedcba9876543210abcdef1234567890",
  "tokenType": "both"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Successfully sent both tokens to dyt1qyq2...",
  "transactions": [
    {
      "token": "DGT",
      "amount": "10000000",
      "txHash": "0x1234..."
    },
    {
      "token": "DRT", 
      "amount": "5000000",
      "txHash": "0x5678..."
    }
  ]
}
```

## Legacy API Support

### Blockchain Core (Rust)
- `DytallixNode` trait: start, stop, submit_transaction, get_block, get_status
- `ConsensusEngine` trait: propose_block, validate_block, sign_block, verify_signature
- `PQCKeyManager` trait: generate_keypair, sign, verify
- PQC algorithm traits: Dilithium, Falcon, SphincsPlus
- `CryptoAgilityManager` trait: set/get active algorithm, migrate_keys

### AI Services Integration
- Fraud analysis: Integrated into anomaly detection endpoints
- Contract auditing: Available via `/api/contract/scan`
- Risk scoring: Part of anomaly detection pipeline

### Wallet Integration
- `Wallet` trait: generate_keypair, sign_transaction, verify_signature, get_address
- CLI commands: keygen, sign, verify (see CLI documentation)

## System APIs

#### GET `/health`
Health check endpoint.

**Response:**
```json
{
  "ok": true,
  "ts": "2024-08-27T04:06:00Z"
}
```

#### GET `/metrics`
Prometheus metrics endpoint.

**Response:**
```
# HELP dytallix_faucet_requests_total Total faucet requests
# TYPE dytallix_faucet_requests_total counter
dytallix_faucet_requests_total{token="DGT"} 42
dytallix_faucet_requests_total{token="DRT"} 38
```

## Error Responses

All endpoints return errors in consistent format:

```json
{
  "ok": false,
  "error": "RATE_LIMITED",
  "message": "Rate limit exceeded for address. Try again in 3600 seconds.",
  "retryAfter": 3600
}
```

### Common Error Codes

- `RATE_LIMITED`: Too many requests
- `INVALID_ADDRESS`: Malformed address
- `INSUFFICIENT_FUNDS`: Faucet out of tokens
- `VALIDATION_ERROR`: Invalid request parameters
- `INTERNAL_ERROR`: Server error

## Rate Limits

- **Faucet**: Once per 24 hours per address (DGT), 6 hours (DRT)
- **Anomaly Detection**: 10 requests per minute per IP
- **Contract Scanning**: 5 requests per minute per IP
- **General Queries**: 100 requests per minute per IP

## CLI Usage Examples

```bash
# Query balance
dytallix query balance dyt1qyq2vzmnp7xjhgfedcba9876543210abcdef1234567890

# Query emission info
dytallix query emission

# Get transaction
dytallix query tx 0x1234567890abcdef...

# Get validators
dytallix query validators
```

## SDK Integration

### JavaScript/TypeScript
```javascript
import { DytallixAPI } from '@dytallix/sdk'

const api = new DytallixAPI('https://api.testnet.dytallix.com')
const balance = await api.getBalance('dyt1...')
```

### Python
```python
from dytallix import DytallixAPI

api = DytallixAPI('https://api.testnet.dytallix.com')
balance = api.get_balance('dyt1...')
```

### Rust
```rust
use dytallix_sdk::DytallixAPI;

let api = DytallixAPI::new("https://api.testnet.dytallix.com");
let balance = api.get_balance("dyt1...").await?;
```
- `ContractTestRunner` trait: deploy_contract, call_method, get_state, audit_with_ai
- WASM compilation/deployment traits
- AI audit hook: `ai_audit_contract`

## Developer Tools
- CLI examples for wallet, AI services, and contract harness (see developer-tools/CLI_EXAMPLES.md)

---

For detailed method signatures and usage, see INTERFACES.md in each module.
