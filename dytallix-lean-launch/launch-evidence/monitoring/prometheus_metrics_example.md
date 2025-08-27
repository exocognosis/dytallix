# Dytallix Prometheus Metrics Documentation

This document outlines the Prometheus metrics expected by the Grafana dashboard and monitoring system.

## Overview

The Dytallix monitoring system relies on specific Prometheus metrics exported by the blockchain node and API services. These metrics provide insight into network health, performance, and operational status.

## Required Metrics

### Core Blockchain Metrics

#### `dyt_block_height`
- **Type**: Gauge
- **Description**: Current blockchain block height
- **Labels**: None
- **Example**: `dyt_block_height 12345`
- **Usage**: Track blockchain progress and detect stalling

#### `dyt_tps`
- **Type**: Gauge  
- **Description**: Current transactions per second throughput
- **Labels**: None
- **Example**: `dyt_tps 175.5`
- **Usage**: Monitor network transaction capacity and performance

#### `dyt_blocks_per_second`
- **Type**: Gauge
- **Description**: Rate of block production
- **Labels**: None
- **Example**: `dyt_blocks_per_second 0.25`
- **Usage**: Track block production rate and consensus health

#### `dyt_mempool_size`
- **Type**: Gauge
- **Description**: Number of pending transactions in mempool
- **Labels**: None
- **Example**: `dyt_mempool_size 250`
- **Usage**: Monitor network congestion and capacity

#### `dyt_gas_used_per_block`
- **Type**: Gauge
- **Description**: Gas used in the latest block
- **Labels**: None
- **Example**: `dyt_gas_used_per_block 21000000`
- **Usage**: Track resource utilization and block capacity

### Validator Metrics

#### `dyt_validator_voting_power`
- **Type**: Gauge
- **Description**: Voting power of each validator
- **Labels**: `validator` (validator identifier)
- **Example**: `dyt_validator_voting_power{validator="validator-1"} 1000`
- **Usage**: Monitor validator participation and network decentralization

#### `dyt_validator_missed_blocks_total`
- **Type**: Counter
- **Description**: Total number of blocks missed by each validator
- **Labels**: `validator` (validator identifier)
- **Example**: `dyt_validator_missed_blocks_total{validator="validator-1"} 5`
- **Usage**: Track validator reliability and uptime

### API Performance Metrics

#### `dytallix_api_request_duration_seconds_bucket`
- **Type**: Histogram
- **Description**: API request duration histogram for calculating latency percentiles
- **Labels**: `method`, `endpoint`, `status_code`, `le` (bucket upper bound)
- **Example**: `dytallix_api_request_duration_seconds_bucket{method="GET",endpoint="/api/blocks",status_code="200",le="0.1"} 100`
- **Usage**: Calculate P50, P95, P99 latency for API performance monitoring

#### `dytallix_api_requests_total`
- **Type**: Counter
- **Description**: Total number of API requests
- **Labels**: `method`, `endpoint`, `status_code`
- **Example**: `dytallix_api_requests_total{method="GET",endpoint="/api/blocks",status_code="200"} 1000`
- **Usage**: Track API usage patterns and error rates

## Metrics Exporter Implementation

### Basic Python Exporter Example

```python
#!/usr/bin/env python3
"""
Simple Prometheus metrics exporter for Dytallix node
"""

import time
import random
from prometheus_client import start_http_server, Gauge, Counter, Histogram, generate_latest

# Define metrics
block_height = Gauge('dyt_block_height', 'Current blockchain block height')
tps = Gauge('dyt_tps', 'Current transactions per second')
blocks_per_second = Gauge('dyt_blocks_per_second', 'Rate of block production')
mempool_size = Gauge('dyt_mempool_size', 'Number of pending transactions')
gas_used = Gauge('dyt_gas_used_per_block', 'Gas used in latest block')

validator_voting_power = Gauge('dyt_validator_voting_power', 
                               'Voting power of each validator', 
                               ['validator'])

api_duration = Histogram('dytallix_api_request_duration_seconds',
                        'API request duration',
                        ['method', 'endpoint', 'status_code'])

api_requests = Counter('dytallix_api_requests_total',
                      'Total API requests',
                      ['method', 'endpoint', 'status_code'])

def collect_blockchain_metrics():
    """Collect metrics from blockchain node"""
    # In production, these would connect to actual node APIs
    block_height.set(12000 + random.randint(0, 100))
    tps.set(random.uniform(50, 200))
    blocks_per_second.set(random.uniform(0.2, 0.3))
    mempool_size.set(random.randint(100, 500))
    gas_used.set(random.randint(15000000, 25000000))
    
    # Validator metrics
    validators = ['validator-1', 'validator-2', 'validator-3']
    for validator in validators:
        validator_voting_power.labels(validator=validator).set(
            random.randint(800, 1200)
        )

def simulate_api_metrics():
    """Simulate API request metrics"""
    endpoints = ['/api/blocks', '/api/transactions', '/api/accounts']
    methods = ['GET', 'POST']
    
    for endpoint in endpoints:
        for method in methods:
            # Simulate request latency
            latency = random.uniform(0.01, 0.5)
            api_duration.labels(
                method=method, 
                endpoint=endpoint, 
                status_code='200'
            ).observe(latency)
            
            # Increment request counter
            api_requests.labels(
                method=method,
                endpoint=endpoint, 
                status_code='200'
            ).inc()

if __name__ == '__main__':
    # Start metrics server on port 9090
    start_http_server(9090)
    print("Metrics server started on port 9090")
    
    while True:
        collect_blockchain_metrics()
        simulate_api_metrics()
        time.sleep(10)  # Update every 10 seconds
```

### Integration with Existing Dytallix Node

The existing Dytallix node already exports many of these metrics through the Rust metrics implementation in `dytallix-lean-launch/node/src/metrics.rs`. The metrics can be accessed via the `/metrics` endpoint when the metrics feature is enabled.

Key integration points:

1. **Enable Metrics Feature**: Compile with `--features metrics`
2. **Start Metrics Server**: Configure metrics endpoint in node configuration
3. **Prometheus Scraping**: Configure Prometheus to scrape the node's `/metrics` endpoint

Example Prometheus configuration:

```yaml
scrape_configs:
  - job_name: 'dytallix-node'
    static_configs:
      - targets: ['localhost:9090']
    scrape_interval: 10s
    metrics_path: /metrics
```

## Dashboard Validation

To validate the Grafana dashboard loads correctly:

1. Start Prometheus with the metrics endpoints configured
2. Import the `grafana_dashboard.json` into Grafana
3. Verify all panels display data without errors
4. Test alert rules by simulating threshold conditions

## Alert Configuration

The dashboard includes three main alert rules:

1. **Validator Downtime**: Triggers when no new blocks for 5+ minutes
2. **High Mempool**: Triggers when mempool exceeds 5000 transactions
3. **API Latency**: Triggers when P95 latency exceeds 1 second

Each alert includes:
- Clear trigger conditions
- Appropriate severity levels
- Runbook references
- Team assignments

## Production Considerations

For production deployment:

1. **Metric Retention**: Configure appropriate retention policies in Prometheus
2. **High Availability**: Deploy Prometheus and Grafana in HA configurations  
3. **Security**: Secure metrics endpoints with authentication
4. **Alerting**: Configure AlertManager with proper notification channels
5. **Backup**: Regular backups of Grafana dashboards and Prometheus data

## Testing

Use the provided `alert_test.log` to validate alert functionality:

```bash
# Simulate high mempool size
# (In production, this would be done by actual load)
curl -X POST localhost:9090/api/v1/admin/tsdb/snapshot

# Check alert status
curl localhost:9093/api/v1/alerts
```