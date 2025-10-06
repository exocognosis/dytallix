# Operations Runbook

## Overview

This document provides operational procedures for managing the Dytallix backend/API server.

## Common Issues and Solutions

### Node Out of Sync

**Symptoms:**
- `/api/status` shows high `nodeSyncLag`
- Transactions failing or timing out
- Block height not increasing

**Diagnosis:**
```bash
curl http://localhost:8787/api/status | jq '.nodeSyncLag'
```

**Solutions:**
1. Check node logs for sync issues
2. Verify network connectivity to peer nodes
3. Restart node if necessary:
   ```bash
   systemctl restart dytallix-node
   ```
4. If severely behind, consider re-syncing from snapshot

### Faucet Empty

**Symptoms:**
- `/api/faucet` returns 503 with `INSUFFICIENT_BALANCE`
- Status endpoint shows low `faucetBalance`

**Diagnosis:**
```bash
curl http://localhost:8787/api/status | jq '.faucetBalance'
```

**Solutions:**
1. Pause faucet immediately:
   ```bash
   curl -X POST http://localhost:8787/api/admin/pause \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```

2. Top up faucet address manually

3. Record top-up in system:
   ```bash
   curl -X POST http://localhost:8787/api/admin/topup \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"amount": 10000, "note": "Emergency top-up"}'
   ```

4. Resume faucet:
   ```bash
   curl -X POST http://localhost:8787/api/admin/resume \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```

### RPC Timeouts

**Symptoms:**
- `/api/rpc` returns 504 timeout errors
- Metrics show high p95 latency
- Logs show "RPC_TIMEOUT" errors

**Diagnosis:**
```bash
# Check metrics
curl http://localhost:8787/metrics | grep http_request_duration

# Check node health
curl http://localhost:26657/health
```

**Solutions:**
1. Verify node is responsive
2. Check `NODE_TIMEOUT_MS` setting - may need to increase
3. Check `MAX_CONCURRENCY` - reduce if node is overloaded
4. Verify network connectivity between API server and node
5. Consider adding read replicas for RPC queries

### Faucet Under Attack / Rate Limit Abuse

**Symptoms:**
- Unusually high request rate
- Many 429 rate limit errors
- `faucet_grants` table growing rapidly
- Multiple requests from same IP with different addresses

**Diagnosis:**
```bash
# Check recent grants
sqlite3 data/dytallix.db "SELECT ip, COUNT(*) as count FROM faucet_grants WHERE created_at > datetime('now', '-1 hour') GROUP BY ip ORDER BY count DESC LIMIT 10;"

# Check suspicious activity
sqlite3 data/dytallix.db "SELECT ip, COUNT(DISTINCT address) as addresses FROM request_fingerprints WHERE created_at > datetime('now', '-1 hour') GROUP BY ip HAVING addresses > 5;"
```

**Solutions:**
1. Immediately pause faucet:
   ```bash
   curl -X POST http://localhost:8787/api/admin/pause \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```

2. Analyze attack pattern in database

3. Add IP blocks at load balancer/firewall level

4. Adjust rate limits if needed (edit `.env` and restart)

5. Resume when attack subsides

### Database Locked

**Symptoms:**
- Errors about "database is locked"
- Timeouts on database operations

**Diagnosis:**
```bash
# Check for other processes
lsof data/dytallix.db

# Check database integrity
sqlite3 data/dytallix.db "PRAGMA integrity_check;"
```

**Solutions:**
1. Restart server (graceful shutdown should release lock)
2. If problem persists, check for zombie processes
3. WAL mode should prevent most locking issues
4. Verify no manual SQLite sessions are open

## Maintenance Procedures

### Backup and Restore

**Create Backup:**
```bash
# Automated backup
npm run backup

# Manual backup
timestamp=$(date +%Y%m%d_%H%M%S)
tar -czf backups/manual-backup-$timestamp.tar.gz data/dytallix.db
```

**Restore from Backup:**
```bash
# Stop server first
systemctl stop dytallix-api

# Extract backup
tar -xzf backups/dytallix-backup-TIMESTAMP.tar.gz -C data/

# Restart server
systemctl start dytallix-api
```

### Key Rotation

**When to Rotate:**
- Regular schedule (e.g., every 90 days)
- Suspected key compromise
- After major security incident

**Procedure:**
1. Generate new key securely (never in production environment):
   ```bash
   # Use appropriate key generation for your crypto system
   openssl rand -hex 32
   ```

2. Store new key securely (KMS, vault, etc.)

3. Rotate via API:
   ```bash
   curl -X POST http://localhost:8787/api/admin/rotate-key \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"newKey": "NEW_KEY_HERE"}'
   ```

4. Verify new address in response

5. Update monitoring for new address

6. Fund new address if needed

### Database Migrations

**Apply New Migration:**
```bash
# Stop server (or run during maintenance window)
npm run migrate

# Restart server
npm start
```

**Rollback (manual):**
Migrations don't have automatic rollback. To rollback:
1. Restore from backup before migration
2. Or manually write SQL to reverse changes

### Log Rotation

Logs should be rotated by system log management. If using file-based logging:

```bash
# Configure logrotate
cat > /etc/logrotate.d/dytallix-api << EOF
/var/log/dytallix-api/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 dytallix dytallix
    sharedscripts
    postrotate
        systemctl reload dytallix-api
    endscript
}
EOF
```

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Faucet Balance**
   - Metric: `dytallix_faucet_balance`
   - Alert if < 1000 units
   - Critical if < 100 units

2. **API Error Rate**
   - Metric: `http_requests_total{status=~"5.."}`
   - Alert if > 5% error rate over 5 minutes

3. **RPC Latency**
   - Metric: `http_request_duration_seconds{path="/api/rpc"}`
   - Alert if p95 > 2 seconds

4. **Block Lag**
   - Metric: `dytallix_block_lag`
   - Alert if > 10 blocks behind

5. **Rate Limit Hits**
   - Database query: `SELECT COUNT(*) FROM faucet_grants WHERE created_at > datetime('now', '-1 hour')`
   - Alert if unusually high

### Sample Prometheus Alerts

```yaml
groups:
  - name: dytallix_api
    rules:
      - alert: FaucetBalanceLow
        expr: dytallix_faucet_balance < 1000
        for: 5m
        annotations:
          summary: "Faucet balance low"
          
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High API error rate"
          
      - alert: RPCTimeout
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{path="/api/rpc"}[5m])) > 2
        for: 5m
        annotations:
          summary: "RPC requests timing out"
```

## Security Procedures

### Suspected Compromise

1. **Immediately:**
   - Pause faucet
   - Rotate signing key
   - Review recent grants in database
   - Check server access logs

2. **Investigate:**
   - Review application logs
   - Check for unauthorized admin access
   - Verify key material hasn't leaked

3. **Remediate:**
   - Patch vulnerabilities
   - Update dependencies
   - Rotate all secrets
   - Consider draining and replacing faucet address

### Regular Security Tasks

- **Weekly:** Review access logs for anomalies
- **Monthly:** Dependency updates and security patches
- **Quarterly:** Key rotation, security audit

## Performance Tuning

### Increase Throughput

1. **Increase concurrency:**
   ```bash
   # Edit .env
   MAX_CONCURRENCY=50
   ```

2. **Optimize database:**
   ```bash
   sqlite3 data/dytallix.db "PRAGMA optimize;"
   ```

3. **Add indexes for common queries** (already in schema)

### Reduce Memory Usage

1. Decrease `MAX_CONCURRENCY`
2. Reduce rate limit windows
3. Clean old data from database:
   ```sql
   DELETE FROM faucet_grants WHERE created_at < datetime('now', '-30 days');
   DELETE FROM request_fingerprints WHERE created_at < datetime('now', '-7 days');
   ```

## Deployment

### Production Deployment Checklist

- [ ] Environment variables configured (no dev keys!)
- [ ] `ADMIN_TOKEN` set to strong random value
- [ ] `ADMIN_ALLOWED_IPS` restricted to known IPs
- [ ] `FAUCET_PRIVATE_KEY` stored in KMS/vault
- [ ] Database backed up
- [ ] Monitoring configured
- [ ] Alerts configured
- [ ] Firewall rules in place
- [ ] SSL/TLS configured (behind reverse proxy)
- [ ] Log aggregation configured
- [ ] Health check endpoints verified

### Zero-Downtime Deployment

1. Start new server instance on different port
2. Verify health checks pass
3. Update load balancer to point to new instance
4. Drain connections from old instance
5. Stop old instance

## Contact Information

- **On-call:** [Your on-call rotation]
- **Security issues:** security@dytallix.com
- **Infrastructure:** infra@dytallix.com

## References

- [Server README](../server-new/README.md)
- [API Documentation](./API.md)
- [Security Policy](../SECURITY.md)
