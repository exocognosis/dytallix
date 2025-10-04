# Ops Configuration Files

This directory contains operational configuration files for monitoring, alerting, and security infrastructure.

## Directory Structure

```
ops/
├── prometheus/
│   └── prometheus.yml          # Prometheus scrape configuration
├── grafana/
│   ├── dashboards/
│   │   └── dytallix-overview.json  # Main blockchain dashboard
│   └── alerts/
│       └── dytallix-alerts.yml     # Alert rules configuration
├── vault/
│   ├── vault_policy.hcl        # Vault access policy for validator keys
│   └── agent-config.hcl        # Vault Agent configuration
└── ai-oracle-compose.yml       # AI Oracle service compose (pre-existing)
```

## Prometheus Configuration

**File**: `prometheus/prometheus.yml`

Configures Prometheus to scrape metrics from:
- Dytallix node (port 3030)
- API server (port 3001/8787)
- AI Oracle (port 9091)
- Prometheus self-monitoring (port 9090)

**Usage**:
```bash
docker run -p 9090:9090 \
  -v $(pwd)/ops/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml \
  -v $(pwd)/ops/grafana/alerts:/etc/prometheus/alerts \
  prom/prometheus:v2.45.0
```

Or use the provided docker-compose:
```bash
docker-compose -f docker-compose.observability.yml up -d
```

## Grafana Configuration

### Dashboard

**File**: `grafana/dashboards/dytallix-overview.json`

Provides monitoring for:
- Block height progression
- Block time (with SLO thresholds)
- Transactions per second (TPS)
- Mempool size
- API latency (p50, p95)
- AI Oracle latency (p50, p95)

**Import**:
1. Access Grafana UI (http://localhost:3000)
2. Navigate to Dashboards → Import
3. Upload `ops/grafana/dashboards/dytallix-overview.json`
4. Select Prometheus datasource

### Alert Rules

**File**: `grafana/alerts/dytallix-alerts.yml`

Defines 8 alert rules:

| Alert | Severity | Condition | Duration |
|-------|----------|-----------|----------|
| NodeHeightStall | Critical | No height increase | 60s |
| APIHighLatency | Warning | p95 > 800ms | 2m |
| AILatencyDegraded | Warning | p95 > 1000ms | 2m |
| ValidatorDown | Critical | Node unreachable | 1m |
| APIServerDown | Critical | API unreachable | 1m |
| AIOracleDown | Warning | AI unreachable | 2m |
| HighMempoolSize | Warning | Mempool > 1000 | 5m |
| TransactionRateSpike | Info | TPS > 100 | 2m |

**Load into Prometheus**:
Rules are automatically loaded via volume mount in docker-compose:
```yaml
volumes:
  - ./ops/grafana/alerts:/etc/prometheus/alerts:ro
```

## Vault Configuration

### Policy

**File**: `vault/vault_policy.hcl`

Defines access control for validator signing keys:
- Read access to `secret/data/dytallix/validator/*/signing-key`
- List/read access to metadata
- Token renewal permissions

**Apply policy**:
```bash
vault policy write dytallix-validator ops/vault/vault_policy.hcl
```

### Agent Configuration

**File**: `vault/agent-config.hcl`

Configures Vault Agent to:
- Authenticate via AppRole
- Fetch signing keys from Vault
- Render keys to tmpfs location
- Reload node service on key changes

**Run agent**:
```bash
vault agent -config=ops/vault/agent-config.hcl
```

See [docs/vault_setup.md](../docs/vault_setup.md) for complete setup guide.

## Docker Compose Stack

**File**: `../docker-compose.observability.yml`

Deploys full monitoring stack:
- Prometheus (port 9090)
- Grafana (port 3000)
- Persistent volumes for data
- Automatic configuration loading

**Start stack**:
```bash
docker-compose -f docker-compose.observability.yml up -d
```

**Access**:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)

## Evidence Generation

Test configurations with evidence scripts:

```bash
# Test Prometheus endpoints
bash scripts/evidence/observability_probe.sh

# Test alert firing
bash scripts/evidence/alert_canary.sh

# Test Vault configuration
bash scripts/evidence/vault_probe.sh
```

## Production Deployment

### Prerequisites

1. Prometheus and Grafana deployed
2. Vault deployed and unsealed (for key management)
3. Services exposing metrics on configured ports
4. Network connectivity between services

### Configuration Steps

1. **Update endpoints** in `prometheus/prometheus.yml`:
   ```yaml
   - targets: ['prod-node-01:3030', 'prod-node-02:3030']
   ```

2. **Configure Alertmanager** (optional):
   ```yaml
   alerting:
     alertmanagers:
       - static_configs:
           - targets: ['alertmanager:9093']
   ```

3. **Set Vault address** in `vault/agent-config.hcl`:
   ```hcl
   vault {
     address = "https://vault.prod.dytallix.network"
   }
   ```

4. **Deploy configurations** to production servers

5. **Verify** with evidence scripts against production endpoints

## Security Considerations

### Prometheus

- Restrict access to Prometheus UI (use authentication proxy)
- TLS for scrape targets in production
- Network policies to limit scrape access

### Grafana

- Change default admin password
- Enable LDAP/OAuth for authentication
- Configure TLS for UI access
- Set up role-based access control (RBAC)

### Vault

- Always use TLS (never plain HTTP)
- Rotate AppRole credentials regularly
- Enable audit logging
- Use encrypted storage backend
- Implement key rotation schedule

## Troubleshooting

### Prometheus not scraping

```bash
# Check Prometheus targets page
curl http://localhost:9090/api/v1/targets

# Verify service metrics are exposed
curl http://localhost:3030/metrics
```

### Alerts not firing

```bash
# Check alert rules loaded
curl http://localhost:9090/api/v1/rules

# Verify alert conditions in Prometheus UI
# Navigate to: Alerts → dytallix.blockchain.alerts
```

### Vault authentication failed

```bash
# Test AppRole authentication
vault write auth/approle/login \
  role_id=your-role-id \
  secret_id=your-secret-id

# Check agent logs
journalctl -u vault-agent -f
```

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Vault Documentation](https://www.vaultproject.io/docs)
- [LAUNCH-CHECKLIST.md](../LAUNCH-CHECKLIST.md) - Evidence requirements
- [docs/vault_setup.md](../docs/vault_setup.md) - Complete Vault setup guide
