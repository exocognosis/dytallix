# Dytallix Hetzner Deployment Checklist

Use this checklist to ensure a successful deployment from GCP to Hetzner.

## Pre-Deployment (Local/GCP)

### 1. Backup Current GCP Deployment
- [ ] Test backup script on staging environment
- [ ] Create full backup of GCP deployment
  ```bash
  cd deployment/hetzner
  ./scripts/backup-restore.sh backup-all --source-cluster gke_your_cluster
  ```
- [ ] Verify backup integrity
- [ ] Store backup in secure location (multiple copies)
- [ ] Document current GCP configuration

### 2. Prepare Hetzner Server
- [ ] Provision Hetzner Cloud server (minimum 4 CPU, 8GB RAM, 100GB SSD)
- [ ] Note server IP address and SSH access details
- [ ] Ensure DNS records can be updated for your domain
- [ ] Prepare SSH keys for access

## Server Setup

### 3. Initial Server Configuration
- [ ] SSH to server as root
- [ ] Run server setup script:
  ```bash
  curl -sSL https://raw.githubusercontent.com/dytallix/dytallix/main/deployment/hetzner/scripts/setup-server.sh | bash
  ```
- [ ] Verify Docker installation: `docker --version`
- [ ] Verify Docker Compose: `docker-compose --version`
- [ ] Test Docker access: `docker run hello-world`
- [ ] Switch to dytallix user: `su - dytallix`

### 4. Deploy Code and Configuration
- [ ] Clone/copy Dytallix repository to server
  ```bash
  git clone https://github.com/dytallix/dytallix.git
  cd dytallix/deployment/hetzner
  ```
- [ ] Copy deployment files to correct location
- [ ] Verify all scripts are executable: `ls -la scripts/`

## Configuration

### 5. Environment Configuration
- [ ] Copy environment template: `cp docker-compose/.env.example docker-compose/.env`
- [ ] Configure domain settings:
  - [ ] `DOMAIN=yourdomain.com`
  - [ ] `SERVER_IP=your.server.ip.address`
- [ ] Configure blockchain settings:
  - [ ] `CHAIN_ID=dytallix-testnet-1` (or appropriate)
  - [ ] `MONIKER=your-node-name`
- [ ] Generate secure passwords:
  - [ ] `POSTGRES_PASSWORD=`
  - [ ] `REDIS_PASSWORD=`
  - [ ] `GRAFANA_PASSWORD=`
- [ ] Configure SSL/email: `ACME_EMAIL=your@email.com`
- [ ] Review all environment variables in `.env`

### 6. DNS Configuration
- [ ] Update A record: `yourdomain.com` → Server IP
- [ ] Update A record: `*.yourdomain.com` → Server IP
- [ ] Verify DNS propagation: `nslookup yourdomain.com`
- [ ] Test specific subdomains:
  - [ ] `explorer.yourdomain.com`
  - [ ] `faucet.yourdomain.com`
  - [ ] `rpc.yourdomain.com`
  - [ ] `monitoring.yourdomain.com`

## Deployment

### 7. Initial Deployment
- [ ] Run deployment script:
  ```bash
  cd docker-compose
  ../scripts/deploy.sh
  ```
- [ ] Monitor deployment progress
- [ ] Check for any error messages
- [ ] Verify all containers start successfully:
  ```bash
  docker-compose ps
  ```

### 8. Data Migration (if applicable)
- [ ] Transfer backup files to Hetzner server
- [ ] Stop services temporarily: `docker-compose stop`
- [ ] Restore data:
  ```bash
  ../scripts/backup-restore.sh restore-hetzner --backup-dir /path/to/backup
  ```
- [ ] Start services: `docker-compose up -d`

## Verification

### 9. Service Health Checks
- [ ] Run health monitoring:
  ```bash
  ../scripts/monitor.sh check
  ```
- [ ] Check individual services:
  - [ ] Traefik: `curl -f http://localhost:8081/ping`
  - [ ] Frontend: `curl -f http://localhost/health`
  - [ ] Explorer: `curl -f http://localhost:3002/health`
  - [ ] Faucet: `curl -f http://localhost:3001/health`
  - [ ] Bridge: `curl -f http://localhost:8080/health`
  - [ ] Blockchain RPC: `curl -f http://localhost:26657/health`
  - [ ] Prometheus: `curl -f http://localhost:9090/-/healthy`
  - [ ] Grafana: `curl -f http://localhost:3000/api/health`

### 10. External Access Verification
- [ ] Test HTTPS access:
  - [ ] `https://yourdomain.com`
  - [ ] `https://explorer.yourdomain.com`
  - [ ] `https://faucet.yourdomain.com`
  - [ ] `https://rpc.yourdomain.com`
  - [ ] `https://monitoring.yourdomain.com`
- [ ] Verify SSL certificates are valid
- [ ] Test API endpoints:
  - [ ] RPC: `curl https://rpc.yourdomain.com/status`
  - [ ] Faucet: `curl https://faucet.yourdomain.com/health`

### 11. Functional Testing
- [ ] Frontend loads properly
- [ ] Explorer shows blockchain data
- [ ] Faucet can be accessed (test token request if appropriate)
- [ ] RPC endpoints respond correctly
- [ ] Monitoring dashboard loads in Grafana
- [ ] Search and navigate explorer functionality
- [ ] Test wallet connectivity (if applicable)

## Monitoring and Logs

### 12. Monitoring Setup
- [ ] Access Grafana: `https://monitoring.yourdomain.com`
- [ ] Login with configured credentials
- [ ] Verify datasources are connected (Prometheus, Loki)
- [ ] Check that metrics are being collected
- [ ] Verify log ingestion is working
- [ ] Set up alerting rules (if needed)

### 13. Log Verification
- [ ] Check service logs:
  ```bash
  ../scripts/monitor.sh logs
  ```
- [ ] Verify logs in Grafana/Loki
- [ ] Check for any error patterns
- [ ] Ensure log rotation is working

## Security and Performance

### 14. Security Verification
- [ ] Verify firewall rules: `sudo ufw status`
- [ ] Check fail2ban status: `sudo systemctl status fail2ban`
- [ ] Verify non-root service execution
- [ ] Test SSH key access only (disable password auth)
- [ ] Scan for open ports: `nmap localhost`
- [ ] Verify HTTPS-only access for public endpoints

### 15. Performance Testing
- [ ] Check system resources:
  ```bash
  free -h
  df -h
  top
  ```
- [ ] Monitor Docker resource usage: `docker stats`
- [ ] Test blockchain sync performance
- [ ] Monitor network connectivity and latency
- [ ] Check database performance

## Post-Deployment

### 16. Documentation and Handover
- [ ] Document final configuration
- [ ] Update deployment documentation
- [ ] Create operational runbook
- [ ] Set up monitoring alerts
- [ ] Schedule regular backup procedures
- [ ] Plan update and maintenance schedule

### 17. Cleanup and Finalization
- [ ] Clean up temporary files and backups on server
- [ ] Update team on new URLs and access
- [ ] Schedule GCP resource cleanup (when ready)
- [ ] Update external integrations to use new endpoints
- [ ] Monitor for 24-48 hours for stability

## Emergency Procedures

### 18. Rollback Plan
- [ ] Document rollback procedure to GCP
- [ ] Keep GCP deployment running until Hetzner is stable
- [ ] Have DNS rollback procedure ready
- [ ] Keep backup access to all systems
- [ ] Test rollback procedure on staging

### 19. Incident Response
- [ ] Document emergency contacts
- [ ] Create incident response procedures
- [ ] Set up monitoring alerts
- [ ] Document common troubleshooting steps
- [ ] Create escalation procedures

## Success Criteria

### 20. Deployment Acceptance
- [ ] All services running and healthy for 24+ hours
- [ ] Performance meets or exceeds GCP deployment
- [ ] All functional tests passing
- [ ] Monitoring and alerting operational
- [ ] Team trained on new infrastructure
- [ ] Documentation complete and reviewed

---

## Emergency Contacts and Resources

**Primary Administrator**: _________________
**Backup Administrator**: _________________
**Hetzner Support**: https://docs.hetzner.com/
**Emergency Procedures**: See deployment/hetzner/README.md

## Notes and Comments

_Use this space for deployment-specific notes, issues encountered, and resolutions:_

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Reviewed By**: _______________
**Status**: [ ] Success [ ] Partial [ ] Failed

**Final Notes**:
_____________________________________________________________________________
_____________________________________________________________________________
