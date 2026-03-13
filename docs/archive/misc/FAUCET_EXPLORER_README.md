# Dytallix Testnet - Faucet & Explorer Infrastructure

This repository contains the complete infrastructure for the Dytallix testnet, including a secure faucet API and a comprehensive block explorer.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose (optional)
- Dytallix testnet node running on `127.0.0.1:26657`

### Development Setup

1. **Clone and setup faucet:**
   ```bash
   cd faucet
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

2. **Setup explorer:**
   ```bash
   cd explorer
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

### Production Deployment with Docker

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📊 Services Overview

### Faucet API (Port 3001)
- **Endpoint**: `http://localhost:3001`
- **Features**:
  - Secure token distribution with rate limiting
  - IP-based cooldowns (30 minutes)
  - Request validation and anti-spam protection
  - Comprehensive logging and monitoring
  - Health checks and status endpoints

### Block Explorer (Port 3002)
- **Endpoint**: `http://localhost:3002`
- **Features**:
  - Real-time block and transaction viewing
  - Address lookup and transaction history
  - Validator information display
  - Search functionality (blocks, transactions, addresses)
  - Responsive web interface with auto-refresh

### Reverse Proxy (Port 80)
- **Nginx configuration** for production load balancing
- **Security headers** and CORS handling
- **Health check endpoints** for monitoring

## 🔧 API Documentation

### Faucet API Endpoints

#### POST `/api/faucet`
Request test tokens for an address.

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

#### GET `/api/status`
Get faucet operational status.

#### GET `/api/balance/:address`
Check balance for a specific address.

#### GET `/health`
Health check endpoint.

### Explorer API Endpoints

#### GET `/api/blocks`
Get recent blocks (limit: 20).

#### GET `/api/blocks/:height`
Get specific block by height.

#### GET `/api/transactions`
Get recent transactions.

#### GET `/api/transactions/:hash`
Get specific transaction by hash.

#### GET `/api/addresses/:address`
Get address information and balance.

#### GET `/api/validators`
Get active validators list.

#### GET `/api/search/:query`
Search for blocks, transactions, or addresses.

## 🛡️ Security Features

### Faucet Security
- **Rate Limiting**: 5 requests per hour per IP
- **IP Cooldown**: 30-minute cooldown between requests
- **Input Validation**: Address format validation
- **Anti-Bot Protection**: User-Agent validation
- **Balance Checks**: Prevents funding wealthy addresses
- **Security Headers**: Helmet.js protection

### Explorer Security
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Content Security Policy**: Prevents XSS attacks
- **CORS Configuration**: Controlled cross-origin access
- **Input Sanitization**: Query parameter validation

## 📈 Monitoring & Health Checks

### Health Check Endpoints
- Faucet: `http://localhost:3001/health`
- Explorer: `http://localhost:3002/health`
- Proxy: `http://localhost/health`

### Logging
- **Winston logging** with configurable levels
- **Request/response logging** for debugging
- **Error tracking** with stack traces
- **Security event logging** for rate limit violations

### Metrics Collection
```bash
# Check faucet status
curl http://localhost:3001/api/status

# Check explorer network status
curl http://localhost:3002/api/status

# Check service health
curl http://localhost:3001/health
curl http://localhost:3002/health
```

## 🚦 Testing

### Manual Testing

1. **Test Faucet:**
   ```bash
   # Request tokens
   curl -X POST http://localhost:3001/api/faucet \
     -H "Content-Type: application/json" \
     -d '{"address":"dyt1example_address_here"}'

   # Check balance
   curl http://localhost:3001/api/balance/dyt1example_address_here
   ```

2. **Test Explorer:**
   ```bash
   # Get recent blocks
   curl http://localhost:3002/api/blocks

   # Search for a block
   curl http://localhost:3002/api/search/1
   ```

3. **Test Rate Limiting:**
   ```bash
   # Make multiple requests quickly (should be rate limited)
   for i in {1..10}; do
     curl -X POST http://localhost:3001/api/faucet \
       -H "Content-Type: application/json" \
       -d '{"address":"dyt1test_address_'$i'"}'
   done
   ```

### Automated Testing
```bash
# Run faucet tests
cd faucet && npm test

# Run explorer tests
cd explorer && npm test
```

## 🔧 Configuration

### Environment Variables

**Faucet (.env):**
```bash
PORT=3001
CHAIN_ID=dytallix-testnet-1
RPC_ENDPOINT=http://127.0.0.1:26657
FAUCET_AMOUNT=1000000udyt
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=5
IP_COOLDOWN_MS=1800000
```

**Explorer (.env):**
```bash
PORT=3002
CHAIN_ID=dytallix-testnet-1
RPC_ENDPOINT=http://127.0.0.1:26657
CORS_ORIGIN=http://localhost:3001
CACHE_TIMEOUT=30
```

### Production Considerations

1. **Private Key Management**:
   - Use hardware security modules (HSMs) for faucet keys
   - Implement proper key rotation mechanisms
   - Encrypt private keys at rest

2. **Database Integration**:
   - Replace in-memory rate limiting with Redis
   - Add persistent transaction history storage
   - Implement proper backup strategies

3. **Monitoring & Alerting**:
   - Set up Prometheus metrics collection
   - Configure Grafana dashboards
   - Implement alerting for service failures

4. **Security Hardening**:
   - Add CAPTCHA for additional bot protection
   - Implement IP whitelisting/blacklisting
   - Add DDoS protection with rate limiting
   - Use HTTPS in production environments

## 📝 Development Guidelines

### Adding New Features

1. **Faucet Enhancements**:
   - Add new distribution methods (social verification, etc.)
   - Implement reward systems for testnet participation
   - Add support for multiple token types

2. **Explorer Features**:
   - Add charts and analytics dashboards
   - Implement advanced search filters
   - Add transaction mempool viewing
   - Create mobile-responsive design improvements

### Code Standards
- Follow ESLint configuration
- Add comprehensive error handling
- Include unit tests for new features
- Document API changes in this README

## 📞 Support & Troubleshooting

### Common Issues

1. **Faucet not connecting to blockchain**:
   - Check RPC endpoint configuration
   - Verify network connectivity
   - Check faucet private key validity

2. **Rate limiting too aggressive**:
   - Adjust `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS`
   - Check IP cooldown settings
   - Review logs for abuse patterns

3. **Explorer not loading data**:
   - Verify RPC endpoint accessibility
   - Check browser console for errors
   - Validate CORS configuration

### Getting Help
- Check service logs: `docker-compose logs service-name`
- Review health check endpoints
- Validate configuration files
- Check network connectivity between services

## 📄 License

MIT License - see LICENSE file for details.

---

**Built for the Dytallix Testnet** - Providing secure and user-friendly infrastructure for blockchain development and testing.