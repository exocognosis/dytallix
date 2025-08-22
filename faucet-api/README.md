# Dytallix Multi-Token Faucet API

A fully functional TypeScript-based multi-token faucet implementation providing the POST `/api/faucet/dispense` endpoint with comprehensive rate limiting, cooldown management, and error handling.

## Features

- **Multi-token Support**: Dispense multiple tokens in a single request
- **Rate Limiting**: IP-based and address-based rate limiting
- **Cooldown Management**: Per-token, per-address cooldown periods
- **Comprehensive Validation**: Address format, token allowlist, amount limits
- **Error Handling**: Structured error responses with specific error codes
- **TypeScript**: Fully typed implementation with strict typing
- **Extensible Design**: Modular architecture for easy extension

## API Endpoint

### POST /api/faucet/dispense

Dispenses tokens to a specified address with comprehensive validation and rate limiting.

#### Request Body

```typescript
{
  address: string;                    // 0x-prefixed Ethereum address
  tokens: Array<{
    symbol: string;                   // Token symbol (TOKENA, TOKENB)
    amount: string;                   // Amount as decimal string
  }>;
}
```

#### Success Response

```typescript
{
  success: true;
  dispensed: Array<{
    symbol: string;
    amount: string;
    txHash: string;
  }>;
  cooldowns: {
    tokens: Record<string, { nextAllowedAt: number }>;
  };
  message: string;
}
```

#### Error Response

```typescript
{
  success: false;
  dispensed: [];
  cooldowns: {};
  error: {
    code: string;
    httpStatus: number;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

## Configuration

The faucet is configured via `src/config/faucetConfig.ts`:

- **Allowed Tokens**: TOKENA (max 100 per request), TOKENB (max 50 per request)
- **Cooldown**: 3600 seconds (1 hour) per token per address
- **Rate Limits**: 
  - IP: 10 requests per 15 minutes
  - Address: 5 requests per 15 minutes
- **Max Tokens Per Request**: 2

## Error Codes

- `FAUCET_INVALID_REQUEST`: Malformed request body
- `FAUCET_INVALID_ADDRESS`: Invalid address format
- `FAUCET_UNSUPPORTED_TOKEN`: Token not in allowlist
- `FAUCET_DUPLICATE_SYMBOL`: Duplicate token symbols in request
- `FAUCET_AMOUNT_INVALID`: Invalid amount (<=0 or exceeds limit)
- `FAUCET_RATE_LIMIT_IP`: IP rate limit exceeded
- `FAUCET_RATE_LIMIT_ADDRESS`: Address rate limit exceeded
- `FAUCET_COOLDOWN_ACTIVE`: Cooldown period active
- `FAUCET_TX_SIGNING_FAILED`: Transaction signing failed
- `FAUCET_TX_SUBMISSION_FAILED`: Transaction submission failed

## Architecture

```
src/
├── config/
│   └── faucetConfig.ts          # Configuration settings
├── controllers/
│   └── FaucetController.ts      # Main business logic
├── errors/
│   └── faucetErrors.ts          # Error definitions and classes
├── middleware/
│   ├── rateLimit.ts             # Rate limiting middleware
│   └── validateFaucetRequest.ts # Request validation middleware
├── routes/
│   └── faucet.ts                # Express routes
├── services/faucet/
│   ├── cooldownStore.ts         # Cooldown management
│   └── tokenDispenser.ts        # Token dispensing abstraction
├── types/
│   └── faucet.ts                # TypeScript type definitions
└── index.ts                     # Express app setup
```

## Usage

### Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start server
npm start

# Development with hot reload
npm run dev

# Run tests
npm test
npm run test:unit
```

### Example Requests

```bash
# Dispense both tokens
curl -X POST http://localhost:3001/api/faucet/dispense \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x1111111111111111111111111111111111111111",
    "tokens": [
      {"symbol": "TOKENA", "amount": "10"},
      {"symbol": "TOKENB", "amount": "5"}
    ]
  }'

# Dispense single token
curl -X POST http://localhost:3001/api/faucet/dispense \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x2222222222222222222222222222222222222222",
    "tokens": [{"symbol": "TOKENA", "amount": "25"}]
  }'
```

## Testing

The implementation includes comprehensive unit tests covering:

- ✅ Successful multi-token dispensing
- ✅ Address validation errors
- ✅ Unsupported token errors
- ✅ Duplicate symbol detection
- ✅ Amount validation
- ✅ Cooldown enforcement
- ✅ Rate limiting functionality

Run tests with `npm run test:unit`.

## Production Considerations

- Replace `MockTokenDispenser` with real blockchain integration
- Implement persistent storage for rate limits and cooldowns
- Add authentication/authorization if required
- Configure environment-specific settings
- Set up monitoring and logging
- Implement proper transaction signing with secure key management

## Environment Variables

- `FAUCET_API_PORT`: Server port (default: 3001)
- `FAUCET_SIGNER_PK`: Private key for signing transactions
- `FAUCET_RPC_URL`: RPC URL for blockchain connectivity

## Dependencies

- **express**: Web framework
- **typescript**: TypeScript compiler
- **vitest**: Testing framework
- **supertest**: HTTP assertion library