# 🚀 Dytallix Fast Launch - Hetzner Deployment Guide

## 📋 Server Information

| Property | Value |
|----------|-------|
| **Provider** | Hetzner Cloud |
| **Plan** | CPX21 (3 vCPU, 4GB RAM, 80GB SSD) |
| **IP Address** | `178.156.187.81` |
| **IPv6** | `2a01:4f10:9aef::/64` |
| **Location** | Ashburn, VA, USA (ash-dc1) |
| **OS** | Ubuntu (docker-ce pre-installed) |
| **Cost** | $9.99/month |

---

## 🎯 Quick Deployment

### Option 1: Automated Deployment (Recommended)

```bash
# From your local machine
cd /Users/rickglenn/dytallix/dytallix-fast-launch

# Make deployment script executable
chmod +x scripts/deploy-to-hetzner.sh

# Run full deployment
./scripts/deploy-to-hetzner.sh full
```

### Option 2: Manual Deployment

```bash
# 1. Sync files to server
rsync -av --exclude='node_modules' \
          --exclude='target' \
          --exclude='*.log' \
          --exclude='dist' \
          --exclude='data' \
          --exclude='.git' \
          /Users/rickglenn/dytallix/dytallix-fast-launch/ \
          root@178.156.187.81:/opt/dytallix-fast-launch/

# 2. SSH to server
ssh root@178.156.187.81

# 3. Deploy
cd /opt/dytallix-fast-launch
./deploy.sh
```

---

## 🔑 SSH Setup

### First Time Setup

```bash
# Copy your SSH key to the server
ssh-copy-id root@178.156.187.81

# Test connection
ssh root@178.156.187.81 "echo 'Connected successfully!'"
```

### SSH Config (Optional)

Add to `~/.ssh/config`:

```
Host dytallix-hetzner
    HostName 178.156.187.81
    User root
    IdentityFile ~/.ssh/id_rsa
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Then connect with: `ssh dytallix-hetzner`

---

## 🌐 Service Access URLs

After deployment, access services at:

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://178.156.187.81:5173 | Main web interface |
| **Node RPC** | http://178.156.187.81:3030 | Blockchain RPC endpoint |
| **Faucet/API** | http://178.156.187.81:8787 | Token faucet and API |
| **Prometheus** | http://178.156.187.81:9090 | Metrics collection |
| **Grafana** | http://178.156.187.81:3000 | Metrics visualization |
| **Jaeger** | http://178.156.187.81:16686 | Distributed tracing |

---

## 📊 Deployment Modes

### Full Deployment
Complete setup including server preparation, file sync, and deployment.
```bash
./scripts/deploy-to-hetzner.sh full
```

### Update Deployment
Quick update: sync files and redeploy (use after code changes).
```bash
./scripts/deploy-to-hetzner.sh update
```

### Verify Only
Check deployment status without making changes.
```bash
./scripts/deploy-to-hetzner.sh verify
```

---

## 🔧 Server Management Commands

### Access Server
```bash
ssh root@178.156.187.81
```

### View Logs
```bash
# All services
ssh root@178.156.187.81 'cd /opt/dytallix-fast-launch && docker-compose logs -f'

# Specific service
ssh root@178.156.187.81 'cd /opt/dytallix-fast-launch && docker-compose logs -f seed-node'
ssh root@178.156.187.81 'cd /opt/dytallix-fast-launch && docker-compose logs -f faucet'
```

### Check Status
```bash
# Docker containers
ssh root@178.156.187.81 'docker ps'

# Service health
curl http://178.156.187.81:3030/status
curl http://178.156.187.81:8787/health
curl http://178.156.187.81:5173/
```

### Restart Services
```bash
# All services
ssh root@178.156.187.81 'cd /opt/dytallix-fast-launch && docker-compose restart'

# Specific service
ssh root@178.156.187.81 'cd /opt/dytallix-fast-launch && docker-compose restart seed-node'
```

### Stop/Start Services
```bash
# Stop all
ssh root@178.156.187.81 'cd /opt/dytallix-fast-launch && docker-compose down'

# Start all
ssh root@178.156.187.81 'cd /opt/dytallix-fast-launch && docker-compose up -d'
```

---

## 🔍 Troubleshooting

### Service Not Starting

```bash
# Check logs for errors
ssh root@178.156.187.81 'cd /opt/dytallix-fast-launch && docker-compose logs --tail=100'

# Check system resources
ssh root@178.156.187.81 'htop'
ssh root@178.156.187.81 'df -h'
ssh root@178.156.187.81 'free -h'
```

### Port Already in Use

```bash
# Check what's using a port
ssh root@178.156.187.81 'netstat -tulpn | grep :3030'

# Kill process on port
ssh root@178.156.187.81 'fuser -k 3030/tcp'
```

### Clean Rebuild

```bash
# Stop everything and clean
ssh root@178.156.187.81 'cd /opt/dytallix-fast-launch && docker-compose down -v'
ssh root@178.156.187.81 'cd /opt/dytallix-fast-launch && rm -rf target/ node_modules/ data/'

# Redeploy
./scripts/deploy-to-hetzner.sh update
```

### Check Disk Space

```bash
# View disk usage
ssh root@178.156.187.81 'df -h'

# Clean Docker
ssh root@178.156.187.81 'docker system prune -af --volumes'
```

---

## 🔐 Security Checklist

- [ ] SSH key authentication configured
- [ ] Password authentication disabled (optional)
- [ ] Firewall configured (UFW)
- [ ] SSL/TLS certificates configured (for production)
- [ ] Environment variables secured in `.env`
- [ ] Regular backups configured
- [ ] Monitoring alerts set up

### Basic Firewall Setup

```bash
ssh root@178.156.187.81 << 'EOF'
    # Enable UFW
    ufw --force enable
    
    # Allow SSH
    ufw allow 22/tcp
    
    # Allow application ports
    ufw allow 3030/tcp  # Node RPC
    ufw allow 8787/tcp  # Faucet/API
    ufw allow 5173/tcp  # Frontend
    ufw allow 9090/tcp  # Prometheus
    ufw allow 3000/tcp  # Grafana
    ufw allow 16686/tcp # Jaeger
    
    # Check status
    ufw status verbose
EOF
```

---

## 📈 Monitoring

### Health Check Script

```bash
#!/bin/bash
# Save as: check-health.sh

SERVER="178.156.187.81"

echo "=== Dytallix Health Check ==="
echo ""

echo "Node RPC:"
curl -s http://$SERVER:3030/status | jq -r '.status // "ERROR"'

echo ""
echo "Faucet/API:"
curl -s http://$SERVER:8787/health

echo ""
echo "Frontend:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://$SERVER:5173/

echo ""
echo "Docker Containers:"
ssh root@$SERVER 'docker ps --format "table {{.Names}}\t{{.Status}}"'
```

---

## 🚨 Emergency Procedures

### Complete Restart

```bash
ssh root@178.156.187.81 << 'EOF'
    cd /opt/dytallix-fast-launch
    docker-compose down
    docker system prune -f
    ./deploy.sh
EOF
```

### Backup Data

```bash
# Backup blockchain data
ssh root@178.156.187.81 'tar -czf /tmp/dytallix-backup-$(date +%Y%m%d).tar.gz /opt/dytallix-fast-launch/data/'

# Download backup
scp root@178.156.187.81:/tmp/dytallix-backup-*.tar.gz ./backups/
```

### Restore from Backup

```bash
# Upload backup
scp ./backups/dytallix-backup-YYYYMMDD.tar.gz root@178.156.187.81:/tmp/

# Restore
ssh root@178.156.187.81 'cd /opt/dytallix-fast-launch && tar -xzf /tmp/dytallix-backup-YYYYMMDD.tar.gz'
```

---

## 📞 Support & Resources

### Quick Links
- **Server Console**: https://console.hetzner.com
- **Project Docs**: `/Users/rickglenn/dytallix/dytallix-fast-launch/docs/`
- **Deployment Files**: `DEPLOYMENT_FILES_LIST.md`

### Common Issues
1. **Out of Memory**: Increase swap or upgrade to CX31 (8GB RAM)
2. **Disk Full**: Clean Docker: `docker system prune -af --volumes`
3. **Network Issues**: Check Hetzner firewall settings in console

---

## 📝 Deployment Log

Keep track of your deployments:

| Date | Version | Status | Notes |
|------|---------|--------|-------|
| 2025-10-11 | 1.0.0 | Initial | First deployment to Hetzner |
|  |  |  |  |

---

**Last Updated:** October 11, 2025  
**Server Status:** Ready for Deployment  
**Next Steps:** Run `./scripts/deploy-to-hetzner.sh full`
