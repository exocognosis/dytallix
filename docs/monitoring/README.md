# Dytallix Testnet Monitoring and Alerting System

## Overview

This document describes the production-ready monitoring and alerting system for the Dytallix testnet. The system provides comprehensive monitoring of blockchain nodes, system resources, and application metrics with automated alerting via Slack and email.

## Architecture

The monitoring stack consists of:

- **Prometheus**: Metrics collection and alerting engine
- **Grafana**: Visualization and dashboards
- **Alertmanager**: Alert routing and notification management
- **Loki**: Log aggregation and analysis
- **Promtail**: Log collection agent
- **Node Exporter**: System metrics collection

## Components and Ports

### Service Endpoints

| Service | Port | Description | Access URL |
|---------|------|-------------|------------|
| Prometheus | 9093 | Metrics collection and alerting | http://localhost:9093 |
| Grafana | 3000 | Dashboards and visualization | http://localhost:3000 |
| Alertmanager | 9094 | Alert management | http://localhost:9094 |
| Loki | 3100 | Log aggregation | http://localhost:3100 |
| Node Exporter 1 | 9100 | System metrics (Node 1) | http://localhost:9100/metrics |
| Node Exporter 2 | 9101 | System metrics (Node 2) | http://localhost:9101/metrics |
| Node Exporter 3 | 9102 | System metrics (Node 3) | http://localhost:9102/metrics |

### Dytallix Node Endpoints

| Node | API Port | Metrics Port | Health Port | P2P Port |
|------|----------|--------------|-------------|----------|
| Node 1 | 3030 | 9090 | 8081 | 30303 |
| Node 2 | 3032 | 9091 | 8083 | 30304 |
| Node 3 | 3034 | 9092 | 8085 | 30305 |

## Metrics and Data Sources

### Blockchain Metrics

| Metric Name | Description | Type | Labels |
|-------------|-------------|------|--------|
| `dytallix_block_height` | Current block height | Gauge | instance, node_id |
| `dytallix_transactions_total` | Total transactions processed | Counter | instance, type |
| `dytallix_transaction_queue_size` | Current transaction queue size | Gauge | instance |
| `dytallix_peer_count` | Number of connected peers | Gauge | instance |
| `dytallix_sync_status` | Node synchronization status (0=out of sync, 1=synced) | Gauge | instance |
| `dytallix_contracts_deployed_total` | Total smart contracts deployed | Counter | instance |
| `dytallix_errors_total` | Total application errors | Counter | instance, type |
| `dytallix_api_request_duration_seconds` | API request duration histogram | Histogram | instance, method, endpoint |

### Post-Quantum Cryptography Metrics

| Metric Name | Description | Type | Labels |
|-------------|-------------|------|--------|
| `dytallix_pqc_operation_duration_seconds` | PQC operation duration histogram | Histogram | instance, operation |
| `dytallix_pqc_key_generation_failures_total` | PQC key generation failures | Counter | instance, algorithm |
| `dytallix_pqc_signature_operations_total` | PQC signature operations | Counter | instance, algorithm |
| `dytallix_pqc_verification_operations_total` | PQC verification operations | Counter | instance, algorithm |

### System Metrics (via Node Exporter)

| Metric Name | Description | Type |
|-------------|-------------|------|
| `node_cpu_seconds_total` | CPU time spent in each mode | Counter |
| `node_memory_MemTotal_bytes` | Total memory | Gauge |
| `node_memory_MemAvailable_bytes` | Available memory | Gauge |
| `node_filesystem_size_bytes` | Filesystem size | Gauge |
| `node_filesystem_avail_bytes` | Available filesystem space | Gauge |

## Alerting Rules and Thresholds

### Critical Alerts (Immediate Notification)

| Alert Name | Condition | Threshold | For Duration |
|------------|-----------|-----------|-------------|
| `DytallixNodeDown` | Node unavailable | up == 0 | 5 minutes |
| `BlockProductionStall` | No new blocks | No blocks for 30s | 30 seconds |
| `HighDiskUsage` | Disk space critical | > 85% | 5 minutes |
| `PQCKeyGenerationFailures` | PQC key generation failing | Any failures | 1 minute |
| `NetworkPartition` | Network partition detected | partition_detected == 1 | 1 minute |
| `ConsensusFailures` | Consensus mechanism failing | Any failures | 1 minute |

### Warning Alerts (Less Frequent Notification)

| Alert Name | Condition | Threshold | For Duration |
|------------|-----------|-----------|-------------|
| `HighMemoryUsage` | Memory usage high | > 80% | 5 minutes |
| `HighCPUUsage` | CPU usage high | > 90% | 10 minutes |
| `LowPeerCount` | Insufficient peers | < 2 peers | 5 minutes |
| `NodeOutOfSync` | Node synchronization issues | sync_status == 0 | 10 minutes |
| `TransactionQueueBacklog` | High transaction backlog | > 1000 transactions | 2 minutes |
| `HighErrorRate` | Application error rate high | > 10 errors/minute | 2 minutes |
| `HighAPILatency` | API response time high | P95 > 1 second | 5 minutes |
| `SlowPQCOperations` | PQC operations slow | P95 > 5 seconds | 5 minutes |

## Notification Channels

### Slack Notifications

- **Critical Alerts**: `#dytallix-critical`
- **General Alerts**: `#dytallix-alerts`
- **Warnings**: `#dytallix-warnings`
- **Node Alerts**: `#dytallix-nodes`
- **Blockchain Alerts**: `#dytallix-blockchain`
- **PQC Alerts**: `#dytallix-pqc`

### Email Notifications

- **Critical Alerts Only**: `ops-team@dytallix.com`
- Includes detailed alert information and runbook links

## Dashboard Features

The Grafana dashboard provides:

### System Overview
- Node health status (UP/DOWN)
- CPU, memory, and disk usage across all nodes
- Real-time system resource utilization

### Blockchain Metrics
- Current block height across all nodes
- Transaction throughput (TPS)
- Transaction queue status
- Peer connectivity status
- Node synchronization status

### Performance Metrics
- API response times (P50, P95)
- Error rates
- Smart contract deployment metrics
- Post-quantum cryptography performance

### Network Health
- Peer count
- Network partition detection
- Consensus status

## Log Aggregation

### Log Sources
- **Application Logs**: `/var/log/dytallix/*.log`
- **System Logs**: `/var/log/*.log`
- **Docker Logs**: Container logs from all services

### Log Analysis
- Error detection and counting
- Performance issue identification
- Security event monitoring
- Automated log-based alerting

## Deployment and Configuration

### Prerequisites
- Docker and Docker Compose
- Sufficient disk space for metrics retention (50GB recommended)
- Network access for webhook notifications

### Quick Start

1. **Configure Secrets**:
   ```bash
   # Edit Slack webhook URL
   echo "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK" > deployment/docker/secrets/slack_webhook

   # Configure SMTP password
   echo "your_smtp_password" > deployment/docker/secrets/smtp_password
   ```

2. **Deploy Monitoring Stack**:
   ```bash
   cd deployment/docker
   docker-compose -f docker-compose.testnet.yml up -d
   ```

3. **Verify Services**:
   ```bash
   # Check all services are running
   docker-compose -f docker-compose.testnet.yml ps

   # Test Prometheus targets
   curl http://localhost:9093/api/v1/targets

   # Access Grafana dashboard
   # URL: http://localhost:3000
   # Username: admin
   # Password: dytallix_testnet_admin
   ```

### Configuration Files

| File | Purpose | Location |
|------|---------|----------|
| `prometheus.yml` | Prometheus configuration | `deployment/monitoring/` |
| `alert_rules.yml` | Alerting rules | `deployment/monitoring/` |
| `alertmanager.yml` | Alert routing configuration | `deployment/monitoring/` |
| `loki.yml` | Log aggregation configuration | `deployment/monitoring/` |
| `promtail.yml` | Log collection configuration | `deployment/monitoring/` |
| `dytallix.json` | Grafana dashboard | `deployment/monitoring/grafana/dashboards/` |

## Troubleshooting

### Common Issues

1. **Prometheus Not Scraping Metrics**
   - Check target endpoints are accessible
   - Verify firewall rules
   - Check Prometheus logs: `docker logs dytallix-prometheus`

2. **Alerts Not Firing**
   - Verify alerting rules syntax
   - Check Prometheus rule evaluation
   - Review Alertmanager configuration

3. **Slack Notifications Not Working**
   - Verify webhook URL in secrets file
   - Check Alertmanager logs: `docker logs dytallix-alertmanager`
   - Test webhook URL manually

4. **Grafana Dashboard Not Loading Data**
   - Verify Prometheus data source configuration
   - Check data source connectivity
   - Review metric names and queries

### Health Checks

```bash
# Check all monitoring services
./scripts/check_monitoring_health.sh

# Test specific endpoints
curl -f http://localhost:9093/-/healthy  # Prometheus
curl -f http://localhost:9094/-/healthy  # Alertmanager
curl -f http://localhost:3000/api/health # Grafana
curl -f http://localhost:3100/ready      # Loki
```

### Performance Tuning

#### Prometheus Configuration
- **Retention**: Default 30 days, configurable via `--storage.tsdb.retention.time`
- **Storage Size**: Default 50GB limit, configurable via `--storage.tsdb.retention.size`
- **Scrape Interval**: 5s for blockchain metrics, 15s for system metrics

#### Grafana Optimization
- Enable query caching
- Use efficient query patterns
- Limit time ranges for heavy queries

## Runbook Links

- [Node Down Troubleshooting](https://docs.dytallix.com/runbooks/node-down)
- [Block Production Issues](https://docs.dytallix.com/runbooks/block-stall)
- [High Resource Usage](https://docs.dytallix.com/runbooks/high-memory)
- [Network Connectivity Issues](https://docs.dytallix.com/runbooks/low-peers)
- [Post-Quantum Crypto Issues](https://docs.dytallix.com/runbooks/pqc-key-failures)

## Maintenance

### Regular Tasks
- Monitor disk usage for metrics storage
- Review and update alerting thresholds
- Test notification channels monthly
- Update dashboard queries as needed
- Archive old logs (> 7 days)

### Backup and Recovery
- Prometheus data: `/prometheus` volume
- Grafana configuration: `/var/lib/grafana` volume
- Alert rules and configurations: Version controlled in repository

## Security Considerations

- Grafana admin password should be changed from default
- Slack webhook URLs should be treated as secrets
- SMTP credentials should be stored securely
- Network access should be restricted to necessary ports
- Regular security updates for all monitoring components