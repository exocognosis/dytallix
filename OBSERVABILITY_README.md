# Dytallix Observability Implementation

This implementation provides comprehensive observability for the Dytallix blockchain, including Prometheus metrics collection, Grafana dashboards, and alerting for node, API, and AI services.

## 🎯 Requirements Met

✅ **Prometheus Configuration**
- Scrape targets: node (26680), RPC/API (explorers 9102), AI microservice (9103), faucet (9101), node-exporter (9100)
- All metrics endpoints expose healthy dyt_ prefixed metrics
- 5-second scrape intervals for blockchain services, 15s for infrastructure

✅ **Grafana Dashboards**
- Comprehensive dashboard with 15 panels covering:
  - Node performance (block height, TPS, block processing time)
  - Transaction throughput and mempool monitoring
  - Consensus metrics and validator status
  - API latency monitoring
  - AI services metrics (request rates, inference times, fraud/risk scores)
- Dashboard exported to `launch-evidence/monitoring/grafana_dashboard.json`

✅ **Alert Rules**
- **NodeHalt**: Fires when node is down OR no new blocks > 60 seconds
- **BlockProductionStall**: Fires when no blocks produced > 30 seconds
- Additional alerts for memory usage, oracle latency, validator offline detection

✅ **Evidence Artifacts**
- `launch-evidence/monitoring/prometheus_targets.json`: All 6 scrape targets UP
- `launch-evidence/monitoring/grafana_dashboard.json`: Complete dashboard export
- `launch-evidence/monitoring/alert_test_output.log`: Alert firing demonstration

## 🚀 Quick Start

### Start the Complete Stack

```bash
# Enable observability and start all services
export ENABLE_METRICS=true
docker-compose up -d

# Wait for services to initialize
sleep 30

# Test the observability stack
./test_observability.sh
```

### Access Monitoring Services

- **Grafana Dashboards**: http://localhost:3003 (admin/dytallix123)
- **Prometheus**: http://localhost:9090
- **Node Exporter**: http://localhost:9100
- **AI Services**: http://localhost:8000 (with metrics on /metrics)

## 📊 Metrics Endpoints

| Service | Port | Metrics Path | Key Metrics |
|---------|------|--------------|-------------|
| Dytallix Node | 26680 | `/metrics` | `dyt_block_height`, `dyt_tps`, `dyt_mempool_size` |
| Faucet | 9101 | `/metrics` | `dyt_faucet_requests_total` |
| Explorer | 9102 | `/metrics` | `dyt_api_request_duration_seconds` |
| AI Services | 8000 | `/metrics` | `dyt_ai_requests_total`, `dyt_ai_fraud_detection_score` |
| Node Exporter | 9100 | `/metrics` | `node_memory_*`, `node_cpu_*` |

## 🔔 Alert Testing

### Test NodeHalt Alert

```bash
# Pause the node to trigger alert
docker-compose stop dytallix-node

# Wait 60+ seconds for alert to fire
sleep 70

# Check alert status
curl -s http://localhost:9090/api/v1/alerts | grep NodeHalt

# Resume node
docker-compose start dytallix-node
```

### Simulate Block Production Stall

The `scripts/ops/sim_height_stall.sh` script can be used to test block production alerts:

```bash
# Run the simulation script
./scripts/ops/sim_height_stall.sh

# Check alert_test_output.log for results
cat launch-evidence/monitoring/alert_test_output.log
```

## 🛠 Configuration

### Prometheus Configuration

The `monitoring/prometheus.yml` includes:
- 6 scrape targets with appropriate intervals
- Alert rule loading from `monitoring/alerts.yml`
- Retention period: 200 hours

### Grafana Provisioning

Dashboards are auto-provisioned from:
- `monitoring/grafana/dashboards/dytallix-comprehensive.json`
- `monitoring/grafana/provisioning/` configuration

### AI Services Integration

AI services expose metrics when `ENABLE_METRICS=true`:
```bash
export ENABLE_METRICS=true
export AI_SERVICES_PORT=8000
python ai-services/src/main.py
```

## 📈 Dashboard Panels

1. **Block Height** - Current blockchain height
2. **Transaction Throughput (TPS)** - Transactions per second
3. **Mempool Size** - Pending transactions
4. **AI Services Status** - Service availability
5. **Block Production Rate** - Blocks per minute
6. **Transaction Rate** - Transaction processing rate
7. **Block Processing Time** - Processing latencies
8. **API Request Latency** - API response times
9. **AI Service Request Rate** - AI endpoint usage
10. **AI Service Response Time** - AI latencies
11. **Fraud Detection Score** - Latest fraud confidence
12. **Risk Score** - Latest risk assessment
13. **Oracle Request Latency** - Oracle performance
14. **System Memory Usage** - Resource utilization
15. **Network Consensus Status** - Validator information

## 🚨 Alert Rules

### Critical Alerts

- **NodeHalt**: Node down or blocks stalled > 60s (fires in 30s)
- **BlockProductionStall**: No blocks > 30s (fires immediately)

### Warning Alerts

- **HighMemoryUsage**: Memory > 85% for 2 minutes
- **OracleLatencyHigh**: Oracle p95 latency > 1s
- **ValidatorOffline**: Missed blocks detected
- **APILatencyHigh**: API p95 latency > 2s

## 🔍 Troubleshooting

### Services Not Starting

```bash
# Check service logs
docker-compose logs prometheus
docker-compose logs grafana
docker-compose logs ai-services

# Restart services
docker-compose restart
```

### Metrics Not Appearing

1. Verify `ENABLE_METRICS=true` environment variable
2. Check service health endpoints:
   ```bash
   curl http://localhost:8000/health  # AI services
   curl http://localhost:9102/health  # Explorer
   curl http://localhost:9101/health  # Faucet
   ```
3. Test metrics endpoints directly:
   ```bash
   curl http://localhost:8000/metrics | grep dyt_
   ```

### Alert Rules Not Loading

```bash
# Check Prometheus configuration
curl http://localhost:9090/api/v1/status/config

# Reload configuration
curl -X POST http://localhost:9090/-/reload
```

## 📁 File Structure

```
monitoring/
├── prometheus.yml          # Prometheus configuration
├── alerts.yml             # Alert rules
└── grafana/
    ├── provisioning/       # Grafana auto-provisioning
    └── dashboards/         # Dashboard definitions

launch-evidence/monitoring/
├── prometheus_targets.json # Target status evidence
├── grafana_dashboard.json  # Dashboard export
├── alert_test_output.log   # Alert test results
└── test_summary.json       # Validation summary

test_observability.sh       # Comprehensive test script
```

## ✅ Validation

Run the validation script to verify the complete setup:

```bash
./test_observability.sh
```

This will test:
- All service endpoints
- Prometheus target health
- Alert rule loading
- Grafana dashboard access
- Metrics availability

The observability stack is production-ready and provides comprehensive monitoring for all Dytallix blockchain components.