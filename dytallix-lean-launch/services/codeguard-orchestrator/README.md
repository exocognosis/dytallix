# CodeGuard Orchestrator Service

This service coordinates the overall scanning workflow, managing scan requests and coordinating between worker services and the rules engine.

## Architecture

- **API Server**: REST API for receiving scan requests
- **Workflow Manager**: Orchestrates the scanning pipeline
- **Contract Interface**: Communicates with the CodeGuard smart contract
- **Worker Coordination**: Manages worker service instances

## Environment Setup

```bash
# Required environment variables
CODEGUARD_CONTRACT_ADDRESS=dytallix1...
CODEGUARD_CHAIN_RPC=http://localhost:26657
CODEGUARD_WORKERS_ENDPOINT=http://localhost:8081
CODEGUARD_RULES_ENDPOINT=http://localhost:8082
```

## API Endpoints

- `POST /scan` - Submit a contract for scanning
- `GET /scan/{id}` - Get scan status/results
- `GET /health` - Health check

## Development

```bash
# Start the service
npm start

# Run tests
npm test

# Build
npm run build
```