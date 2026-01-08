# Dytallix Faucet Service - Production Architecture

## Overview
The Dytallix Faucet Service is a production-ready microservice that provides testnet token distribution for the Dytallix blockchain ecosystem.

## Architecture

```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐
│             │      │             │      │              │
│  PQC Wallet │─────▶│ Faucet API  │─────▶│  Blockchain  │
│  (Frontend) │      │   (3004)    │      │    (3003)    │
│             │      │             │      │              │
└─────────────┘      └─────────────┘      └──────────────┘
                            │
                            ▼
                     ┌─────────────┐
                     │ Rate Limiter│
                     │  (In-Memory)│
                     └─────────────┘
```

## Service Details

### Port
- **3004** - Faucet API HTTP endpoint

### Endpoints

#### POST /api/faucet/request
Request tokens from the faucet.

**Request:**
```json
{
  "address": "dyt1abc...",
  "dgt_amount": 100,
  "drt_amount": 1000
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Tokens sent successfully",
  "address": "dyt1abc...",
  "funded": {
    "dgt": 100,
    "drt": 1000
  },
  "balances": {
    "dgt": 100,
    "drt": 1000
  },
  "cooldown": {
    "duration": 60,
    "maxRequests": 3
  }
}
```

**Response (Rate Limited):**
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please wait 45 minutes",
  "timeUntilNext": 45,
  "requestCount": 3,
  "maxRequests": 3
}
```

#### GET /api/faucet/status
Get faucet configuration and status.

**Response:**
```json
{
  "status": "operational",
  "limits": {
    "dgt": 100,
    "drt": 1000,
    "cooldown": 60,
    "maxRequestsPerHour": 3
  },
  "blockchain": "http://localhost:3003",
  "activeUsers": 5
}
```

#### GET /api/faucet/check/:address
Check rate limit status for a specific address.

**Response:**
```json
{
  "address": "dyt1abc...",
  "canRequest": false,
  "timeUntilNext": 23,
  "requestCount": 3
}
```

#### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "faucet-api"
}
```

## Rate Limiting

### Configuration
- **Cooldown Window**: 1 hour
- **Max Requests**: 3 per hour per address
- **Storage**: In-memory (production should use Redis)

### How It Works
1. Each request is recorded with a timestamp
2. Old requests outside the cooldown window are automatically removed
3. If an address has made 3 requests in the last hour, further requests are blocked
4. The response includes time until next allowed request

## Integration

### From Wallet (Auto-funding)
When a wallet is created, it automatically calls:
```javascript
const response = await fetch('http://localhost:3004/api/faucet/request', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    address: walletAddress,
    dgt_amount: 100,
    drt_amount: 1000
  })
});
```

### From Faucet Web UI
The faucet page at `/build/faucet.html` should also use this API:
```javascript
const response = await fetch('http://localhost:3004/api/faucet/request', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    address: userAddress,
    dgt_amount: dgtAmount,
    drt_amount: drtAmount
  })
});
```

## Security Features

### 1. Address Validation
- Ensures addresses start with "dyt"
- Prevents invalid address formats

### 2. Amount Limits
- DGT max: 100 per request
- DRT max: 1000 per request
- Prevents abuse through excessive amounts

### 3. Rate Limiting
- 3 requests per hour per address
- 60-minute cooldown between request batches
- Tracks by wallet address

### 4. CORS Protection
- Enabled for cross-origin requests
- Configurable for production

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3004` | Port for faucet API |
| `BLOCKCHAIN_NODE` | `http://localhost:3003` | Blockchain node URL |

## Deployment

### Start Service
```bash
cd services/faucet-api
npm install
PORT=3004 BLOCKCHAIN_NODE=http://localhost:3003 node server.js
```

### Via Service Manager
```bash
./start-all-services.sh
```

## Production Considerations

### 1. Replace In-Memory Storage
Currently uses `Map()` for rate limiting. For production:
```javascript
// Use Redis
const redis = require('redis');
const client = redis.createClient();
```

### 2. Add Authentication
Consider adding API keys for programmatic access:
```javascript
app.use('/api/faucet', authenticateApiKey);
```

### 3. Add Monitoring
- Request metrics
- Error rates
- Funding success/failure rates
- Balance monitoring

### 4. Add Logging
```javascript
const winston = require('winston');
logger.info('Funding request', { address, amounts });
```

### 5. Database for Audit Trail
Track all requests for compliance:
```sql
CREATE TABLE faucet_requests (
  id SERIAL PRIMARY KEY,
  address VARCHAR(64),
  dgt_amount INT,
  drt_amount INT,
  success BOOLEAN,
  timestamp TIMESTAMP,
  ip_address VARCHAR(45)
);
```

## Testing

### Test Successful Request
```bash
curl -X POST http://localhost:3004/api/faucet/request \
  -H "Content-Type: application/json" \
  -d '{"address":"dyt1test123","dgt_amount":100,"drt_amount":1000}'
```

### Test Rate Limiting
```bash
# Make 4 requests quickly
for i in {1..4}; do
  curl -X POST http://localhost:3004/api/faucet/request \
    -H "Content-Type: application/json" \
    -d '{"address":"dyt1test123","dgt_amount":100,"drt_amount":1000}'
  echo ""
done
```

### Check Status
```bash
curl http://localhost:3004/api/faucet/status | jq
```

## Error Codes

| Code | Error | Description |
|------|-------|-------------|
| 400 | `INVALID_ADDRESS` | Address doesn't start with "dyt" |
| 400 | `INVALID_AMOUNT` | Must request at least one token |
| 400 | `AMOUNT_TOO_HIGH` | Exceeds maximum per request |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `FUNDING_FAILED` | Blockchain funding failed |
| 500 | `INTERNAL_ERROR` | Server error |

## Roadmap

### Phase 1 (Current)
- ✅ Basic faucet functionality
- ✅ Rate limiting (in-memory)
- ✅ Blockchain integration
- ✅ REST API

### Phase 2 (Next)
- [ ] Redis for distributed rate limiting
- [ ] Database audit trail
- [ ] Prometheus metrics
- [ ] Admin dashboard

### Phase 3 (Future)
- [ ] Captcha integration
- [ ] Social media verification
- [ ] Variable amounts based on use case
- [ ] Testnet token recycling

## Support

- **GitHub**: [Dytallix Repository](https://github.com/DytallixHQ/Dytallix)
- **Documentation**: `/build/docs.html`
- **Discord**: Community support channel

---

**Last Updated**: November 13, 2025
**Version**: 1.0.0
**Status**: Production Ready
