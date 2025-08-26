# Dytallix Observability Guide

This document provides comprehensive instructions for setting up and using the Dytallix blockchain observability stack, including Prometheus metrics, Grafana dashboards, alerting, and monitoring best practices.

## Overview

The Dytallix observability stack provides deep insights into blockchain performance, transaction processing, validator behavior, and system health. The monitoring system is designed to:

- Have zero performance impact when disabled (default)
- Provide comprehensive metrics for production monitoring  
- Integrate seamlessly with existing Prometheus/Grafana stacks
- Support alerting for critical blockchain events
- Enable comprehensive testing and analysis

## Quick Start

### Enable Observability

Set the environment variable to enable observability:

```bash
export ENABLE_METRICS=true
```

### Start the Observability Stack

```bash
# Start the complete stack with observability
docker-compose up -d

# Or use the observability-specific script
./scripts/run_observability_stack.sh start
```

### Access Monitoring Services

- **Grafana Dashboards**: http://localhost:3003 (admin/dytallix123)
- **Prometheus**: http://localhost:9090
- **Node Exporter**: http://localhost:9100

## Metrics Inventory

### Core Blockchain Metrics (dyt_ prefix)

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `dyt_blocks_produced_total` | Counter | chain_id, moniker | Total blocks produced by each validator |
| `dyt_block_time_seconds` | Histogram | chain_id | Block processing time per block |
| `dyt_block_last_time_seconds` | Gauge | - | Last block unix timestamp |
| `dyt_txs_processed_total` | Counter | - | Total transactions processed (chain-wide TPS base) |
| `dyt_mempool_size` | Gauge | - | Current number of pending transactions |
| `dyt_oracle_request_latency_seconds` | Histogram | source | Oracle request latency |
| `dyt_emission_pool_balance` | Gauge | pool | Current emission pool balances |
| `dyt_validator_missed_blocks_total` | Counter | validator | Blocks missed by each validator |
| `dyt_validator_voting_power` | Gauge | validator | Current voting power of validators |

### Service-Specific Metrics

#### Faucet Metrics
- `dyt_faucet_requests_total` - Counter with status label
- `dyt_faucet_tx_latency_seconds` - Histogram for transaction processing time

#### Explorer/API Metrics  
- `dyt_api_request_duration_seconds` - Histogram with route, method, status labels
- `dyt_explorer_requests_total` - Counter with endpoint, status labels

### System Metrics
- Standard node-exporter metrics for system monitoring
- Memory, CPU, disk, network metrics automatically collected

## Setup Instructions

### Local Development

1. **Enable metrics in services:**
   ```bash
   export ENABLE_METRICS=true
   ```

2. **Start the stack:**
   ```bash
   docker-compose up -d
   ```

3. **Verify metrics endpoints:**
   ```bash
   # Node metrics (if running)
   curl http://localhost:26680/metrics
   
   # Faucet metrics
   curl http://localhost:9101/metrics
   
   # Explorer metrics  
   curl http://localhost:9102/metrics
   ```

### Production Deployment

1. **Hetzner deployment:**
   ```bash
   cd deployment/hetzner
   ./scripts/deploy.sh
   ```

2. **Update environment variables:**
   ```bash
   ENABLE_METRICS=true
   GRAFANA_ADMIN_PASSWORD=<secure-password>
   ```

## Configuration

### Prometheus Configuration

Located at `monitoring/prometheus.yml`:
- **Scrape interval**: 5s for blockchain metrics, 15s for system metrics  
- **Retention**: 200 hours default
- **Alert rules**: `monitoring/alerts.yml`

### Grafana Dashboards

Three main dashboards are auto-provisioned:

1. **validators.json** - Validator performance and missed blocks
2. **emissions.json** - Emission pool balances and rewards
3. **explorer.json** - Network TPS, API latency, mempool size

### Alert Rules

Key alerts configured:
- **BlockProductionStall**: No blocks >30s (CRITICAL)
- **ValidatorOffline**: Missed blocks detected (WARNING)  
- **HighMemoryUsage**: >85% memory usage (WARNING)
- **OracleLatencyHigh**: >1s p95 latency (WARNING)

## Testing and Validation

### Metrics Validation

```bash
# Run metrics linting
make lint-metrics

# Test metrics endpoints
curl -f http://localhost:9090/targets  # Prometheus targets
curl -f http://localhost:9101/metrics  # Faucet metrics
curl -f http://localhost:9102/metrics  # Explorer metrics
```

### Alert Testing

1. **Test block production stall:**
   ```bash
   # Stop the node to trigger alert
   docker-compose stop dytallix-node
   # Wait 40s, check Prometheus alerts page
   ```

2. **Test memory usage alert:**
   ```bash
   # Temporarily lower threshold for testing
   # Edit monitoring/alerts.yml: change 0.85 to 0.01
   # Reload Prometheus config
   curl -X POST http://localhost:9090/-/reload
   ```

### Dashboard Verification

1. Open Grafana: http://localhost:3003
2. Login: admin/dytallix123  
3. Navigate to dashboards - should auto-load without manual import
4. Verify data appears in panels (may show empty initially until metrics accumulate)

## Adding New Metrics

### Rust Node Metrics

1. **Add to metrics struct:**
   ```rust
   pub dyt_new_metric: IntCounter,
   ```

2. **Initialize in `new()` function:**
   ```rust
   let dyt_new_metric = IntCounter::with_opts(Opts::new(
       "dyt_new_metric",
       "Description of new metric"
   ))?;
   registry.register(Box::new(dyt_new_metric.clone()))?;
   ```

3. **Add to struct initialization:**
   ```rust
   Ok(Self {
       // ... other fields
       dyt_new_metric,
   })
   ```

### Node.js Service Metrics

1. **Add to metrics object:**
   ```javascript
   newMetric: new prometheus.Counter({
     name: 'dyt_new_metric',
     help: 'Description of new metric',
     registers: [register]
   })
   ```

2. **Use in code:**
   ```javascript
   if (metricsEnabled) {
     faucetMetrics.newMetric.inc();
   }
   ```

## Security Considerations

- Metrics endpoints exposed only on designated ports
- No sensitive data included in metric labels
- Rate limiting applied to prevent metric scraping abuse
- Grafana admin password should be changed from default

## Performance Considerations

- Zero impact when `ENABLE_METRICS=false`
- Minimal overhead when enabled (~1-2% CPU)
- Avoid high-cardinality labels (no per-address/tx-id metrics)
- Prometheus retention configured for reasonable disk usage

## Troubleshooting

### Common Issues

1. **Metrics not appearing:**
   - Verify `ENABLE_METRICS=true`
   - Check service logs for errors
   - Verify network connectivity between Prometheus and targets

2. **Dashboards empty:**
   - Wait for metrics to accumulate (5-10 minutes)
   - Check Prometheus targets page for UP status
   - Verify datasource configuration in Grafana

3. **Alerts not firing:**
   - Check alert rule syntax in Prometheus  
   - Verify metric names match exactly
   - Check evaluation intervals

### Debug Commands

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check specific metric
curl -s http://localhost:9090/api/v1/query?query=dyt_block_height

# View Prometheus config
curl http://localhost:9090/api/v1/status/config

# Reload Prometheus config
curl -X POST http://localhost:9090/-/reload
```

## Best Practices

1. **Metric Naming**: Always use `dyt_` prefix for Dytallix-specific metrics
2. **Labels**: Include relevant labels but avoid high cardinality
3. **Documentation**: Update this guide when adding new metrics
4. **Testing**: Always test alerts under controlled conditions
5. **Monitoring**: Set up monitoring for the monitoring stack itself

## Support and Maintenance

- **Config location**: `monitoring/` directory
- **Grafana dashboards**: Auto-provisioned, no manual import needed
- **Alert rules**: Defined in `monitoring/alerts.yml`
- **Metrics validation**: Run `make lint-metrics` before deployment

For issues or enhancements, refer to the project's issue tracker or documentation.