# CodeGuard Worker Service

This service performs the actual security analysis of smart contracts using various scanning engines and AI models.

## Features

- **Static Analysis**: Code pattern analysis, vulnerability detection
- **Dynamic Analysis**: Execution flow analysis, state mutation testing  
- **Code Quality**: Metrics calculation, best practices checking
- **AI Integration**: Machine learning model inference for vulnerability detection

## Environment Setup

```bash
# Required environment variables
WORKER_PORT=8081
AI_MODEL_ENDPOINT=http://localhost:8090
STATIC_ANALYZER_ENABLED=true
DYNAMIC_ANALYZER_ENABLED=true
```

## API Endpoints

- `POST /analyze` - Analyze a contract
- `GET /models` - List available analysis models
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