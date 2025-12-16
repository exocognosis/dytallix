# QuantumVault MVP - Operations Runbook

## Daily Operations

### Starting the System

```bash
cd QuantumVaultMVP/infra
docker-compose up -d

# Verify all services are healthy
docker-compose ps

# Check logs for errors
docker-compose logs --tail=100 -f
```

### Stopping the System

```bash
docker-compose stop

# For complete shutdown with cleanup
docker-compose down
```

### Checking System Health

```bash
# All services status
docker-compose ps

# Individual service health
curl http://localhost:3000/api/v1/blockchain/status
curl http://localhost:8200/v1/sys/health

# Database connection
docker exec quantumvault-backend npx prisma db execute --stdin <<< "SELECT 1;"
```

## Monitoring

### Service Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f vault
```

### Database Monitoring

```bash
# Connect to PostgreSQL
docker exec -it quantumvault-postgres psql -U quantumvault

# Check table sizes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

# Active connections
SELECT count(*) FROM pg_stat_activity;
```

### Queue Monitoring

```bash
# Connect to Redis CLI
docker exec -it quantumvault-redis redis-cli

# Check queue stats
KEYS bull:*
LLEN bull:scans:wait
LLEN bull:wrapping:wait
LLEN bull:attestation:wait
```

## Backup & Recovery

### Database Backup

```bash
# Create backup
docker exec quantumvault-postgres pg_dump -U quantumvault quantumvault > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
cat backup_file.sql | docker exec -i quantumvault-postgres psql -U quantumvault quantumvault
```

### Vault Backup

```bash
# Take snapshot
docker exec quantumvault-vault vault operator raft snapshot save /vault/data/backup.snap

# Copy snapshot out
docker cp quantumvault-vault:/vault/data/backup.snap ./vault-backup-$(date +%Y%m%d).snap
```

## Common Tasks

### Creating Users

```bash
# Via API
curl -X POST http://localhost:3000/api/v1/admin/users \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","role":"VIEWER"}'
```

### Rotating Anchor Keys

```bash
curl -X POST http://localhost:3000/api/v1/anchors/<anchor-id>/rotate \
  -H "Authorization: Bearer <admin-token>"
```

### Capturing Dashboard Snapshot

```bash
curl -X POST http://localhost:3000/api/v1/dashboard/snapshot \
  -H "Authorization: Bearer <token>"
```

## Troubleshooting

### Backend Won't Start

1. Check database is accessible
2. Check Vault is accessible
3. Check environment variables
4. Review logs: `docker-compose logs backend`

### Scans Failing

1. Check Redis is running
2. Check TLS scanner timeout settings
3. Verify target is accessible
4. Review scan worker logs

### Wrapping Jobs Stuck

1. Check Vault is accessible
2. Check Redis queue health
3. Verify anchor keys exist
4. Review wrapping worker logs

### Attestations Not Submitting

1. Check blockchain node is synced
2. Verify contract is deployed
3. Check wallet has funds (gas)
4. Review blockchain service logs

## Maintenance

### Updating the Application

```bash
# Pull latest code
git pull origin main

# Rebuild containers
cd infra
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Database Migrations

```bash
# Run pending migrations
docker exec quantumvault-backend npx prisma migrate deploy
```

### Pruning Old Data

```bash
# Archive old scans (older than 90 days)
docker exec quantumvault-backend node -e "
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  prisma.scan.deleteMany({ where: { createdAt: { lt: cutoff } } })
    .then(r => console.log(\`Deleted \${r.count} old scans\`))
    .finally(() => prisma.\$disconnect());
"
```

## Performance Tuning

### Database

```postgresql
-- Add indexes for slow queries
CREATE INDEX CONCURRENTLY idx_assets_risk_level ON assets(risk_level);
CREATE INDEX CONCURRENTLY idx_scans_created_at ON scans(created_at DESC);
```

### Queue Workers

```bash
# Scale workers by increasing replicas
docker-compose up -d --scale backend=3
```

## Security

### Rotate JWT Secret

1. Generate new secret
2. Update backend/.env
3. Restart backend
4. All users must re-login

### Rotate Vault Token

1. Create new token in Vault
2. Update backend/.env
3. Restart backend

### Check for Updates

```bash
# Backend dependencies
cd backend
npm audit

# Frontend dependencies
cd frontend
npm audit

# Fix vulnerabilities
npm audit fix
```

## Emergency Procedures

### System Completely Down

1. Check Docker daemon: `systemctl status docker`
2. Check disk space: `df -h`
3. Check logs: `journalctl -u docker -n 100`
4. Restart Docker: `systemctl restart docker`
5. Restart services: `docker-compose up -d`

### Data Corruption

1. Stop affected service
2. Restore from latest backup
3. Replay any missing data
4. Restart service
5. Verify integrity

### Security Incident

1. Immediately rotate all secrets
2. Review audit logs
3. Check for unauthorized access
4. Patch vulnerabilities
5. Restore from clean backup if needed

## Contacts

- **System Admin**: admin@quantumvault.local
- **Security Team**: security@quantumvault.local
- **On-Call**: oncall@quantumvault.local
