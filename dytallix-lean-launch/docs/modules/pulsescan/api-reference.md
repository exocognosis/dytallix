---
title: PulseScan API Reference
---

# PulseScan API Reference

RESTful API for accessing fraud detection findings and system statistics.

## Base URL

```
Production: https://api.dytallix.com/pulsescan/v1
Development: http://localhost:3001/api/v1
```

## Authentication

PulseScan API uses API key authentication for protected endpoints.

```http
X-API-Key: your-api-key-here
```

## Rate Limiting

- **Public endpoints**: 100 requests/minute
- **Authenticated endpoints**: 1000 requests/minute

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640995200
```

## Endpoints

### Findings

#### List Findings

```http
GET /findings
```

Query parameters:
- `limit` (integer, 1-1000): Number of results per page (default: 50)
- `offset` (integer): Pagination offset (default: 0)
- `severity` (string): Filter by severity (`low`, `medium`, `high`, `critical`)
- `status` (string): Filter by status (`pending`, `confirmed`, `false_positive`)
- `address` (string): Filter by specific address
- `since` (ISO date): Findings since this timestamp
- `score_min` (float 0-1): Minimum anomaly score
- `score_max` (float 0-1): Maximum anomaly score

**Response:**
```json
{
  "findings": [
    {
      "id": 12345,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "tx_hash": "a1b2c3d4e5f6...",
      "address": "dytallix1abcdef...",
      "score": 0.85,
      "severity": "high",
      "status": "pending",
      "reasons": [
        "high_velocity_pattern",
        "suspicious_amount_distribution"
      ],
      "block_height": 12345678,
      "timestamp_detected": 1640995200,
      "timestamp_created": "2023-01-01T12:00:00Z",
      "metadata": {
        "confidence": 0.92,
        "model_version": "1.0.0",
        "processing_time_ms": 45
      }
    }
  ],
  "total_count": 1,
  "pagination": {
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

#### Get Finding by ID

```http
GET /findings/{id}
```

**Response:**
```json
{
  "id": 12345,
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "tx_hash": "a1b2c3d4e5f6...",
  "address": "dytallix1abcdef...",
  "score": 0.85,
  "severity": "high",
  "status": "pending",
  "reasons": [
    "high_velocity_pattern",
    "suspicious_amount_distribution"
  ],
  "signature_pq": "a1b2c3d4...", 
  "block_height": 12345678,
  "timestamp_detected": 1640995200,
  "timestamp_created": "2023-01-01T12:00:00Z",
  "metadata": {
    "confidence": 0.92,
    "model_version": "1.0.0",
    "processing_time_ms": 45,
    "top_features": [
      {"name": "velocity_1h", "value": 0.92},
      {"name": "amount_z_score", "value": 2.1}
    ]
  }
}
```

#### Get Findings by Address

```http
GET /findings/address/{address}
```

Query parameters: Same as list findings

**Response:** Same as list findings

### Statistics

#### System Statistics

```http
GET /stats
```

**Response:**
```json
{
  "summary": {
    "total_findings": 15234,
    "findings_last_24h": 127,
    "findings_last_7d": 892,
    "average_score": 0.73,
    "unique_addresses": 8456
  },
  "by_severity": {
    "critical": 23,
    "high": 156,
    "medium": 734,
    "low": 2341
  },
  "by_status": {
    "pending": 234,
    "confirmed": 2890,
    "false_positive": 123,
    "under_investigation": 67
  },
  "trends": {
    "daily_findings": [
      {"date": "2023-01-01", "count": 45},
      {"date": "2023-01-02", "count": 52}
    ],
    "top_reasons": [
      {"reason": "high_velocity_pattern", "count": 567},
      {"reason": "suspicious_amount_distribution", "count": 423}
    ]
  },
  "model_performance": {
    "version": "1.0.0",
    "accuracy": 0.875,
    "precision": 0.823,
    "recall": 0.789,
    "f1_score": 0.806,
    "last_evaluation": "2023-01-01T00:00:00Z"
  }
}
```

#### Address Risk Profile

```http
GET /stats/address/{address}
```

**Response:**
```json
{
  "address": "dytallix1abcdef...",
  "risk_profile": {
    "risk_level": "medium",
    "risk_score": 0.65,
    "total_findings": 12,
    "high_risk_findings": 3,
    "average_score": 0.58
  },
  "activity": {
    "first_seen": "2022-06-01T10:30:00Z",
    "last_seen": "2023-01-01T15:45:00Z",
    "total_transactions": 1234,
    "total_volume": "12345.67"
  },
  "recent_findings": [
    {
      "id": 12345,
      "score": 0.85,
      "severity": "high",
      "timestamp": "2023-01-01T12:00:00Z"
    }
  ]
}
```

### Contract Integration

#### Contract Configuration

```http
GET /contract/config
```

**Response:**
```json
{
  "contract_address": "dytallix1contract...",
  "admin": "dytallix1admin...",
  "min_score": "0.70",
  "signer_pubkey_pq": "a1b2c3d4...",
  "total_findings": 15234,
  "network_id": "dytallix-testnet"
}
```

#### Contract Findings

```http
GET /contract/findings
```

Query parameters:
- `start_after` (integer): Finding ID to start after
- `limit` (integer, 1-100): Number of results (default: 50)

**Response:**
```json
{
  "findings": [
    {
      "id": 12345,
      "tx_hash": "a1b2c3d4e5f6...",
      "addr": "dytallix1abcdef...",
      "score": "0.8500",
      "reasons": [
        "high_velocity_pattern",
        "suspicious_amount_distribution"
      ],
      "signature_pq": "a1b2c3d4...",
      "timestamp": 1640995200,
      "metadata": "{\"confidence\":0.92}",
      "block_height": 12345678
    }
  ],
  "total_count": 1
}
```

### Health & Monitoring

#### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-01-01T12:00:00Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "blockchain": "healthy"
  },
  "metrics": {
    "uptime_seconds": 86400,
    "memory_usage_mb": 256,
    "cpu_usage_percent": 15.4
  }
}
```

#### Metrics (Prometheus Format)

```http
GET /metrics
```

## Error Responses

### Standard Error Format

```json
{
  "error": {
    "message": "Resource not found",
    "statusCode": 404,
    "timestamp": "2023-01-01T12:00:00Z",
    "path": "/api/v1/findings/999999"
  }
}
```

### Common Error Codes

- `400 Bad Request` - Invalid parameters or malformed request
- `401 Unauthorized` - Missing or invalid API key
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## SDK Examples

### JavaScript/TypeScript

```typescript
import { PulseScanAPI } from '@dytallix/pulsescan-sdk';

const api = new PulseScanAPI({
  baseUrl: 'https://api.dytallix.com/pulsescan/v1',
  apiKey: 'your-api-key'
});

// Get recent high-severity findings
const findings = await api.findings.list({
  severity: 'high',
  limit: 10
});

// Get address risk profile
const profile = await api.stats.addressProfile('dytallix1abc...');
```

### Python

```python
from dytallix.pulsescan import PulseScanClient

client = PulseScanClient(
    base_url='https://api.dytallix.com/pulsescan/v1',
    api_key='your-api-key'
)

# Get findings
findings = client.findings.list(severity='high', limit=10)

# Get stats
stats = client.stats.summary()
```

### Rust

```rust
use dytallix_pulsescan_sdk::PulseScanClient;

let client = PulseScanClient::new(
    "https://api.dytallix.com/pulsescan/v1",
    "your-api-key"
)?;

// Get findings
let findings = client.findings().list()
    .severity("high")
    .limit(10)
    .execute()
    .await?;
```

## Webhooks

Configure webhooks to receive real-time notifications for new findings.

### Webhook Configuration

```http
POST /admin/webhooks
```

```json
{
  "url": "https://your-service.com/webhooks/pulsescan",
  "events": ["finding.created", "finding.updated"],
  "filters": {
    "severity": ["high", "critical"],
    "score_min": 0.8
  },
  "headers": {
    "Authorization": "Bearer your-token"
  }
}
```

### Webhook Payload

```json
{
  "event": "finding.created",
  "timestamp": "2023-01-01T12:00:00Z",
  "data": {
    "id": 12345,
    "tx_hash": "a1b2c3d4e5f6...",
    "address": "dytallix1abcdef...",
    "score": 0.85,
    "severity": "high",
    "reasons": ["high_velocity_pattern"]
  }
}
```