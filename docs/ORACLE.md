# Dytallix Oracle System Documentation

## Overview

The Dytallix Oracle system provides a secure, scalable ingestion pipeline for external AI risk scores associated with on-chain transactions. The system allows AI models to submit risk assessments that are persisted in node state and exposed via RPC for UI integration.

## Architecture

### Core Components

1. **Runtime Oracle Module** - Rust-based deterministic risk score storage
2. **REST API** - TypeScript HTTP endpoints for score submission with HMAC authentication
3. **WebSocket Events** - Real-time oracle update notifications
4. **Metrics Integration** - Prometheus metrics for monitoring oracle operations
5. **Signature Verification** - Optional Ed25519 cryptographic validation

### Data Model

```rust
pub struct AiRiskRecord {
    pub tx_hash: String,        // Transaction hash (hex format)
    pub score_str: String,      // Original score string (deterministic)
    pub model_id: String,       // AI model identifier 
    pub ingested_at: u64,       // Unix timestamp
    pub source: String,         // Oracle source identifier
}
```

**Deterministic Design**: Original score strings are preserved exactly as submitted to avoid floating-point consensus issues.

## API Endpoints

### Authentication

All Oracle submission endpoints require HMAC-SHA256 authentication using the `X-Oracle-Signature` header:

```
X-Oracle-Signature: <hex-encoded-hmac-sha256-signature>
```

The signature is computed over the raw request body using the shared secret from `DLX_ORACLE_INGEST_SECRET`.

Optional source identification via:
```
X-Oracle-Source: <oracle-identifier>
```

### Single Risk Score Submission

**POST** `/api/oracle/submit`

Submit a single AI risk assessment for a transaction.

**Request Body:**
```json
{
  "tx_hash": "0x1234567890abcdef...",
  "score": "0.75",
  "model_id": "risk-v1",
  "signature": "base64-encoded-ed25519-signature"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Oracle risk submitted successfully",
  "data": {
    "tx_hash": "0x1234567890abcdef...",
    "processed": 1
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Submission failed",
  "code": "SUBMISSION_FAILED",
  "details": ["Score must be between 0.0 and 1.0"]
}
```

### Batch Risk Score Submission

**POST** `/api/oracle/submit_batch`

Submit multiple AI risk assessments in a single request (max 100).

**Request Body:**
```json
{
  "submissions": [
    {
      "tx_hash": "0x1234567890abcdef...",
      "score": "0.75",
      "model_id": "risk-v1"
    },
    {
      "tx_hash": "0xabcdef1234567890...",
      "score": "0.25",
      "model_id": "risk-v1"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Batch processed: 2 succeeded, 0 failed",
  "data": {
    "processed": 2,
    "failed": 0,
    "total": 2,
    "errors": []
  }
}
```

### Risk Score Lookup

**GET** `/api/oracle/risk/:txHash`

Retrieve Oracle risk assessment for a specific transaction.

**Response:**
```json
{
  "success": true,
  "data": {
    "tx_hash": "0x1234567890abcdef...",
    "score": "0.75",
    "model_id": "risk-v1",
    "ingested_at": 1640995200,
    "source": "oracle-1"
  }
}
```

### Transaction Query with Risk Scores

**GET** `/api/transactions/:hash`

Enhanced transaction endpoint that includes Oracle risk data when available.

**Response:**
```json
{
  "hash": "0x1234567890abcdef...",
  "status": "confirmed",
  "block_height": 12345,
  "ai_risk_score": "0.75",
  "model_id": "risk-v1",
  "ai_risk_ingested_at": 1640995200
}
```

Fields are nullable if no Oracle assessment exists.

### Health Check

**GET** `/api/oracle/health`

Oracle service health and configuration status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-12-01T12:00:00.000Z",
  "websocket": {
    "connected_clients": 5,
    "total_events": 150
  },
  "config": {
    "auth_enabled": true,
    "model_id": "risk-v1",
    "environment": "production"
  }
}
```

## WebSocket Events

### Real-time Oracle Updates

Connect to WebSocket endpoint `/ws` to receive real-time oracle updates.

**Event: oracle_risk_updated**
```json
{
  "type": "oracle_risk_updated",
  "data": {
    "type": "oracle_risk_updated",
    "txHash": "0x1234567890abcdef...",
    "score": "0.75",
    "modelId": "risk-v1",
    "timestamp": "2023-12-01T12:00:00.000Z"
  },
  "timestamp": "2023-12-01T12:00:00.000Z"
}
```

### Client Messages

**Ping/Pong:**
```json
// Send
{ "type": "ping" }

// Receive
{
  "type": "pong",
  "data": { "timestamp": "2023-12-01T12:00:00.000Z" },
  "timestamp": "2023-12-01T12:00:00.000Z"
}
```

## Environment Configuration

### Required Variables

- **`DLX_ORACLE_INGEST_SECRET`** - HMAC secret for API authentication (required in production, min 32 chars)

### Optional Variables

- **`DLX_ORACLE_MODEL_ID`** - Default model identifier (default: "risk-v1")
- **`NODE_ENV`** - Environment mode (development/production)

### Configuration Validation

```bash
# Validate configuration on startup
curl http://localhost:3000/api/oracle/health
```

## Metrics

### Prometheus Metrics

The Oracle system exposes the following metrics:

**oracle_submit_total{status}** - Counter
- Total oracle submissions
- Labels: `status="ok"` or `status="error"`

**oracle_latency_seconds** - Histogram  
- Oracle ingest to persistence latency
- Buckets: [0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0]

Access metrics at `/metrics` endpoint.

### Sample Metrics Output

```
# HELP oracle_submit_total Total oracle submissions
# TYPE oracle_submit_total counter
oracle_submit_total{status="ok"} 1250
oracle_submit_total{status="error"} 15

# HELP oracle_latency_seconds Oracle ingest to persistence latency in seconds
# TYPE oracle_latency_seconds histogram
oracle_latency_seconds_bucket{le="0.05"} 800
oracle_latency_seconds_bucket{le="0.1"} 1200
oracle_latency_seconds_bucket{le="0.25"} 1250
oracle_latency_seconds_bucket{le="0.5"} 1265
oracle_latency_seconds_bucket{le="1"} 1265
oracle_latency_seconds_bucket{le="2"} 1265
oracle_latency_seconds_bucket{le="5"} 1265
oracle_latency_seconds_bucket{le="+Inf"} 1265
oracle_latency_seconds_sum 45.67
oracle_latency_seconds_count 1265
```

## Integration Examples

### JavaScript/TypeScript Client

```typescript
import crypto from 'crypto';

class OracleClient {
  constructor(
    private baseUrl: string,
    private secret: string
  ) {}

  private createSignature(body: string): string {
    return crypto
      .createHmac('sha256', this.secret)
      .update(body)
      .digest('hex');
  }

  async submitRisk(txHash: string, score: string, modelId: string) {
    const body = JSON.stringify({
      tx_hash: txHash,
      score: score,
      model_id: modelId
    });

    const signature = this.createSignature(body);

    const response = await fetch(`${this.baseUrl}/api/oracle/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Oracle-Signature': signature,
        'X-Oracle-Source': 'my-oracle-client'
      },
      body: body
    });

    return await response.json();
  }

  async submitBatch(submissions: Array<{txHash: string, score: string, modelId: string}>) {
    const body = JSON.stringify({
      submissions: submissions.map(s => ({
        tx_hash: s.txHash,
        score: s.score,
        model_id: s.modelId
      }))
    });

    const signature = this.createSignature(body);

    const response = await fetch(`${this.baseUrl}/api/oracle/submit_batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Oracle-Signature': signature
      },
      body: body
    });

    return await response.json();
  }
}

// Usage
const client = new OracleClient(
  'http://localhost:3000',
  process.env.DLX_ORACLE_INGEST_SECRET!
);

await client.submitRisk(
  '0x1234567890abcdef1234567890abcdef12345678',
  '0.75',
  'risk-v1'
);
```

### Python Client

```python
import hmac
import hashlib
import json
import requests

class OracleClient:
    def __init__(self, base_url: str, secret: str):
        self.base_url = base_url
        self.secret = secret.encode()
    
    def _create_signature(self, body: str) -> str:
        return hmac.new(
            self.secret,
            body.encode(),
            hashlib.sha256
        ).hexdigest()
    
    def submit_risk(self, tx_hash: str, score: str, model_id: str):
        body = json.dumps({
            "tx_hash": tx_hash,
            "score": score,
            "model_id": model_id
        })
        
        signature = self._create_signature(body)
        
        response = requests.post(
            f"{self.base_url}/api/oracle/submit",
            headers={
                "Content-Type": "application/json",
                "X-Oracle-Signature": signature,
                "X-Oracle-Source": "python-client"
            },
            data=body
        )
        
        return response.json()

# Usage
client = OracleClient(
    "http://localhost:3000",
    os.environ["DLX_ORACLE_INGEST_SECRET"]
)

result = client.submit_risk(
    "0x1234567890abcdef1234567890abcdef12345678",
    "0.75",
    "risk-v1"
)
```

### Curl Examples

```bash
# Create HMAC signature (requires OpenSSL)
SECRET="your-secret-key"
PAYLOAD='{"tx_hash":"0x123...","score":"0.75","model_id":"risk-v1"}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" -hex | cut -d' ' -f2)

# Submit single risk
curl -X POST http://localhost:3000/api/oracle/submit \
  -H "Content-Type: application/json" \
  -H "X-Oracle-Signature: $SIGNATURE" \
  -H "X-Oracle-Source: curl-client" \
  -d "$PAYLOAD"

# Submit batch
BATCH_PAYLOAD='{"submissions":[{"tx_hash":"0x123...","score":"0.75","model_id":"risk-v1"}]}'
BATCH_SIGNATURE=$(echo -n "$BATCH_PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" -hex | cut -d' ' -f2)

curl -X POST http://localhost:3000/api/oracle/submit_batch \
  -H "Content-Type: application/json" \
  -H "X-Oracle-Signature: $BATCH_SIGNATURE" \
  -d "$BATCH_PAYLOAD"

# Get risk assessment
curl http://localhost:3000/api/oracle/risk/0x1234567890abcdef1234567890abcdef12345678
```

## Performance Considerations

### Throughput

- Single submissions: ~1000 req/sec
- Batch submissions: Up to 100 records per batch
- WebSocket events: Real-time with <100ms latency

### Storage

- Each risk record: ~200-500 bytes
- Deterministic string storage prevents consensus issues
- Indexed by transaction hash for O(1) lookup

### Caching

- Risk scores cached in memory for fast retrieval
- Transaction endpoints include risk data without additional DB lookups
- WebSocket events for real-time cache invalidation

## Security Considerations

### HMAC Authentication

- HMAC-SHA256 with timing-safe comparison
- Minimum 32-character secrets in production
- Raw body signature prevents tampering

### Input Validation

- Transaction hash format validation
- Score range validation (0.0 to 1.0)
- Model ID character restrictions
- Rate limiting and size limits

### Error Handling

- No sensitive data in error responses
- Detailed logging for security monitoring
- Graceful degradation when services unavailable

## Error Codes

| Code | Description |
|------|-------------|
| `AUTH_REQUIRED` | Oracle authentication required |
| `AUTH_CONFIG_MISSING` | Authentication not configured |
| `MISSING_SIGNATURE` | X-Oracle-Signature header missing |
| `INVALID_SIGNATURE_FORMAT` | Signature format invalid |
| `SIGNATURE_MISMATCH` | HMAC signature verification failed |
| `NO_RAW_BODY` | Raw body not available for verification |
| `MISSING_FIELDS` | Required fields missing from request |
| `INVALID_BATCH` | Batch format invalid |
| `BATCH_TOO_LARGE` | Batch exceeds size limit |
| `SUBMISSION_FAILED` | Risk submission validation failed |
| `INVALID_TX_HASH` | Transaction hash format invalid |
| `RISK_NOT_FOUND` | Oracle assessment not found |
| `INTERNAL_ERROR` | Internal server error |

## Troubleshooting

### Common Issues

**Authentication Failures:**
- Verify `DLX_ORACLE_INGEST_SECRET` is set correctly
- Ensure HMAC signature computed over raw body
- Check signature is 64-character hex string

**Submission Errors:**
- Validate transaction hash starts with '0x'
- Ensure score is valid decimal between 0.0 and 1.0
- Check model ID contains only alphanumeric, underscore, hyphen

**Connection Issues:**
- Verify Oracle service is running and healthy
- Check WebSocket connection at `/ws` endpoint
- Monitor metrics for service availability

### Debug Commands

```bash
# Check Oracle service health
curl http://localhost:3000/api/oracle/health

# View metrics
curl http://localhost:3000/metrics | grep oracle

# Test WebSocket connection
wscat -c ws://localhost:3000/ws

# Validate environment
node -e "console.log(require('./src/middleware/oracleAuth').validateOracleConfig())"
```