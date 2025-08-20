# Faucet Configuration and Rate Limiting

## Overview

The Dytallix faucet implements a hardened rate limiting system with Redis backend support, Prometheus metrics, and token-specific cooldown periods.

## Environment Variables

### Required Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `FAUCET_MNEMONIC` | Mnemonic phrase for faucet wallet | `"word1 word2 ..."` | Yes (Production) |
| `NODE_ENV` | Environment mode | `development` / `production` | No |

### Rate Limiting

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `DLX_RATE_LIMIT_REDIS_URL` | Redis connection URL | (none) | Optional, falls back to in-memory |

### Token Cooldown Periods

Hardcoded token-specific cooldown periods:
- **DGT**: 24 hours (governance token)
- **DRT**: 6 hours (reward token)

## Redis Configuration

### Setup Instructions

1. **Install Redis**:
   ```bash
   # Ubuntu/Debian
   sudo apt install redis-server
   
   # macOS
   brew install redis
   
   # Docker
   docker run -d -p 6379:6379 redis:alpine
   ```

2. **Configure Environment**:
   ```bash
   # Local Redis
   DLX_RATE_LIMIT_REDIS_URL=redis://localhost:6379
   
   # Redis with authentication
   DLX_RATE_LIMIT_REDIS_URL=redis://username:password@host:port
   
   # Redis Cluster or external service
   DLX_RATE_LIMIT_REDIS_URL=redis://your-redis-host:6379
   ```

3. **Verify Connection**:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

### Fallback Behavior

- If Redis is not available or fails to connect, the system automatically falls back to in-memory rate limiting
- Fallback is transparent and logged
- In-memory limits do not persist across server restarts

## Prometheus Metrics

The faucet exposes the following metrics at `/metrics`:

### Faucet-Specific Metrics

- `rate_limit_hits_total{token}` - Counter of rate limit violations (429 responses)
- `faucet_requests_total{token,outcome}` - Counter of all faucet requests
  - `outcome`: `allow` | `denied`
  - `token`: `DGT` | `DRT`

### Default Node.js Metrics

Standard Node.js runtime metrics are also collected automatically.

## Production Deployment

### Security Requirements

1. **Environment Validation**: Server refuses to start in production if required secrets are missing or contain placeholder values
2. **Secret Management**: Never commit mnemonics or private keys to version control
3. **Redis Security**: Use authentication and TLS for Redis in production

### Example Production Configuration

```bash
NODE_ENV=production
FAUCET_MNEMONIC="actual production mnemonic phrase here"
DLX_RATE_LIMIT_REDIS_URL=redis://username:password@redis.example.com:6380
```

### Health Checks

- `/health` - Basic health check
- `/api/status` - Detailed status including Redis connectivity
- `/metrics` - Prometheus metrics

## Rate Limiting Logic

### Per-Token Limits

Each token type has independent rate limits:
- **DGT**: Maximum 1 request per 24 hours per IP/address combination
- **DRT**: Maximum 1 request per 6 hours per IP/address combination

### Dual Validation

Rate limits are enforced on both:
1. **IP Address** - Prevents abuse from single source
2. **Wallet Address** - Prevents abuse with multiple IPs

### Key Format

Redis keys follow the pattern:
- Address-based: `faucet:{ip}:{address}:{token}`
- IP-based: `faucet:ip:{ip}:{token}`

## Testing

### Rate Limit Testing

```bash
# Test DGT request
curl -X POST http://localhost:8787/api/faucet \
  -H "Content-Type: application/json" \
  -d '{"address":"dytallix1test...", "tokens":["DGT"]}'

# Test rate limit (should return 429)
curl -X POST http://localhost:8787/api/faucet \
  -H "Content-Type: application/json" \
  -d '{"address":"dytallix1test...", "tokens":["DGT"]}'
```

### Metrics Testing

```bash
# Check metrics
curl http://localhost:8787/metrics | grep faucet

# Expected output includes:
# rate_limit_hits_total{token="DGT"} 1
# faucet_requests_total{token="DGT",outcome="allow"} 1
# faucet_requests_total{token="DGT",outcome="denied"} 1
```

## Troubleshooting

### Redis Connection Issues

1. **Check Redis Status**:
   ```bash
   redis-cli ping
   ```

2. **Check Logs**:
   ```bash
   # Look for Redis connection errors
   grep -i redis application.log
   ```

3. **Verify Configuration**:
   ```bash
   echo $DLX_RATE_LIMIT_REDIS_URL
   ```

### Rate Limit Issues

1. **Clear Specific Rate Limit**:
   ```bash
   redis-cli del "faucet:192.168.1.1:dytallix1test...:DGT"
   ```

2. **View Current Keys**:
   ```bash
   redis-cli keys "faucet:*"
   ```

3. **Check TTL**:
   ```bash
   redis-cli ttl "faucet:192.168.1.1:dytallix1test...:DGT"
   ```