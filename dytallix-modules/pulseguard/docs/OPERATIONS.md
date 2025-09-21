# PulseGuard Operations Guide

## Quick Start

### Synthetic Mode (Development)

```bash
# 1. Setup environment
make setup

# 2. Run in synthetic mode
make run-synth

# 3. Test API
curl http://localhost:8088/healthz
```

### Live Mode (Production)

```bash
# 1. Configure environment
cp config/.env.example .env
# Edit .env with your settings

# 2. Set required variables
export ETHEREUM_MEMPOOL_WS_URL="wss://eth-mainnet.g.alchemy.com/v2/YOUR_KEY"
export JSON_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY"
export PG_HMAC_KEY="your_production_hmac_key"

# 3. Run in live mode
make run-live
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PULSEGUARD_MODE` | `synthetic` | `synthetic` or `live` |
| `API_PORT` | `8088` | API server port |
| `ETHEREUM_MEMPOOL_WS_URL` | - | Mempool websocket URL |
| `JSON_RPC_URL` | - | Ethereum JSON-RPC URL |
| `CONFIRMATIONS` | `12` | Block confirmations required |
| `FEATURE_WINDOW_SECONDS` | `300` | Feature time window |
| `MODEL_VERSION` | `v0_1_0` | Model version identifier |
| `PG_HMAC_KEY` | `change_me` | HMAC secret key |
| `PG_SIGNING_SECRET` | - | Ed25519 signing key (base64) |
| `PG_PQC_ENABLED` | `false` | Enable PQC features |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4317` | OpenTelemetry endpoint |
| `PROMETHEUS_PORT` | `9109` | Prometheus metrics port |

### Model Configuration

Models are auto-initialized on startup. To train with custom data:

```python
from models.ensemble import EnsembleModel
import pandas as pd

# Load your training data
features = pd.read_parquet("training_features.parquet")
labels = pd.read_parquet("training_labels.parquet")

# Train ensemble
ensemble = EnsembleModel()
metrics = ensemble.train(features, labels.values)

# Save trained model
ensemble.save("models/artifacts/ensemble_v1")
```

## Scaling Configuration

### Single Instance

- **CPU**: 2-4 cores recommended
- **Memory**: 4-8 GB RAM
- **Disk**: 10 GB for logs and models
- **Network**: 100 Mbps for live data feeds

### Load Balancing

For high throughput, run multiple instances behind a load balancer:

```bash
# Instance 1
API_PORT=8088 make run-live

# Instance 2  
API_PORT=8089 make run-live

# Instance 3
API_PORT=8090 make run-live
```

Configure your load balancer to distribute requests across ports 8088-8090.

### Performance Tuning

#### Latency Optimization

1. **Warm up models**: Send test requests on startup
2. **Optimize feature computation**: Reduce window sizes for faster processing
3. **Cache frequently accessed data**: Use Redis for transaction lookups
4. **Adjust model complexity**: Reduce tree depth/estimators if needed

#### Throughput Optimization

1. **Increase worker processes**: Use uvicorn with multiple workers
2. **Async processing**: Process requests concurrently 
3. **Batch processing**: Group multiple transactions per request
4. **Queue management**: Monitor and tune queue sizes

## Monitoring

### Health Checks

```bash
# Basic health
curl http://localhost:8088/healthz

# Detailed status
curl http://localhost:8088/status | jq .

# Prometheus metrics
curl http://localhost:8088/metrics
```

### Key Metrics to Monitor

| Metric | Threshold | Action |
|--------|-----------|--------|
| `pg_api_latency_seconds` P95 | > 100ms | Scale up or optimize |
| `pg_queue_lag` | > 1000 items | Check data ingestion |
| `pg_block_gap` | > 50 blocks | Check RPC connection |
| API error rate | > 5% | Check logs for issues |

### Alerting Rules

```yaml
# Prometheus alerting rules
groups:
  - name: pulseguard
    rules:
      - alert: HighLatency
        expr: histogram_quantile(0.95, pg_api_latency_seconds) > 0.1
        for: 2m
        annotations:
          summary: "PulseGuard P95 latency > 100ms"
          
      - alert: HighQueueLag
        expr: pg_queue_lag > 1000
        for: 1m
        annotations:
          summary: "PulseGuard queue lag too high"
```

## Troubleshooting

### Common Issues

#### API Returns 500 Errors

1. Check logs for detailed error messages
2. Verify model files are present and loadable
3. Check database/feature store connectivity
4. Verify sufficient memory for model loading

#### High Latency (P95 > 100ms)

1. Check feature computation time in metrics
2. Verify model complexity isn't too high
3. Monitor GC pressure and memory usage
4. Consider reducing feature window size

#### Missing Data in Live Mode

1. Verify RPC/WebSocket connectivity
2. Check API key quotas and rate limits
3. Monitor `pg_block_gap` and `pg_queue_lag` metrics
4. Verify firewall and network connectivity

#### False Positives/Negatives

1. Review reason codes in responses
2. Adjust detector thresholds in configuration
3. Retrain models with updated data
4. Review feature engineering and data quality

### Log Analysis

Logs are structured JSON for easy parsing:

```bash
# View recent errors
journalctl -u pulseguard --since "1 hour ago" | grep ERROR

# Extract latency information
grep "score_request" logs/pulseguard.log | jq .latency_ms

# Monitor specific reason codes
grep "PG.FLASH" logs/pulseguard.log | jq .reason_codes
```

### Performance Profiling

```bash
# Profile API endpoint
pip install py-spy
py-spy record -o profile.svg -- python -m service.api

# Memory profiling
pip install memory_profiler
mprof run python -m service.api
```

## Maintenance

### Model Updates

1. Train new models offline with latest data
2. Test thoroughly in staging environment
3. Deploy with rolling update to avoid downtime
4. Monitor performance after deployment

### Data Cleanup

```bash
# Clean old feature artifacts (keep last 5 versions)
make clean

# Manual cleanup of feature store
python -c "
from features.feature_store import feature_store
feature_store.cleanup_old_versions(keep_versions=5)
"
```

### Backup Strategy

1. **Configuration**: Backup `.env` and model configs
2. **Models**: Backup trained model artifacts
3. **Feature store**: Backup feature manifests and recent snapshots
4. **Logs**: Retain logs for compliance/debugging

## Security Considerations

### HMAC Key Management

- Use strong, randomly generated keys (32+ characters)
- Rotate keys periodically
- Store securely (not in code or logs)
- Use different keys for different environments

### Network Security

- Run behind reverse proxy/load balancer
- Use TLS/HTTPS in production
- Restrict network access to API endpoints
- Monitor for unusual traffic patterns

### Data Privacy

- Minimize transaction data retention
- Implement data purging policies
- Consider data anonymization for training
- Comply with relevant privacy regulations