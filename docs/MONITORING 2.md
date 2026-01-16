# Dytallix Node Monitoring Guide

This document provides comprehensive instructions for setting up and using the Dytallix node observability stack.

## Overview

The Dytallix node includes optional Prometheus metrics export capabilities that provide deep insights into blockchain performance, transaction processing, and system health. This monitoring system is designed to:

- Have zero performance impact when disabled (default)
- Provide comprehensive metrics for production monitoring
- Integrate seamlessly with existing Prometheus/Grafana stacks
- Support alerting for critical blockchain events

## Enabling Metrics

### Command Line Flags

```bash
# Enable metrics with default settings
./dytallix-lean-node --enable-metrics

# Enable metrics with custom listen address
./dytallix-lean-node --enable-metrics --metrics-addr "127.0.0.1:9464"
```

### Environment Variables

```bash
# Enable metrics
export DY_METRICS=1

# Configure listen address (optional)
export DY_METRICS_ADDR="0.0.0.0:9464"

# Start the node
./dytallix-lean-node
```

### Default Configuration

- **Default State**: Disabled (zero overhead)
- **Default Port**: 9464
- **Default Address**: 0.0.0.0:9464
- **Metrics Format**: Prometheus text exposition format

## Security Considerations

### Network Binding

**Production Recommendation**: Bind to localhost only and use a reverse proxy:

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

Ensure only authorized Prometheus servers can access the metrics endpoint:

```bash
# Allow specific Prometheus server
sudo ufw allow from PROMETHEUS_IP to any port 9464
```

## Prometheus Configuration

### Basic Scrape Configuration

Add this job to your `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'dytallix-node'
    static_configs:
      - targets: ['localhost:9464']
    metrics_path: '/metrics'
    scrape_interval: 5s
    scrape_timeout: 4s
```

### Multi-Node Configuration

For multiple nodes:

```yaml
scrape_configs:
  - job_name: 'dytallix-nodes'
    static_configs:
      - targets:
        - 'node1.example.com:9464'
        - 'node2.example.com:9464'
        - 'node3.example.com:9464'
    metrics_path: '/metrics'
    scrape_interval: 5s
```

### Loading Alert Rules

Include the alert rules in your Prometheus configuration:

```yaml
rule_files:
  - "dytallix-alerts.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

## Available Metrics

### Block Metrics

| Metric Name | Type | Description |
|-------------|------|-------------|
| `dytallix_total_blocks` | Counter | Total number of blocks produced |
| `dytallix_current_block_height` | Gauge | Current blockchain height |
| `dytallix_block_processing_seconds` | Histogram | Time spent processing blocks |

### Transaction Metrics

| Metric Name | Type | Description |
|-------------|------|-------------|
| `dytallix_total_transactions` | Counter | Total number of transactions processed |
| `dytallix_mempool_size` | Gauge | Current number of pending transactions |
| `dytallix_transaction_processing_seconds` | Histogram | Individual transaction processing time |

### Gas Metrics

| Metric Name | Type | Description |
|-------------|------|-------------|
| `dytallix_total_gas_used` | Counter | Cumulative gas consumed |
| `dytallix_current_block_gas` | Gauge | Gas used in current block |

### Oracle Metrics

| Metric Name | Type | Description |
|-------------|------|-------------|
| `dytallix_oracle_latency_seconds` | Histogram | Oracle update end-to-end latency |
| `dytallix_last_oracle_update_timestamp` | Gauge | Timestamp of last oracle update |

### Emission Metrics

| Metric Name | Type | Description |
|-------------|------|-------------|
| `dytallix_emission_pool_size` | Gauge | Current total emission pool size |

### Build Information

| Metric Name | Type | Description |
|-------------|------|-------------|
| `dytallix_build_info` | Gauge | Build information with version labels |

## Grafana Integration

### Importing Dashboards

1. Copy the dashboard JSON files from `configs/grafana_dashboards/`
2. In Grafana, go to "+" → "Import"
3. Upload the JSON file or paste the content
4. Configure the Prometheus datasource

### Dashboard Overview

**Node Overview Dashboard** (`node_overview.json`) includes:

- Block production rate (blocks/minute)
- Transaction throughput (TPS)
- Mempool size over time
- Gas usage patterns
- Oracle latency percentiles
- Emission pool status
- Block processing performance
- Current blockchain height

### Custom Queries

#### Calculate TPS (Transactions Per Second)
```promql
rate(dytallix_total_transactions[5m]) * 60
```

#### Block Production Rate
```promql
rate(dytallix_total_blocks[5m]) * 60
```

#### Oracle Latency 95th Percentile
```promql
histogram_quantile(0.95, rate(dytallix_oracle_latency_seconds_bucket[5m]))
```

## Alerting

### Available Alerts

The provided alert rules (`configs/prometheus/alerts.yml`) include:

1. **TPSDrop**: Transaction rate below 50 TPS for 10 minutes
2. **OracleLatencyHigh**: 95th percentile oracle latency > 5 seconds
3. **BlocksHalted**: No blocks produced for 3 minutes (CRITICAL)
4. **MempoolFull**: Mempool size approaching capacity
5. **BlockProcessingTooSlow**: Block processing > 30 seconds
6. **MetricsDown**: Metrics endpoint unreachable (CRITICAL)
7. **EmissionPoolLow**: Emission pool below threshold
8. **HighGasUsage**: Elevated gas consumption
9. **OracleStale**: Oracle data not updated for 1 hour

### Customizing Alert Thresholds

Edit `configs/prometheus/alerts.yml` to adjust thresholds:

```yaml
# Example: Adjust TPS threshold
- alert: DytallixTPSDrop
  expr: rate(dytallix_total_transactions[5m]) * 60 < 100  # Changed from 50 to 100
  for: 5m  # Changed from 10m to 5m
```

### Alert Notification Setup

Configure Alertmanager for notifications:

```yaml
# alertmanager.yml
route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
- name: 'web.hook'
  slack_configs:
  - api_url: 'YOUR_SLACK_WEBHOOK_URL'
    channel: '#blockchain-alerts'
    title: 'Dytallix Alert'
    text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

## Performance Monitoring

### Key Performance Indicators (KPIs)

Monitor these critical metrics for optimal performance:

1. **Block Time**: Target < 2 seconds average
2. **TPS**: Monitor transaction throughput trends
3. **Mempool Size**: Should not consistently max out
4. **Oracle Latency**: Keep under 1 second for 95th percentile
5. **Gas Efficiency**: Monitor gas usage patterns

### Capacity Planning

Use these metrics for scaling decisions:

```promql
# Average block size over time
increase(dytallix_total_transactions[1h]) / increase(dytallix_total_blocks[1h])

# Memory pool utilization trend
avg_over_time(dytallix_mempool_size[1h])

# Processing efficiency
rate(dytallix_total_transactions[5m]) / rate(dytallix_total_blocks[5m])
```

## Extending Metrics

### Adding Custom Metrics

When adding new metrics to the codebase, follow these guidelines:

#### Naming Convention
- Use `dytallix_` prefix for all metrics
- Use snake_case for metric names
- Include units in the name when applicable (e.g., `_seconds`, `_bytes`)

#### Metric Types
- **Counters**: For cumulative values (transactions, blocks, errors)
- **Gauges**: For current values (mempool size, pool balances)
- **Histograms**: For timing and size distributions

#### Help Strings
Always provide descriptive help strings:

```rust
let custom_metric = IntCounter::with_opts(Opts::new(
    "dytallix_custom_operations",
    "Total number of custom operations performed"
))?;
```

#### Labels
Minimize label cardinality to avoid performance issues:

```rust
// Good: Low cardinality
let metric = IntCounterVec::new(
    Opts::new("dytallix_requests", "HTTP requests"),
    &["method", "status"]
)?;

// Avoid: High cardinality
// Don't use user IDs, transaction hashes, or other high-cardinality values as labels
```

### Integration Points

Add metrics collection at these key points:

1. **State Changes**: Database writes, balance updates
2. **Network Events**: Peer connections, message processing
3. **Consensus**: Validator actions, voting
4. **Smart Contracts**: Execution times, gas usage
5. **External APIs**: Bridge operations, oracle updates

## Troubleshooting

### Common Issues

#### Metrics Not Available
```bash
# Check if metrics feature is enabled
./dytallix-lean-node --help | grep metrics

# Verify environment variables
env | grep DY_METRICS

# Test metrics endpoint
curl http://localhost:9464/metrics
```

#### High Memory Usage
Monitor these metrics for memory consumption:
- Increase in scrape duration
- Large metric cardinality
- Histogram bucket explosion

#### Network Issues
```bash
# Verify port binding
netstat -tlnp | grep 9464

# Check firewall rules
sudo ufw status

# Test connectivity
telnet node-ip 9464
```

### Log Analysis

Enable debug logging for metrics troubleshooting:

```bash
export RUST_LOG=dytallix_lean_node::metrics=debug
./dytallix-lean-node --enable-metrics
```

## Best Practices

### Production Deployment

1. **Security First**: Always bind metrics to localhost in production
2. **Resource Limits**: Monitor Prometheus server resources
3. **Data Retention**: Configure appropriate retention policies
4. **Backup**: Include Grafana configurations in backup procedures

### Monitoring Strategy

1. **Layered Alerts**: Use both warning and critical severity levels
2. **Runbooks**: Create response procedures for each alert
3. **Regular Review**: Periodically review and tune alert thresholds
4. **Testing**: Test alert conditions in staging environments

### Performance Optimization

1. **Scrape Frequency**: Balance between granularity and overhead
2. **Metric Selection**: Only collect metrics you actively monitor
3. **Label Hygiene**: Avoid high-cardinality labels
4. **Dashboard Optimization**: Use efficient queries and appropriate time ranges

## Support and Updates

### Version Compatibility

| Node Version | Metrics Version | Grafana Version | Prometheus Version |
|--------------|-----------------|-----------------|-------------------|
| 0.1.0        | 1.0.0          | 8.0+           | 2.30+             |

### Getting Help

For monitoring-related issues:

1. Check the [troubleshooting section](#troubleshooting)
2. Review Prometheus and Grafana logs
3. Verify network connectivity and permissions
4. Consult the community forums for configuration examples

### Contributing

To contribute improvements to the monitoring stack:

1. Follow the [extending metrics guidelines](#extending-metrics)
2. Test with both metrics enabled and disabled
3. Update documentation for new metrics
4. Include alert rules for critical new metrics