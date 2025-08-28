# Dytallix Monitoring System Quick Start Guide

## Overview

This guide provides step-by-step instructions to deploy the production-ready monitoring and alerting system for Dytallix testnet.

## Prerequisites

- Docker and Docker Compose installed
- At least 4GB RAM and 10GB disk space
- Network access for webhook notifications

## Quick Deployment

### 1. Configure Secrets

Before deploying, configure your notification channels:

```bash
# Set your Slack webhook URL
echo "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK" > deployment/docker/secrets/slack_webhook

# Set your SMTP password for email alerts
echo "your_smtp_password" > deployment/docker/secrets/smtp_password
```

### 2. Deploy Monitoring Stack

```bash
# Deploy the complete monitoring stack
./scripts/monitoring/deploy_monitoring.sh deploy

# Or deploy step by step:
./scripts/monitoring/deploy_monitoring.sh config    # Setup configuration
./scripts/monitoring/deploy_monitoring.sh validate # Validate configs
./scripts/monitoring/deploy_monitoring.sh start    # Start services
```

### 3. Verify Deployment

```bash
# Check service status
./scripts/monitoring/deploy_monitoring.sh status

# Run health checks
./scripts/monitoring/check_monitoring_health.sh

# View logs if needed
./scripts/monitoring/deploy_monitoring.sh logs prometheus
```

## Access URLs

After successful deployment:

- **Grafana Dashboard**: http://localhost:3000 (admin/dytallix_testnet_admin)
- **Prometheus**: http://localhost:9093
- **Alertmanager**: http://localhost:9094
- **Loki**: http://localhost:3100

## Monitoring Features

### Comprehensive Metrics
- **System Metrics**: CPU, Memory, Disk usage for all nodes
- **Blockchain Metrics**: Block height, transaction throughput, peer count
- **PQC Metrics**: Post-quantum crypto operation performance
- **API Metrics**: Response times, error rates

### Alerting Rules (15 Total)

**Critical Alerts** (immediate notification):
- Node down > 5 minutes
- Block production stall > 30 seconds
- Disk usage > 85%
- PQC key generation failures
- Network partition detected
- Consensus failures

**Warning Alerts** (less frequent):
- Memory usage > 80%
- CPU usage > 90% for 10 minutes
- Peer count < 2
- Transaction queue > 1000
- Error rate > 10/minute
- API latency > 1 second

### Notification Channels
- **Slack**: Different channels for critical, warning, and general alerts
- **Email**: Critical alerts sent to ops team

### Log Aggregation
- Centralized logging with Loki
- Automated error detection and counting
- 7-day log retention

## Management Commands

```bash
# Start monitoring services
./scripts/monitoring/deploy_monitoring.sh start

# Stop monitoring services
./scripts/monitoring/deploy_monitoring.sh stop

# Restart monitoring services
./scripts/monitoring/deploy_monitoring.sh restart

# View service status
./scripts/monitoring/deploy_monitoring.sh status

# View logs for all services
./scripts/monitoring/deploy_monitoring.sh logs

# View logs for specific service
./scripts/monitoring/deploy_monitoring.sh logs prometheus

# Health check
./scripts/monitoring/check_monitoring_health.sh

# Quick health check
./scripts/monitoring/check_monitoring_health.sh quick

# Cleanup (stop and remove)
./scripts/monitoring/deploy_monitoring.sh cleanup
```

## Configuration Files

| File | Purpose |
|------|---------|
| `deployment/monitoring/prometheus.yml` | Prometheus configuration |
| `deployment/monitoring/alert_rules.yml` | Alerting rules |
| `deployment/monitoring/alertmanager.yml` | Alert routing |
| `deployment/monitoring/grafana/dashboards/dytallix.json` | Dashboard |
| `deployment/docker/docker-compose.testnet.yml` | Service orchestration |

## Troubleshooting

### Common Issues

1. **Services not starting**
   ```bash
   docker-compose -f deployment/docker/docker-compose.testnet.yml logs [service]
   ```

2. **Prometheus not scraping**
   - Check target endpoints are accessible
   - Verify firewall rules
   - Check Prometheus targets: http://localhost:9093/targets

3. **Alerts not firing**
   - Check alerting rules in Prometheus: http://localhost:9093/rules
   - Verify Alertmanager config: http://localhost:9094

4. **Slack notifications not working**
   - Verify webhook URL in `deployment/docker/secrets/slack_webhook`
   - Test webhook manually: `curl -X POST -H 'Content-type: application/json' --data '{"text":"Test"}' YOUR_WEBHOOK_URL`

### Health Checks

```bash
# Check all components
./scripts/monitoring/check_monitoring_health.sh

# Check specific components
./scripts/monitoring/check_monitoring_health.sh prometheus
./scripts/monitoring/check_monitoring_health.sh docker

# Quick check of main services
./scripts/monitoring/check_monitoring_health.sh quick
```

## Advanced Configuration

### Custom Alert Rules

Add custom rules to `deployment/monitoring/alert_rules.yml`:

```yaml
- alert: CustomAlert
  expr: your_metric > threshold
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Custom alert description"
```

### Custom Dashboard Panels

Import additional panels in Grafana or modify `deployment/monitoring/grafana/dashboards/dytallix.json`.

### Log Analysis

Access logs via Grafana:
1. Go to Explore
2. Select Loki data source
3. Query logs: `{job="dytallix-logs"}`

## Security Notes

- Change default Grafana password
- Restrict network access to monitoring ports
- Keep Slack webhook URLs secure
- Regular security updates for monitoring components

## Support

For issues or questions:
- Check the comprehensive documentation in `docs/monitoring/README.md`
- Run health checks and review logs
- Verify configurations with provided validation tools

## Next Steps

1. Configure actual Slack webhook and SMTP credentials
2. Start Dytallix nodes to see metrics
3. Test alerting by triggering sample alerts
4. Customize dashboards based on specific needs
5. Set up log rotation and backup procedures