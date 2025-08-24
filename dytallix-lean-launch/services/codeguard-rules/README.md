# CodeGuard Rules Service

This service manages and applies security rules to analysis results, providing configurable rule sets and scoring adjustments.

## Features

- **Rule Engine**: Configurable security rules and policies
- **Scoring Logic**: Weighted scoring based on rule violations
- **Rule Sets**: Predefined rule sets for different contract types
- **Custom Rules**: Support for custom rule definitions

## Environment Setup

```bash
# Required environment variables
RULES_PORT=8082
RULES_CONFIG_PATH=./config/rules.json
RULES_STRICT_MODE=false
```

## API Endpoints

- `POST /evaluate` - Evaluate analysis results against rules
- `GET /rules` - List available rules
- `POST /rules` - Add custom rule
- `GET /rulesets` - List available rule sets
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