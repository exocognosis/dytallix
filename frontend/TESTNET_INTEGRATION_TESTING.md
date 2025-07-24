# Dytallix Frontend Testnet Integration Testing

## Overview

This document provides comprehensive instructions for testing and validating the Dytallix frontend application against live testnet infrastructure. The implementation provides a robust testing framework for post-quantum cryptography (PQC) and AI-enhanced cryptocurrency platform features.

## Architecture

### Environment Configuration System

The frontend now supports multiple environment configurations:

- **Development** (`.env.development`): Local development with mock services
- **Testnet** (`.env.testnet`): Live testnet integration testing
- **Production** (`.env.production`): Production deployment configuration

### Key Components

1. **ConfigService** (`src/services/config.ts`): Environment-aware configuration management
2. **Enhanced API Service** (`src/services/api.ts`): Performance monitoring and error tracking
3. **WebSocket Integration** (`src/hooks/useWebSocket.ts`): Real-time testnet connectivity
4. **Testnet Monitor** (`src/services/testnet-monitor.ts`): Comprehensive health monitoring
5. **Wallet Integration** (`src/services/wallet-integration.ts`): MetaMask and PQC wallet testing
6. **Diagnostics UI** (`src/pages/TestnetDiagnostics.tsx`): Interactive testing interface

## Quick Start

### 1. Environment Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Start testnet development server
npm run dev:testnet
```

### 2. Build for Different Environments

```bash
# Development build
npm run build:dev

# Testnet build
npm run build:testnet

# Production build
npm run build
```

### 3. Run Tests

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# Comprehensive test automation
./test-testnet-integration.sh
```

## Testnet Configuration

### Environment Variables

The following environment variables configure testnet integration:

```bash
# Core Configuration
VITE_ENVIRONMENT=testnet
VITE_APP_NAME="Dytallix Testnet"

# API Endpoints
VITE_BLOCKCHAIN_API_URL=https://testnet-api.dytallix.io
VITE_AI_API_URL=https://testnet-ai.dytallix.io
VITE_WEBSOCKET_URL=wss://testnet-api.dytallix.io/ws

# Network Configuration
VITE_NETWORK_NAME=dytallix-testnet
VITE_CHAIN_ID=8888
VITE_CONFIRMATION_BLOCKS=3

# Monitoring & Debugging
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_ENABLE_NETWORK_LOGGING=true
VITE_ENABLE_ERROR_REPORTING=true

# External Chain Integration
VITE_ETHEREUM_TESTNET_RPC=https://ethereum-sepolia-rpc.publicnode.com
VITE_ETHEREUM_CHAIN_ID=11155111
VITE_COSMOS_TESTNET_RPC=https://rpc.sentry-02.theta-testnet.polypore.xyz
```

### Network Configuration for MetaMask

The application automatically configures MetaMask with testnet settings:

```javascript
{
  chainId: "0x22B8", // 8888 in hex
  chainName: "Dytallix Testnet",
  nativeCurrency: {
    name: "Dytallix",
    symbol: "DYT",
    decimals: 18
  },
  rpcUrls: ["https://testnet-api.dytallix.io"],
  blockExplorerUrls: ["https://testnet-explorer.dytallix.io"]
}
```

## Testing Framework

### 1. Connectivity Testing

Test blockchain and AI service connectivity:

```typescript
import { api } from './services/api'

// Test API connectivity
const connectionTest = await api.testConnection()
console.log(connectionTest) // { blockchain: true, ai: true }

// Get connection information
const info = api.getConnectionInfo()
console.log(info) // Environment, endpoints, network details
```

### 2. WebSocket Testing

Test real-time connectivity:

```typescript
import { useWebSocket } from './hooks/useWebSocket'

const { isConnected, testConnection, getConnectionInfo } = useWebSocket()

// Test WebSocket connectivity
const wsTest = await testConnection()
console.log('WebSocket test:', wsTest)

// Get connection details
const wsInfo = getConnectionInfo()
console.log('WebSocket info:', wsInfo)
```

### 3. Wallet Integration Testing

Test MetaMask and PQC wallet integration:

```typescript
import { walletIntegration } from './services/wallet-integration'

// Run comprehensive wallet diagnostics
const diagnostics = await walletIntegration.runWalletDiagnostics()
console.log('Wallet diagnostics:', diagnostics)

// Test MetaMask connection
const mmConnection = await walletIntegration.connectMetaMask()
console.log('MetaMask connection:', mmConnection)

// Test PQC key generation
const pqcKey = await walletIntegration.generatePQCKeyPair('dilithium')
console.log('PQC key generation:', pqcKey)
```

### 4. Transaction Flow Testing

Test end-to-end transaction processing:

```typescript
import { testnetMonitor } from './services/testnet-monitor'

// Test complete transaction flow
const txTest = await testnetMonitor.testTransactionFlow(
  '0x1234...', // from address
  '0x5678...', // to address
  0.001       // amount in ETH
)

console.log('Transaction test:', txTest)
```

## Testnet Diagnostics Interface

Access the comprehensive diagnostics interface at:
- Development: `http://localhost:3000/#/testnet-diagnostics`
- Testnet: Your testnet URL + `/#/testnet-diagnostics`

### Features

1. **Real-time Health Monitoring**
   - API connectivity status
   - Response time tracking
   - Error rate monitoring
   - WebSocket connection status

2. **Performance Metrics**
   - API call statistics
   - Success/failure rates
   - Average response times
   - Network error tracking

3. **Interactive Testing**
   - Manual connectivity tests
   - Transaction flow simulation
   - Wallet integration validation
   - Export diagnostic reports

4. **Network Information**
   - Chain ID and network details
   - Confirmation requirements
   - Endpoint configurations
   - Real-time updates

## Automated Testing

### Test Automation Script

Run comprehensive automated tests:

```bash
# Make script executable
chmod +x test-testnet-integration.sh

# Run full test suite
./test-testnet-integration.sh
```

The script performs:

1. **Prerequisites Check**: Node.js, npm, dependencies
2. **Environment Validation**: Configuration files and variables
3. **Build Testing**: Compilation for testnet environment
4. **Code Quality**: ESLint and TypeScript checks
5. **Unit Testing**: Component and service tests
6. **Integration Testing**: API and WebSocket connectivity
7. **Artifact Validation**: Build output verification
8. **Report Generation**: Comprehensive JSON and text reports

### Test Categories

1. **Unit Tests** (`src/tests/unit/`): Individual component testing
2. **Integration Tests** (`src/tests/integration/`): Service integration testing
3. **End-to-End Tests**: Full application flow testing
4. **Performance Tests**: Load and response time testing

### Continuous Integration

Include in CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Frontend Testnet Integration Tests
  run: |
    cd frontend
    npm ci
    ./test-testnet-integration.sh
    
- name: Upload Test Reports
  uses: actions/upload-artifact@v3
  with:
    name: testnet-integration-reports
    path: frontend/testnet-integration-report.json
```

## Monitoring and Debugging

### 1. Enhanced Logging

The application provides comprehensive logging:

```typescript
import config from './services/config'

// Environment-aware logging
config.log('info', 'Application started')
config.log('debug', 'Debug information', { data })
config.log('error', 'Error occurred', error)
```

### 2. Performance Monitoring

Track API performance:

```typescript
// Performance data is automatically collected
const performanceData = testnetMonitor.exportHealthData()
console.log('Performance metrics:', performanceData)
```

### 3. Error Reporting

Automatic error capture and reporting:

```typescript
// Listen for application errors
window.addEventListener('dytallix-error', (event) => {
  console.log('Application error:', event.detail)
})
```

### 4. Network Request Tracking

All API requests are logged with:
- Request/response timing
- Error details
- Retry attempts
- Success/failure rates

## Troubleshooting

### Common Issues

1. **Connection Failures**
   ```bash
   # Check endpoints are reachable
   curl -f https://testnet-api.dytallix.io/health
   
   # Verify WebSocket connectivity
   wscat -c wss://testnet-api.dytallix.io/ws
   ```

2. **MetaMask Network Issues**
   ```javascript
   // Manually add network
   await window.ethereum.request({
     method: 'wallet_addEthereumChain',
     params: [networkConfig]
   })
   ```

3. **Build Issues**
   ```bash
   # Clean and rebuild
   rm -rf node_modules dist-*
   npm install
   npm run build:testnet
   ```

### Debug Mode

Enable debug mode for detailed logging:

```bash
# Set environment for verbose logging
VITE_LOG_LEVEL=debug npm run dev:testnet
```

## Best Practices

### 1. Environment Isolation

- Use separate build outputs for each environment
- Validate environment configuration before deployment
- Test environment switching in development

### 2. Error Handling

- Implement graceful degradation for service failures
- Provide user-friendly error messages
- Log errors for debugging without exposing sensitive data

### 3. Performance Optimization

- Monitor API response times
- Implement request caching where appropriate
- Use performance budgets in build process

### 4. Security Considerations

- Never commit private keys or sensitive data
- Validate all user inputs
- Use HTTPS for all external communications
- Implement rate limiting for API requests

## Integration Checklist

### Pre-Testnet Deployment

- [ ] Environment variables configured
- [ ] Build process working for testnet
- [ ] All tests passing
- [ ] MetaMask network configuration tested
- [ ] WebSocket connectivity verified
- [ ] API endpoints accessible
- [ ] Error handling validated
- [ ] Performance metrics baseline established

### Post-Testnet Deployment

- [ ] Real connectivity tests completed
- [ ] Transaction flow verified
- [ ] Wallet integration working
- [ ] Real-time updates functioning
- [ ] Error reporting operational
- [ ] Performance monitoring active
- [ ] User acceptance testing completed

## Conclusion

This comprehensive testnet integration testing framework provides robust validation of the Dytallix frontend application against live testnet infrastructure. The combination of automated testing, real-time monitoring, and interactive diagnostics ensures reliable operation in testnet environments while maintaining high code quality and performance standards.

For support or questions, refer to the diagnostic interface or review the generated test reports for detailed analysis of any issues.