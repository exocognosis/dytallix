# Dytallix Performance Benchmarks

This directory contains the comprehensive performance benchmarking suite for the Dytallix post-quantum cryptography and AI-enhanced cryptocurrency platform.

## Overview

The benchmarking suite provides baseline performance collection across all core Dytallix systems:

- **Smart Contract Instrumentation**: Gas usage and execution time logging for Ethereum bridge contracts and WASM contracts
- **Testnet Benchmarking**: Performance testing on Osmosis and Sepolia testnets
- **AI API Performance Testing**: Cold start metrics, warm performance, and load testing
- **Database Performance Analysis**: Read/write latency, throughput, and storage efficiency
- **Network Performance Measurement**: Latency, throughput, and concurrent connection testing
- **Unified Metrics Export**: Comprehensive baseline_metrics.md report generation

## Quick Start

### Run All Benchmarks
```bash
# Run complete benchmark suite
python3 benchmarks/run_benchmarks.py --all

# Run with custom duration and concurrency
python3 benchmarks/run_benchmarks.py --all --duration 120 --concurrent 20
```

### Run Individual Component Benchmarks
```bash
# Smart contracts only
python3 benchmarks/run_benchmarks.py --smart-contracts

# AI APIs only  
python3 benchmarks/run_benchmarks.py --ai-apis

# Database only
python3 benchmarks/run_benchmarks.py --database

# Network only
python3 benchmarks/run_benchmarks.py --network
```

### Generate Baseline Report Only
```bash
python3 benchmarks/unified_metrics_collector.py
```

## Benchmark Components

### 1. Smart Contract Performance

**Files:**
- `sepolia_evm_benchmarks.rs` - EVM contract benchmarks for Sepolia testnet
- `osmosis_wasm_benchmarks.rs` - WASM contract benchmarks for Osmosis testnet

**Enhanced Contracts:**
- `../deployment/ethereum-contracts/contracts/DytallixBridge.sol` - Added performance events
- `../deployment/ethereum-contracts/contracts/WrappedDytallix.sol` - Added gas tracking
- `../smart-contracts/src/runtime.rs` - Enhanced WASM gas metering

**Metrics Collected:**
- Gas usage per operation
- Execution time measurements
- Transaction throughput
- Error rates
- Gas optimization opportunities

### 2. AI API Performance Testing

**File:** `ai_api_performance_test.py`

**Test Scenarios:**
- Cold start performance measurement
- Warm service performance
- Load testing with concurrent requests
- Sustained load over time
- Per-endpoint performance analysis

**Endpoints Tested:**
- `/api/v1/fraud-detection`
- `/api/v1/risk-scoring`
- `/api/v1/contract-analysis`
- `/api/v1/health`

**Usage:**
```bash
python3 benchmarks/ai_api_performance_test.py \
  --base-url http://localhost:8000 \
  --duration 60 \
  --concurrent 10 \
  --output results/ai_metrics.json
```

### 3. Database Performance Analysis

**File:** `database_performance_test.py`

**Test Types:**
- Read operation latency and throughput
- Write operation performance
- Concurrent operation handling
- Complex query performance
- Bulk operation efficiency
- Storage efficiency analysis

**Usage:**
```bash
python3 benchmarks/database_performance_test.py \
  --host localhost \
  --port 5432 \
  --database dytallix \
  --duration 60 \
  --concurrent 10
```

### 4. Network Performance Measurement

**File:** `network_performance_test.sh`

**Test Categories:**
- Latency testing between components
- HTTP throughput testing with wrk
- Bandwidth testing with iperf3
- Interface statistics monitoring
- Concurrent connection handling

**Usage:**
```bash
./benchmarks/network_performance_test.sh \
  --duration 60 \
  --concurrent 50
```

### 5. Unified Metrics Collection

**File:** `unified_metrics_collector.py`

**Features:**
- Aggregates metrics from all components
- Calculates performance scores
- Generates optimization recommendations
- Exports baseline_metrics.md report
- Provides JSON export for integration

**Usage:**
```bash
python3 benchmarks/unified_metrics_collector.py \
  --duration 60 \
  --concurrent 10 \
  --export-json full_results.json
```

## Output Files

### Baseline Report
- `../baseline_metrics.md` - Main baseline performance report

### Individual Results
- `results/ai_api_metrics_*.json` - AI API performance data
- `results/database_metrics_*.json` - Database performance data  
- `results/network_*_*.json` - Network performance data
- `results/network_performance_summary_*.md` - Network summary

### Performance Tracking
Results include:
- Component-specific metrics
- Aggregate performance scores
- Trend analysis capabilities
- Regression detection baselines

## Dependencies

### Python Dependencies
```bash
pip install asyncio aiohttp asyncpg psutil
```

### System Dependencies
```bash
# Ubuntu/Debian
sudo apt-get install curl netcat-openbsd ping iperf3 wrk iproute2

# macOS
brew install curl netcat iperf3 wrk
```

### Rust Dependencies
Dependencies are managed through the workspace Cargo.toml.

## Configuration

### Environment Variables
```bash
# Database configuration
export DYTALLIX_DB_HOST=localhost
export DYTALLIX_DB_PORT=5432
export DYTALLIX_DB_NAME=dytallix

# AI API configuration
export DYTALLIX_AI_API_URL=http://localhost:8000

# Blockchain endpoints
export DYTALLIX_SEPOLIA_RPC=https://sepolia.infura.io/v3/YOUR_KEY
export DYTALLIX_OSMOSIS_RPC=https://lcd.osmosis.zone
```

### Test Parameters
Default configuration can be overridden via command-line arguments:

- `--duration SECONDS` - Test duration (default: 60)
- `--concurrent NUM` - Concurrent operations (default: 10)
- `--output-dir PATH` - Results directory (default: benchmarks/results)

## Integration with CI/CD

### GitHub Actions Integration
```yaml
- name: Run Performance Benchmarks
  run: |
    python3 benchmarks/run_benchmarks.py --all --duration 30
    
- name: Upload Baseline Report
  uses: actions/upload-artifact@v3
  with:
    name: performance-baseline
    path: baseline_metrics.md
```

### Continuous Monitoring
The baseline report enables:
- Performance regression detection
- Automated alerting on degradation
- Historical performance tracking
- Optimization opportunity identification

## Performance Targets

### Smart Contracts
- Gas efficiency score: >8.0/10.0
- Transaction success rate: >99%
- Average execution time: <100ms

### AI APIs  
- Cold start time: <5s
- Warm response time: <200ms
- Success rate: >99.5%
- Throughput: >30 RPS

### Database
- Read latency P95: <50ms
- Write latency P95: <100ms
- Throughput: >1000 ops/sec
- Success rate: >99.9%

### Network
- Service latency: <100ms
- Throughput: >100 RPS per service
- Connection success rate: >95%

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check database availability
   pg_isready -h localhost -p 5432
   
   # Use simulated metrics if database unavailable
   python3 benchmarks/unified_metrics_collector.py --simulate-db
   ```

2. **AI Services Not Available**
   ```bash
   # Check AI service health
   curl http://localhost:8000/api/v1/health
   
   # Benchmarks will use simulated data if services unavailable
   ```

3. **Network Tools Missing**
   ```bash
   # Install missing tools
   sudo apt-get install wrk iperf3 netcat-openbsd
   ```

4. **Permission Denied for Scripts**
   ```bash
   chmod +x benchmarks/*.sh
   chmod +x benchmarks/*.py
   ```

### Performance Analysis

1. **Check Individual Components**
   ```bash
   # Test specific component
   python3 benchmarks/run_benchmarks.py --ai-apis --duration 30
   ```

2. **Analyze Results**
   ```bash
   # View detailed results
   cat results/ai_api_metrics_*.json | jq '.endpoint_performance'
   ```

3. **Compare Baselines**
   ```bash
   # Compare current vs baseline
   diff baseline_metrics.md baseline_metrics_previous.md
   ```

## Contributing

### Adding New Benchmarks

1. Create benchmark script in appropriate language
2. Follow existing naming convention: `component_performance_test.{py|rs|sh}`
3. Integrate with `unified_metrics_collector.py`
4. Update `run_benchmarks.py` orchestrator
5. Add documentation to this README

### Metric Standards

All benchmarks should provide:
- Success/failure rates
- Latency percentiles (P50, P95, P99)
- Throughput measurements
- Error categorization
- Resource utilization data

## License

This benchmarking suite is part of the Dytallix project and follows the same license terms.