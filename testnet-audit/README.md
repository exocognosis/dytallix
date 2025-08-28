# Dytallix Testnet Performance & Health Audit System

This directory contains a comprehensive performance and health audit system for the Dytallix testnet, designed to evaluate system performance under high load and monitor real-time health metrics.

## 🎯 Objectives

- **High-Volume Transaction Throughput**: Test 1000+ TPS capability
- **Confirmation Latency Monitoring**: Track transaction confirmation times under load
- **Resource Utilization**: Monitor memory and CPU usage at peak performance
- **System Stability**: Evaluate error rates and system resilience
- **Network Health**: Monitor node uptime and peer connectivity
- **Real-Time Dashboard**: Visual health monitoring and reporting

## 📁 Directory Structure

```
testnet-audit/
├── load-testing/
│   ├── locust_load_test.py      # Locust-based load testing
│   ├── artillery-config.yml      # Artillery.js configuration
│   └── test-data.csv            # Generated test data (runtime)
├── monitoring/
│   └── performance-monitor.ts   # TypeScript performance monitoring
├── scripts/
│   ├── run-testnet-audit.sh     # Main audit execution script
│   └── post-audit-stability-check.sh  # Post-test verification
├── reports/
│   └── health-dashboard.html    # Real-time health dashboard
├── results/                     # Generated during execution
├── requirements.txt             # Python dependencies
└── README.md                   # This file
```

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+ (optional, for TypeScript monitoring)
- curl and basic Unix tools
- Access to Dytallix testnet API

### Installation

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Install Node.js dependencies (optional):**
   ```bash
   npm install -g artillery typescript
   ```

3. **Make scripts executable:**
   ```bash
   chmod +x scripts/*.sh
   ```

### Running the Audit

Execute the comprehensive audit with default settings:

```bash
./scripts/run-testnet-audit.sh
```

Or customize parameters:

```bash
./scripts/run-testnet-audit.sh \
    --target-tps 1500 \
    --duration 600 \
    --users 150 \
    --api-url https://testnet-api.dytallix.io
```

### Post-Audit Verification

Run stability verification after the audit:

```bash
./scripts/post-audit-stability-check.sh --duration 300
```

## 🔧 Configuration Options

### Main Audit Script Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--target-tps` | 1000 | Target transactions per second |
| `--duration` | 300 | Test duration in seconds (5 minutes) |
| `--users` | 100 | Concurrent users for load testing |
| `--api-url` | `https://testnet-api.dytallix.io` | Testnet API URL |
| `--ws-url` | `wss://testnet-api.dytallix.io/ws` | WebSocket URL |

### Environment Variables

```bash
export TESTNET_API_URL="https://custom-testnet.dytallix.io"
export TESTNET_WS_URL="wss://custom-testnet.dytallix.io/ws"
export TARGET_TPS=1500
export TEST_DURATION=600
export CONCURRENT_USERS=150
```

## 📊 Load Testing Components

### 1. Locust Load Testing (`locust_load_test.py`)

**Features:**
- Realistic user behavior simulation
- Multiple user classes for different scenarios
- WebSocket connection stress testing
- Transaction submission and monitoring
- Real-time metrics collection

**User Classes:**
- `DytallixTestnetUser`: General API testing with realistic patterns
- `WebSocketStressUser`: WebSocket connection stress testing
- `HighVolumeTransactionUser`: High-frequency transaction submission

**Usage:**
```bash
locust -f load-testing/locust_load_test.py \
    --host=https://testnet-api.dytallix.io \
    --users=100 \
    --spawn-rate=10 \
    --run-time=300s \
    --headless
```

### 2. Artillery Load Testing (`artillery-config.yml`)

**Features:**
- Multi-phase load testing (warm-up, sustained, peak, burst, cool-down)
- WebSocket protocol support
- Performance threshold validation
- Automated test data generation

**Phases:**
1. **Warm-up**: 60s @ 10 req/s
2. **Sustained**: 300s @ 50 req/s
3. **Peak**: 120s @ 100 req/s
4. **Burst**: 60s @ 200 req/s
5. **Cool-down**: 60s @ 20 req/s

**Usage:**
```bash
artillery run load-testing/artillery-config.yml
```

## 📈 Performance Monitoring

### TypeScript Performance Monitor (`performance-monitor.ts`)

**Capabilities:**
- Real-time TPS measurement
- Confirmation latency tracking
- Memory and CPU utilization monitoring
- WebSocket health monitoring
- Automated alerting system
- Comprehensive reporting

**Metrics Collected:**
- Transactions per second (TPS)
- Confirmation latency (ms)
- Memory usage (RSS, heap, external)
- CPU utilization (%)
- Network statistics (peers, uptime, errors)
- WebSocket connection health

**Usage:**
```bash
# Compile and run (if Node.js available)
npx tsc monitoring/performance-monitor.ts
node monitoring/performance-monitor.js
```

## 🖥️ Real-Time Dashboard

The health dashboard (`reports/health-dashboard.html`) provides:

- **Live Metrics**: Real-time performance indicators
- **Interactive Charts**: TPS, latency, and resource utilization graphs
- **System Alerts**: Critical, warning, and informational alerts
- **Performance Summary**: Overall audit session statistics
- **Network Health**: Peer connectivity and uptime monitoring

**Features:**
- Responsive design for desktop and mobile
- Auto-refreshing data (10-second intervals)
- Alert filtering and categorization
- Performance threshold monitoring
- Historical trend analysis

## 📋 Audit Process

### 1. Pre-Audit Phase
- Prerequisites validation
- Environment setup
- Baseline health check
- Test data generation

### 2. Monitoring Phase
- Start performance monitoring systems
- Initialize WebSocket connections
- Begin metrics collection

### 3. Load Testing Phase
- **Parallel Execution:**
  - Locust load testing
  - Artillery stress testing
  - WebSocket connection testing
- Real-time performance tracking
- Automatic threshold monitoring

### 4. Post-Audit Phase
- Stop monitoring systems
- Stability verification
- Comprehensive report generation
- Results archival

## 📊 Generated Reports

### During Audit
- `results/locust/`: Locust test results and HTML reports
- `results/artillery/`: Artillery test results and HTML reports
- `results/monitoring/`: Performance monitoring logs and data
- `results/websocket-test.log`: WebSocket stress test results

### Final Reports
- `reports/health-dashboard.html`: Interactive health dashboard
- `reports/audit-report-TIMESTAMP.json`: Comprehensive JSON report
- `results/stability-report-TIMESTAMP.json`: Post-audit stability analysis
- Compressed archive: `dytallix-testnet-audit-TIMESTAMP.tar.gz`

## ⚠️ Thresholds and Alerts

### Performance Thresholds
- **Minimum TPS**: 100 (configurable)
- **Maximum Latency**: 5000ms
- **Memory Limit**: 2048MB
- **CPU Limit**: 80%
- **Minimum Peers**: 3
- **Maximum Error Rate**: 5%

### Alert Levels
- **🟢 Healthy**: All metrics within thresholds
- **🟡 Warning**: Approaching threshold limits
- **🔴 Critical**: Exceeding critical thresholds

## 🔧 Integration Points

### Existing Infrastructure
- Leverages existing performance monitoring (`tests/utils/performance_monitor.py`)
- Integrates with WebSocket testing framework (`tests/websocket/`)
- Uses established testnet deployment scripts
- Connects to existing monitoring infrastructure

### API Endpoints Tested
- `/status` - Node health and status
- `/health` - System health check
- `/blocks` - Block data retrieval
- `/transactions` - Transaction history
- `/peers` - Peer connectivity
- `/stats` - Network statistics
- `/submit` - Transaction submission
- `/balance/{address}` - Balance queries

### WebSocket Channels
- `blocks` - Real-time block updates
- `transactions` - Transaction confirmations
- `network_stats` - Network statistics

## 🐛 Troubleshooting

### Common Issues

1. **Locust Installation Issues**
   ```bash
   pip install --upgrade locust
   ```

2. **Artillery Not Found**
   ```bash
   npm install -g artillery
   ```

3. **WebSocket Connection Failures**
   - Check firewall settings
   - Verify WebSocket URL accessibility
   - Review network connectivity

4. **Permission Denied on Scripts**
   ```bash
   chmod +x scripts/*.sh
   ```

5. **API Unreachable**
   - Verify testnet is running
   - Check API URL configuration
   - Test manual API access with curl

### Log Analysis

- **Main audit log**: `results/audit-TIMESTAMP.log`
- **Performance monitor logs**: `results/monitoring/`
- **Locust logs**: `results/locust/output.log`
- **Artillery logs**: `results/artillery/output.log`

### Performance Debugging

1. **Low TPS Issues**
   - Check API response times
   - Verify transaction submission success rates
   - Review system resource utilization

2. **High Latency**
   - Analyze network connectivity
   - Check server-side processing times
   - Review database performance

3. **Memory/CPU Issues**
   - Monitor system resources during test
   - Check for memory leaks
   - Review concurrent user limits

## 🤝 Contributing

To extend the audit system:

1. **Add New Load Tests**: Extend Locust user classes or Artillery scenarios
2. **Enhanced Monitoring**: Add new metrics to the TypeScript monitor
3. **Custom Reports**: Modify the HTML dashboard or add new report formats
4. **Integration**: Connect with additional monitoring systems

## 📜 Success Criteria

The audit system validates testnet readiness by achieving:

- ✅ **1000+ TPS sustained load** for 5+ minutes
- ✅ **Comprehensive performance metrics** collection
- ✅ **Sub-5 second confirmation latency** under load
- ✅ **<5% error rate** during stress testing
- ✅ **System stability verification** post-stress testing
- ✅ **Complete audit trail** and reporting
- ✅ **Real-time health monitoring** capabilities

## 📞 Support

For issues or questions regarding the audit system:

1. Review logs in the `results/` directory
2. Check the troubleshooting section above
3. Verify all prerequisites are installed
4. Test individual components separately

---

**Note**: This audit system is designed to stress test the Dytallix testnet safely. Always coordinate with the development team before running comprehensive audits on production or shared testnet environments.