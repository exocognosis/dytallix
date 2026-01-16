# Dytallix API and WebSocket Validation Suite

A comprehensive testing framework for validating all core API and WebSocket interfaces in the Dytallix post-quantum cryptography and AI-enhanced cryptocurrency platform.

## 🎯 Overview

This validation suite provides complete coverage for:
- **API Endpoint Testing** - All core REST endpoints with response validation
- **WebSocket Testing** - Real-time connection and message broadcasting
- **Security Testing** - Protection against common vulnerabilities
- **Performance Testing** - Load testing and performance monitoring
- **Automated Reporting** - HTML, Markdown, and CSV reports

## 📁 Project Structure

```
tests/
├── api/                    # API endpoint tests
│   ├── test_status.py      # System status endpoint tests
│   ├── test_blocks.py      # Blockchain blocks endpoint tests
│   ├── test_transactions.py # Transaction endpoint tests
│   └── test_peers.py       # Network peers endpoint tests
├── websocket/              # WebSocket real-time tests
│   ├── test_realtime.py    # WebSocket functionality tests
│   └── ws_client.py        # WebSocket client utilities
├── security/               # Security and vulnerability tests
│   ├── test_vulnerabilities.py # Comprehensive security testing
│   ├── test_malformed_input.py # Input validation tests
│   └── test_unauthorized.py    # Authentication tests
├── utils/                  # Test utilities and metrics
│   ├── performance_monitor.py  # Performance testing utilities
│   ├── report_html_generator.py # Report generation
│   ├── metrics_collector.py    # Metrics collection
│   └── test_runner.py          # Test execution utilities
├── scripts/                # Automation scripts
│   ├── run_validation_suite.py # Main orchestration script
│   └── curl_validation.sh      # Quick cURL validation
├── postman/                # Postman collections
│   └── dytallix_api_collection.json # Comprehensive API collection
└── reports/                # Generated test reports
    ├── validation_report_*.html
    ├── validation_report_*.md
    └── validation_report_*.json
```

## 🚀 Quick Start

### Prerequisites

1. **Dytallix Node Running**: Ensure the Dytallix blockchain node is running on `http://localhost:3030`
2. **Python Dependencies**: Install required packages:
   ```bash
   cd tests/
   pip install -r requirements.txt
   pip install websockets pytest-html
   ```

### One-Command Validation

Run the complete validation suite:

```bash
cd tests/scripts/
python run_validation_suite.py
```

### Quick cURL Validation

For rapid endpoint checking:

```bash
cd tests/scripts/
./curl_validation.sh
```

## 📊 Validation Components

### 1. API Endpoint Testing

Tests all core REST API endpoints:

- **Status & Health**: `/health`, `/status`, `/stats`
- **Blockchain Data**: `/blocks`, `/transactions`, `/peers`
- **Account Operations**: `/balance/{address}`, `/submit`
- **Data Retrieval**: `/transaction/{hash}`, `/blocks/{id}`

```bash
# Run specific API tests
python tests/api/test_status.py
python tests/api/test_blocks.py
python tests/api/test_transactions.py
python tests/api/test_peers.py
```

### 2. WebSocket Testing

Validates real-time WebSocket functionality:

- Connection establishment and stability
- Message broadcasting (blocks, transactions)
- Subscription management
- Concurrent connection handling
- Message integrity validation

```bash
# Run WebSocket tests
python tests/websocket/test_realtime.py --url ws://localhost:3030/ws
```

### 3. Security Testing

Comprehensive security vulnerability testing:

- **SQL Injection Protection**
- **Cross-Site Scripting (XSS) Protection**
- **Buffer Overflow Protection**
- **Rate Limiting Validation**
- **CORS Security Headers**
- **Input Validation & Sanitization**

```bash
# Run security tests
python tests/security/test_vulnerabilities.py
```

### 4. Performance Testing

Load testing and performance monitoring:

- **Endpoint Benchmarking** - Response time measurement
- **Load Testing** - Concurrent user simulation
- **System Monitoring** - CPU, memory, network usage
- **Throughput Analysis** - Requests per second measurement

```bash
# Run performance tests
python tests/utils/performance_monitor.py --test comprehensive
```

## 📈 Report Generation

### HTML Reports

Generate comprehensive HTML reports with charts and detailed analysis:

```bash
python tests/scripts/run_validation_suite.py --html-report reports/validation.html
```

### Markdown Reports

Generate markdown reports for documentation:

```bash
python tests/utils/report_html_generator.py results.json --format markdown
```

### JSON Export

Export raw test data for further analysis:

```bash
python tests/scripts/run_validation_suite.py --output results.json
```

## 🔧 Configuration Options

### Validation Suite Options

```bash
python tests/scripts/run_validation_suite.py [OPTIONS]

Options:
  --url TEXT              Base URL for API (default: http://localhost:3030)
  --ws-url TEXT           WebSocket URL (default: ws://localhost:3030/ws)
  --output TEXT           JSON output file for results
  --html-report TEXT      HTML report output file
  --no-performance        Skip performance tests
  --no-security          Skip security tests
  --quick                Run quick validation only
  --create-postman TEXT  Create Postman collection file
  --create-curl TEXT     Create cURL scripts directory
```

## 📋 Test Categories

### Core API Tests
- ✅ Endpoint availability and response codes
- ✅ JSON response structure validation
- ✅ Data type and format verification
- ✅ Pagination and filtering parameters
- ✅ Error handling and edge cases

### WebSocket Tests
- ✅ Connection establishment and handshake
- ✅ Real-time block and transaction broadcasts
- ✅ Message format and integrity validation
- ✅ Subscription and unsubscription flows
- ✅ Connection stability and recovery

### Security Tests
- ✅ SQL injection attack prevention
- ✅ Cross-site scripting (XSS) protection
- ✅ Buffer overflow attack mitigation
- ✅ Rate limiting and DoS protection
- ✅ CORS policy and security headers
- ✅ Input validation and sanitization

### Performance Tests
- ✅ Response time benchmarking
- ✅ Concurrent user load testing
- ✅ Throughput and latency measurement
- ✅ Resource utilization monitoring
- ✅ Scalability and stress testing

## 🛠 Advanced Usage

### Postman Collection Usage

Import the Postman collection for manual testing:

1. Open Postman
2. Import `tests/postman/dytallix_api_collection.json`
3. Set collection variables:
   - `base_url`: Your API base URL
   - `test_account`: Test account address
4. Run the collection or individual requests

### Integration with CI/CD

Add to your GitHub Actions workflow:

```yaml
name: API Validation
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Start Dytallix Node
        run: ./start_testnet.sh &
      - name: Wait for Node
        run: sleep 30
      - name: Run Validation Suite
        run: |
          cd tests/scripts/
          python run_validation_suite.py --output results.json
```

## 📊 Interpreting Results

### Success Criteria

- **Overall Pass Rate**: ≥ 80% for production readiness
- **API Response Time**: < 1000ms for core endpoints
- **WebSocket Latency**: < 500ms for real-time events
- **Security Tests**: 100% pass rate required
- **Performance**: Handle 50+ concurrent users

## Features

- ✅ Comprehensive API endpoint testing
- ✅ Real-time WebSocket validation
- ✅ Security vulnerability scanning
- ✅ Performance and load testing
- ✅ Automated HTML/Markdown report generation
- ✅ Postman collection with automated assertions
- ✅ cURL scripts for quick validation
- ✅ One-command test execution
- ✅ Continuous monitoring capabilities

## Configuration

Configure test parameters using command-line options or environment variables:

```bash
export DYTALLIX_API_URL="http://localhost:3030"
export DYTALLIX_WS_URL="ws://localhost:3030/ws"
```

## Reports

Test results are automatically generated in the `reports/` directory with detailed metrics, charts, and analysis in multiple formats (HTML, Markdown, CSV, JSON).
- Transaction volumes
- Test duration
- Algorithm parameters
- Network simulation settings

## Extending the Tests

These test scripts serve as a foundation for more comprehensive testing. Each script includes:
- Detailed comments explaining the test methodology
- Configurable parameters for different test scenarios
- Placeholder sections for additional test cases
- Performance metrics collection and reporting

## Integration with CI/CD

The tests are designed to be integrated into the project's build pipeline:
- Automated performance regression detection
- Benchmark result tracking over time
- Stress test validation for release candidates