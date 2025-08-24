# Dytallix Observability Guide

This document provides comprehensive instructions for setting up and using the Dytallix blockchain observability stack, including Prometheus metrics, Grafana dashboards, alerting, and monitoring best practices.

## Overview

The Dytallix observability stack provides deep insights into blockchain performance, transaction processing, validator behavior, and system health. The monitoring system is designed to:

- Have zero performance impact when disabled (default)
- Provide comprehensive metrics for production monitoring
- Integrate seamlessly with existing Prometheus/Grafana stacks
- Support alerting for critical blockchain events
- Enable 48-hour soak testing and analysis

## Quick Start

### Enable Observability

Set the environment variable to enable observability:

```bash
export ENABLE_OBSERVABILITY=1
```

### Start the Observability Stack

```bash
# Start Prometheus, Grafana, and related services
./scripts/run_observability_stack.sh start
```

### Access Monitoring Services

- **Grafana Dashboards**: http://localhost:3000 (admin/dytallix123)
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093

## Metrics Inventory

### Core Blockchain Metrics (dyt_ prefix)

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `dyt_block_height` | Gauge | - | Current blockchain height |
| `dyt_blocks_produced_total` | Counter | validator | Total blocks produced by each validator |
| `dyt_blocks_per_second` | Gauge | - | Current block production rate |
| `dyt_transactions_in_block` | Histogram | - | Number of transactions per block |
| `dyt_tps` | Gauge | - | Transactions per second (rolling 1m average) |
| `dyt_mempool_size` | Gauge | - | Current number of pending transactions |
| `dyt_gas_used_per_block` | Histogram | - | Gas consumption per block |
| `dyt_oracle_update_latency_seconds` | Histogram | - | Oracle data update latency |
| `dyt_emission_pool_amount` | Gauge | pool_type | Amount in emission pools by type |
| `dyt_validator_missed_blocks_total` | Counter | validator | Blocks missed by each validator |
| `dyt_validator_voting_power` | Gauge | validator | Current voting power of validators |

### Legacy Metrics (dytallix_ prefix)

These metrics are maintained for backward compatibility:

| Metric | Type | Description |
|--------|------|-------------|
| `dytallix_total_blocks` | Counter | Total blocks produced |
| `dytallix_total_transactions` | Counter | Total transactions processed |
| `dytallix_mempool_admitted_total` | Counter | Transactions admitted to mempool |
| `dytallix_mempool_rejected_total` | Counter | Transactions rejected (with reason) |
| `dytallix_oracle_latency_seconds` | Histogram | Legacy oracle latency metric |
| `dytallix_emission_pool_size` | Gauge | Legacy emission pool size |

### Process/Runtime Metrics

Standard Prometheus process metrics are automatically included:

- `process_memory_bytes` - Process memory usage
- `process_cpu_seconds_total` - CPU time consumed
- `process_open_fds` - Open file descriptors
- `process_start_time_seconds` - Process start time

## Setup Instructions

### 1. Enable Metrics in Node Configuration

Metrics are controlled by the `metrics` feature flag and environment variables:

```bash
# Enable metrics collection
export DY_METRICS=1

# Configure metrics server address (default: 0.0.0.0:9464)
export DY_METRICS_ADDR="127.0.0.1:9464"
```

### 2. Build with Metrics Support

```bash
cd dytallix-lean-launch/node
cargo build --release --features metrics
```

### 3. Start Node with Metrics

```bash
# Using environment variables
DY_METRICS=1 ./target/release/dytallix-lean-node

# Using CLI flags (when supported)
./target/release/dytallix-lean-node --enable-metrics --metrics-addr 127.0.0.1:9464
```

### 4. Deploy Testnet with Observability

The deployment script automatically allocates metrics ports and enables health checks:

```bash
# Enable observability during testnet deployment
ENABLE_OBSERVABILITY=1 ./deploy-testnet.sh
```

This will:
- Allocate unique metrics ports for each validator (9464 + index)
- Start the observability stack
- Verify metrics endpoints are healthy before declaring network ready

## Configuration

### Prometheus Configuration

The Prometheus configuration (`observability/prometheus/prometheus.yml`) includes:

- 15-second scrape intervals for real-time monitoring
- Automatic discovery of all validator endpoints
- Proper relabeling for validator identification
- Integration with alerting rules

### Grafana Dashboards

Four main dashboards are provided:

1. **Explorer Dashboard** (`explorer.json`)
   - Block height and production rate
   - Blocks produced by validator
   - Transaction distribution

2. **Transactions Dashboard** (`transactions.json`)
   - TPS monitoring
   - Mempool size and operations
   - Gas usage analysis

3. **Validators Dashboard** (`validators.json`)
   - Validator voting power
   - Missed blocks tracking
   - Uptime monitoring

4. **Emissions Dashboard** (`emissions.json`)
   - Emission pool amounts by type
   - Oracle update latency
   - Update rates

### Alert Rules

Critical alerts are defined in `observability/prometheus/alerts/core-rules.yml`:

#### BlockProductionStall
- **Condition**: No block height increase for 120 seconds
- **Severity**: Critical
- **Description**: Indicates potential network halt or consensus failure

#### HighProcessMemory
- **Condition**: Process memory > 85% of container limit
- **Severity**: Warning
- **Description**: Memory pressure that could impact performance

#### ValidatorMissedBlocks
- **Condition**: More than 5 missed blocks in 10 minutes
- **Severity**: Warning
- **Description**: Validator performance degradation

#### ValidatorDown
- **Condition**: Validator unreachable for 2 minutes
- **Severity**: Critical
- **Description**: Validator node failure

#### LowTPS (Optional)
- **Condition**: Average TPS below threshold for 10 minutes
- **Severity**: Warning
- **Description**: Network throughput degradation (commented out by default)

## Testing and Validation

### Metrics Endpoint Test

Verify metrics are exposed correctly:

```bash
# Check metrics endpoint
curl http://localhost:9464/metrics

# Verify specific metrics are present
curl -s http://localhost:9464/metrics | grep -E "dyt_(block_height|tps|mempool_size)"
```

### Alert Testing

Use the provided script to test alert functionality:

```bash
# Test ValidatorDown alert (halts validator 0 for 30 seconds)
./scripts/induce_validator_halt.sh 0 30

# Test with longer duration to trigger BlockProductionStall
./scripts/induce_validator_halt.sh 1 150 "production-stall-test"
```

### Load Testing

Generate transaction load to test TPS and mempool metrics:

```bash
# Example load test (implementation depends on your transaction tools)
for i in {1..1000}; do
    # Submit transaction
    curl -X POST http://localhost:3030/submit -d '{"transaction": "..."}'
done
```

## 48-Hour Soak Testing

### Preparation

1. Enable observability and start the full stack
2. Deploy a stable testnet configuration
3. Configure alerting endpoints (webhook, email, etc.)
4. Set up log retention for the duration

### Running the Soak Test

```bash
# Start soak test
export ENABLE_OBSERVABILITY=1
./deploy-testnet.sh

# Monitor for 48 hours
./scripts/run_observability_stack.sh logs
```

### Soak Test Metrics Collection

Key metrics to monitor during the 48-hour run:

- **Stability**: Block production continuity
- **Performance**: TPS consistency and latency
- **Resource Usage**: Memory and CPU trends
- **Error Rates**: Failed transactions and missed blocks
- **Alert Frequency**: Number and types of alerts triggered

### Soak Test Report

Results should be documented in `reports/soak/soak_48h_summary.md` with:

- Test configuration and duration
- Performance metrics and trends
- Alert summary and resolution times
- Resource usage analysis
- Issues identified and fixes applied

## Adding New Metrics

### 1. Define the Metric

Add to the Metrics struct in `dytallix-lean-launch/node/src/metrics.rs`:

```rust
// In the struct definition
pub my_new_metric: IntCounter,

// In the new() method
let my_new_metric = IntCounter::with_opts(Opts::new(
    "dyt_my_new_metric_total",
    "Description of my new metric"
))?;
registry.register(Box::new(my_new_metric.clone()))?;

// In the constructor
my_new_metric,
```

### 2. Add Instrumentation

Call the metric from your code:

```rust
// Increment counter
metrics.my_new_metric.inc();

// Set gauge value  
metrics.my_gauge_metric.set(value as i64);

// Observe histogram
metrics.my_histogram_metric.observe(duration.as_secs_f64());
```

### 3. Update Documentation

- Add the metric to this documentation
- Update any relevant dashboards
- Consider adding alerts if appropriate

### 4. Update Tests

Add test coverage for the new metric:

```rust
#[cfg(feature = "metrics")]
#[tokio::test]
async fn test_my_new_metric() {
    let metrics = Metrics::new().expect("Failed to create metrics");
    metrics.my_new_metric.inc();
    assert_eq!(metrics.my_new_metric.get(), 1);
}
```

## Security Considerations

### Network Binding

**Production Recommendation**: Bind metrics endpoints to localhost only and use a reverse proxy:

```bash
# Secure local binding
export DY_METRICS_ADDR="127.0.0.1:9464"
```

### Reverse Proxy Setup

Example nginx configuration:

```nginx
server {
    listen 9464;
    server_name your-node-domain.com;
    
    location /metrics {
        proxy_pass http://127.0.0.1:9464/metrics;
        proxy_set_header Host $host;
        
        # Optional: Add basic auth
        auth_basic "Dytallix Metrics";
        auth_basic_user_file /etc/nginx/.htpasswd;
    }
}
```

### Firewall Configuration

Ensure only authorized Prometheus servers can access metrics endpoints:

```bash
# Allow specific Prometheus server
sudo ufw allow from PROMETHEUS_IP to any port 9464
```

### Data Privacy

- Metrics do not contain sensitive transaction data
- Validator labels use public identifiers only
- Consider data retention policies for long-term storage

## Performance Considerations

### Metrics Collection Overhead

- Metrics are designed for minimal performance impact
- Histograms have configurable buckets to balance detail vs. overhead
- When disabled (default), metrics collection has zero performance impact

### Detailed Metrics Control

For high-throughput environments, detailed histograms can be disabled:

```bash
# Disable detailed histogram observations
export METRICS_DETAILED=0
```

This disables:
- Transaction processing time histograms
- Gas usage per block histograms  
- Oracle latency detailed tracking

### Label Cardinality

- Validator labels are limited to active validator set
- Avoid high-cardinality labels (like transaction hashes)
- Monitor Prometheus memory usage with many validators

## Troubleshooting

### Metrics Not Appearing

1. **Check feature flag**: Ensure metrics feature is enabled during build
2. **Verify configuration**: Check `DY_METRICS=1` is set
3. **Check endpoint**: Verify metrics server is listening on expected port
4. **Review logs**: Look for metrics initialization errors

### High Memory Usage

1. **Check retention**: Prometheus retention settings in configuration
2. **Review cardinality**: High-cardinality labels can cause memory issues
3. **Monitor scrape frequency**: Reduce scrape interval if needed

### Missing Alerts

1. **Verify rules**: Check alert rules syntax with `promtool check rules`
2. **Check evaluation**: Ensure rules are being evaluated in Prometheus
3. **Review thresholds**: Alert thresholds may need tuning for your environment

### Dashboard Issues

1. **Data source**: Verify Grafana is connected to Prometheus
2. **Query syntax**: Check PromQL queries in dashboard panels
3. **Time range**: Ensure sufficient data exists for the selected time range

## CI/CD Integration

### Automated Validation

The observability CI workflow (`.github/workflows/observability-lint.yml`) validates:

- JSON syntax in Grafana dashboards
- Prometheus configuration syntax
- Alert rule syntax
- Documentation completeness

### Metrics Testing

Include metrics tests in your CI pipeline:

```bash
# Build with metrics
cargo test --features metrics

# Validate observability configs
./scripts/validate_observability_configs.sh
```

## Support and Maintenance

### Regular Tasks

- **Weekly**: Review alert thresholds and tune as needed
- **Monthly**: Update dashboard queries and add new panels
- **Quarterly**: Review metric retention and storage requirements

### Monitoring the Monitoring

- Set up alerts for Prometheus itself (disk space, scrape failures)
- Monitor Grafana performance and dashboard load times
- Regularly backup dashboard configurations and alert rules

### Updates and Versioning

- Track dashboard versions using UID fields
- Version alert rules with deployment automation
- Document metric schema changes and deprecations

## Best Practices

### Metric Naming

- Use consistent prefixes (`dyt_` for core metrics)
- Include units in metric names when relevant (e.g., `_seconds`, `_bytes`)
- Use descriptive help text for all metrics

### Dashboard Design

- Group related metrics logically
- Use appropriate visualization types (gauge, graph, heatmap)
- Include relevant time ranges and refresh rates
- Add helpful annotations and thresholds

### Alert Configuration

- Set meaningful thresholds based on baseline measurements
- Include actionable information in alert descriptions
- Configure appropriate notification channels
- Test alerts regularly to ensure they work as expected

### Documentation

- Keep this guide updated with new metrics and changes
- Document alert runbooks for operations teams
- Maintain examples and troubleshooting guides
- Include performance baselines and expected ranges

---

For additional support or questions about the observability stack, please refer to the project documentation or open an issue in the repository.