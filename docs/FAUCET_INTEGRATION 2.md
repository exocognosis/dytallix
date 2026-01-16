# Dytallix Faucet Integration Documentation

## Overview

The Dytallix faucet service provides a secure, rate-limited API for dispensing testnet tokens (DGT and DRT) with comprehensive on-chain integration, abuse prevention, and monitoring capabilities.

## Features Implemented

### ✅ Backend Integration
- **On-chain transfers**: Direct integration with Cosmos blockchain via `@cosmjs/stargate`
- **Transaction signing**: Secure mnemonic-based transaction signing
- **Gas management**: Automatic gas estimation and fee handling
- **Retry logic**: Automatic retry on RPC failures with exponential backoff

### ✅ Rate Limiting & Security
- **Dual rate limiting**: Per-IP and per-address rate limiting
- **Token-specific cooldowns**:
  - DGT: 24-hour cooldown period
  - DRT: 6-hour cooldown period
- **Redis support**: Production-ready persistent rate limiting with Redis backend
- **In-memory fallback**: Graceful degradation when Redis unavailable

### ✅ Enhanced Abuse Logging
- **Structured logging**: JSON-formatted logs with request correlation IDs
- **Security context**: IP tracking, user agent logging, request timing
- **Error categorization**: Detailed error codes for different failure types
- **Performance metrics**: Request duration and success/failure tracking

### ✅ Monitoring & Metrics
- **Prometheus metrics**: 
  - `faucet_requests_total{token,outcome}` - Total faucet requests
  - `rate_limit_hits_total{token}` - Rate limit violations
- **Health endpoints**: Status and balance checking
- **Request correlation**: Unique request IDs for log correlation

## Configuration

### Environment Variables

#### Required Configuration
```bash
# Blockchain Connection
RPC_HTTP_URL=http://localhost:26657          # Cosmos RPC endpoint
CHAIN_ID=dytallix-testnet-1                  # Chain identifier
FAUCET_MNEMONIC="your twelve word mnemonic..." # Signing mnemonic (NEVER commit real ones!)

# Server Configuration
PORT=8787                                     # Server port
NODE_ENV=production                          # Environment mode
```

#### Token Amounts (Configurable per Network)
```bash
# DGT (Governance Token) - amounts in base unit
FAUCET_MAX_PER_REQUEST_DGT=2                 # 2 DGT per request

# DRT (Reward Token) - amounts in base unit  
FAUCET_MAX_PER_REQUEST_DRT=50                # 50 DRT per request

# Gas Configuration
FAUCET_GAS_PRICE=0.025uDRT                   # Gas price for transactions
```

#### Rate Limiting Configuration
```bash
# Cooldown Periods (configurable per network)
FAUCET_COOLDOWN_MINUTES=60                   # Default cooldown (overridden by token-specific)

# Redis Support (Optional - falls back to in-memory)
DLX_RATE_LIMIT_REDIS_URL=redis://localhost:6379

# Network-specific Limits
CHAIN_PREFIX=dytallix                        # Address prefix validation
ENFORCE_PREFIX=1                             # Strict prefix checking
```

#### Security & Monitoring
```bash
# Security Headers
ENABLE_SEC_HEADERS=1                         # Enable security middleware
ENABLE_CSP=1                                 # Content Security Policy

# CORS Configuration
ALLOWED_ORIGIN=http://localhost:5173         # Frontend origin

# Metrics
ENABLE_METRICS=true                          # Enable Prometheus metrics
METRICS_PORT=9101                           # Metrics server port
```

## API Endpoints

### POST /api/faucet
Dispense tokens to a Dytallix address.

**Request Body:**
```json
{
  "address": "dytallix1...",
  "tokens": ["DGT", "DRT"]
}
```

**Successful Response:**
```json
{
  "success": true,
  "dispensed": [
    {
      "symbol": "DGT",
      "amount": "2",
      "txHash": "0x..."
    },
    {
      "symbol": "DRT", 
      "amount": "50",
      "txHash": "0x..."
    }
  ],
  "message": "Successfully dispensed DGT + DRT tokens",
  "requestId": "faucet-1726784123456-abc123"
}
```

**Rate Limited Response (429):**
```json
{
  "success": false,
  "error": "RATE_LIMIT",
  "message": "Rate limit exceeded for address. Try again in 3600 seconds.",
  "retryAfterSeconds": 3600,
  "requestId": "faucet-1726784123456-def456"
}
```

### GET /api/status
Get faucet operational status.

**Response:**
```json
{
  "ok": true,
  "network": "dytallix-testnet-1",
  "redis": true,
  "rateLimit": {
    "dgtWindowHours": 24,
    "drtWindowHours": 6,
    "maxRequests": 1
  },
  "uptime": 3600,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET /metrics
Prometheus metrics endpoint.

**Response:**
```
# HELP faucet_requests_total Total number of faucet requests
# TYPE faucet_requests_total counter
faucet_requests_total{token="DGT",outcome="allow"} 42
faucet_requests_total{token="DGT",outcome="denied"} 7
faucet_requests_total{token="DRT",outcome="allow"} 38
faucet_requests_total{token="DRT",outcome="denied"} 12

# HELP rate_limit_hits_total Total number of rate limit hits
# TYPE rate_limit_hits_total counter
rate_limit_hits_total{token="DGT"} 7
rate_limit_hits_total{token="DRT"} 12
```

## Security Features

### Rate Limiting Strategy
- **Dual validation**: Both IP and address must pass rate limit checks
- **Token isolation**: Each token has independent rate limits
- **Persistent storage**: Redis-backed rate limiting for production
- **Fast-path blocking**: In-memory recent grants tracking for test determinism

### Abuse Prevention
- **Request validation**: Strict address format and token type validation
- **User agent tracking**: Log and monitor for automated abuse patterns
- **Performance monitoring**: Track request timing to detect automated patterns
- **Structured logging**: Full request context for abuse investigation

### Transaction Security
- **Automatic gas estimation**: Prevents gas-related transaction failures
- **Retry mechanisms**: Handles temporary RPC failures gracefully
- **Memo inclusion**: All faucet transactions include identifiable memos
- **Error isolation**: Partial success handling (if one token fails, others proceed)

## Testing & Evidence

### Test Coverage
- Unit tests for rate limiting logic
- Integration tests for full API endpoints
- Evidence files for demonstration and validation
- Performance and security testing

### Launch Evidence Files
```
launch-evidence/faucet/
├── request1.json          # Example request payload
├── response1.json         # Example successful response
└── balances_after.json    # Balance verification after faucet
```

### Demo Script
```bash
# Run the integration demonstration
cd dytallix-lean-launch
./scripts/demo_faucet_integration.sh
```

## Deployment

### Development
```bash
cd dytallix-lean-launch
npm install
cp .env.example .env
# Edit .env with your configuration
npm run server
```

### Production with Docker
```bash
docker build -t dytallix-faucet .
docker run -p 8787:8787 --env-file .env dytallix-faucet
```

### Production with Redis
```bash
# Start Redis
docker run -d --name redis -p 6379:6379 redis:alpine

# Set Redis URL in environment
export DLX_RATE_LIMIT_REDIS_URL=redis://localhost:6379

# Start faucet
npm run server
```

## Monitoring & Operations

### Health Checks
- **GET /api/status**: Operational status and configuration
- **GET /health**: Simple health check for load balancers
- **GET /metrics**: Prometheus metrics for monitoring

### Log Analysis
```bash
# Filter faucet requests
grep "Faucet request" application.log | jq .

# Monitor rate limits
grep "Rate limit exceeded" application.log | jq .

# Track performance
grep "Faucet request completed" application.log | jq .duration
```

### Metrics Dashboard
Key metrics to monitor:
- Request success rate (`faucet_requests_total{outcome="allow"}`)
- Rate limit hit rate (`rate_limit_hits_total`)
- Request latency (from logs)
- Redis connectivity status

## Troubleshooting

### Common Issues

1. **RPC Connection Failures**
   ```bash
   # Check RPC endpoint
   curl $RPC_HTTP_URL/status
   
   # Verify chain ID
   curl $RPC_HTTP_URL/status | jq .result.node_info.network
   ```

2. **Rate Limiting Issues**
   ```bash
   # Check Redis connection
   redis-cli ping
   
   # View current rate limit keys
   redis-cli keys "faucet:*"
   
   # Clear specific rate limit
   redis-cli del "faucet:192.168.1.1:dytallix1...:DGT"
   ```

3. **Transaction Failures**
   ```bash
   # Check faucet balance
   curl $RPC_HTTP_URL/bank/balances/$FAUCET_ADDRESS
   
   # Verify gas prices
   curl $RPC_HTTP_URL/txs?message.action=send&limit=1
   ```

## Security Considerations

- **Never commit real mnemonics** to version control
- **Use hardware security modules** for production key management
- **Implement IP allowlisting** for additional protection
- **Monitor for abuse patterns** and implement dynamic blocking
- **Regular key rotation** for faucet signing keys
- **Rate limit adjustments** based on network conditions and abuse patterns

## Explorer Integration

The faucet is fully integrated with blockchain explorers:
- Transaction hashes are immediately available for lookup
- Memos identify faucet transactions clearly
- Balance changes are reflected in real-time
- All transactions follow standard Cosmos transaction format

## Compliance & Auditing

All faucet operations are comprehensively logged for:
- Regulatory compliance requirements
- Security incident investigation
- Performance analysis and optimization
- Abuse pattern detection and prevention