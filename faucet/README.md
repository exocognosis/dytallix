# Dytallix Testnet Faucet

A secure API service for distributing test tokens on the Dytallix testnet.

## Features

- **Rate Limited**: IP-based rate limiting with configurable cooldowns
- **Security Focused**: Anti-spam measures, input validation, and security headers
- **Monitoring**: Comprehensive logging and health check endpoints
- **Production Ready**: Docker support, error handling, and configuration management

## Quick Start

### Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

### Production with Docker

1. **Build and run:**
   ```bash
   docker build -t dytallix-faucet .
   docker run -p 3001:3001 --env-file .env dytallix-faucet
   ```

## API Endpoints

### POST /api/faucet
Request test tokens for a Dytallix address.

**Request:**
```json
{
  "address": "dyt1example_address_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tokens sent successfully",
  "txHash": "ABC123...",
  "amount": "1000000udyt",
  "recipient": "dyt1example_address_here",
  "timestamp": "2025-08-01T00:00:00.000Z"
}
```

### GET /api/status
Get faucet operational status and network information.

**Response:**
```json
{
  "status": "operational",
  "faucetBalance": "1000000000udyt",
  "faucetAddress": "dyt1faucet_address",
  "chainId": "dytallix-testnet-1",
  "network": {
    "connected": true,
    "blockHeight": "12345"
  },
  "tokensPerRequest": "1000000udyt"
}
```

### GET /api/balance/:address
Check balance for a specific address.

**Response:**
```json
{
  "address": "dyt1example_address",
  "balance": "5000000",
  "denom": "udyt",
  "timestamp": "2025-08-01T00:00:00.000Z"
}
```

### GET /health
Health check endpoint for monitoring.

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `NODE_ENV` | development | Environment mode |
| `CHAIN_ID` | dytallix-testnet-1 | Blockchain chain ID |
| `RPC_ENDPOINT` | http://127.0.0.1:26657 | RPC endpoint URL |
| `FAUCET_AMOUNT` | 1000000udyt | Tokens per request |
| `RATE_LIMIT_WINDOW_MS` | 3600000 | Rate limit window (1 hour) |
| `RATE_LIMIT_MAX_REQUESTS` | 5 | Max requests per window |
| `IP_COOLDOWN_MS` | 1800000 | IP cooldown period (30 min) |

### Security Features

- **Rate Limiting**: 5 requests per hour per IP
- **IP Cooldown**: 30-minute cooldown between requests
- **Input Validation**: Address format validation
- **Anti-Bot Protection**: User-Agent validation
- **Security Headers**: Helmet.js security middleware
- **Balance Checks**: Prevents funding already wealthy addresses

## Development

### Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run lint` - Run ESLint

### Testing

```bash
# Test faucet endpoint
curl -X POST http://localhost:3001/api/faucet \
  -H "Content-Type: application/json" \
  -d '{"address":"dyt1example_address_here"}'

# Check status
curl http://localhost:3001/api/status

# Health check
curl http://localhost:3001/health
```

## Deployment

### Docker Compose

```yaml
version: '3.8'
services:
  faucet:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - RPC_ENDPOINT=http://dytallix-node:26657
    restart: unless-stopped
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dytallix-faucet
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dytallix-faucet
  template:
    metadata:
      labels:
        app: dytallix-faucet
    spec:
      containers:
      - name: faucet
        image: dytallix-faucet:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
```

## Security Considerations

- In production, use a proper database (Redis) for rate limiting storage
- Implement proper private key management (hardware security modules)
- Add CAPTCHA for additional bot protection
- Monitor for abuse patterns and implement IP banning
- Use HTTPS in production environments
- Regularly rotate faucet private keys

## License

MIT License - see LICENSE file for details.