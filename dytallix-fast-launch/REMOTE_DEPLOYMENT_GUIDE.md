# Dytallix Fast Launch - Deployment Guide

## 🚀 Quick Deployment to Remote Server

This guide provides step-by-step instructions for deploying Dytallix Fast Launch to a remote server.

---

## 📋 Prerequisites

### Local Machine
- Git installed
- SSH access to remote server
- rsync or scp available

### Remote Server
- Ubuntu 20.04+ or Debian 11+ (recommended)
- Minimum 4GB RAM, 50GB disk space
- Port access: 22 (SSH), 3030, 8787, 5173, 9090, 3000
- Internet connectivity

---

## 🎯 Deployment Methods

### Method 1: Automated Deployment (Recommended)

Use the automated deployment script that handles everything:

```bash
# From your local dytallix-fast-launch directory
cd /path/to/dytallix/dytallix-fast-launch

# Run automated deployment
./scripts/deployment/deploy-to-remote.sh \
  --server YOUR_SERVER_IP \
  --user root \
  --key ~/.ssh/your-key.pem
```

**What it does:**
1. ✅ Tests SSH connection
2. ✅ Installs Docker & Docker Compose if needed
3. ✅ Prepares deployment package
4. ✅ Transfers files to server
5. ✅ Extracts and sets up environment
6. ✅ Optionally starts deployment

### Method 2: Manual Deployment

#### Step 1: Prepare Deployment Package

```bash
# From dytallix-fast-launch directory
cd /path/to/dytallix/dytallix-fast-launch

# Create deployment package
./scripts/deployment/prepare-deployment-package.sh

# Package will be created in ../build/dytallix-fast-launch-TIMESTAMP.tar.gz
```

#### Step 2: Transfer to Server

```bash
# Using SCP
scp ../build/dytallix-fast-launch-*.tar.gz user@server-ip:/opt/

# Or using rsync
rsync -avz --progress ../build/dytallix-fast-launch-*/ user@server-ip:/opt/dytallix-fast-launch/
```

#### Step 3: Deploy on Server

```bash
# SSH to server
ssh user@server-ip

# Extract package
cd /opt
tar -xzf dytallix-fast-launch-*.tar.gz
cd dytallix-fast-launch-*

# Configure environment
cp .env.example .env
nano .env  # Edit configuration

# Deploy
./deploy.sh
```

### Method 3: Direct rsync (For Development)

For quick iterations during development:

```bash
# Sync files directly (excludes build artifacts)
rsync -avz --progress \
  --exclude='node_modules' \
  --exclude='target' \
  --exclude='*.log' \
  --exclude='dist' \
  --exclude='data' \
  --exclude='.git' \
  /path/to/dytallix/dytallix-fast-launch/ \
  user@server-ip:/opt/dytallix-fast-launch/

# Then SSH and deploy
ssh user@server-ip
cd /opt/dytallix-fast-launch
./deploy.sh
```

---

## ⚙️ Environment Configuration

### Required Environment Variables

Edit `.env` on the server before deployment:

```bash
# Chain Configuration
VITE_CHAIN_ID=dytallix-gov-e2e
VITE_LCD_HTTP_URL=http://localhost:1317
VITE_RPC_HTTP_URL=http://localhost:3030
VITE_RPC_WS_URL=ws://localhost:3030/websocket

# API Configuration
VITE_API_URL=http://localhost:8787

# Faucet Configuration (Server Side)
FAUCET_MNEMONIC="your twelve or twenty four word mnemonic here"
FAUCET_MAX_PER_REQUEST_DGT=1000000000
FAUCET_MAX_PER_REQUEST_DRT=1000000000
FAUCET_COOLDOWN_MINUTES=60
FAUCET_GAS_PRICE=0.025

# Node Configuration
NODE_PORT=3030
API_PORT=8787
FRONTEND_PORT=5173

# Enable Services
ENABLE_OBSERVABILITY=true
```

### Security Notes

⚠️ **NEVER** commit real mnemonics or private keys to git!

- Generate a new mnemonic for production faucet
- Use strong, unique passwords
- Restrict server firewall rules
- Use HTTPS in production (add nginx/traefik)

---

## 🔍 Verification Steps

### 1. Check Service Health

```bash
# SSH to server
ssh user@server-ip

# Check all containers
cd /opt/dytallix-fast-launch
docker-compose ps

# View logs
docker-compose logs -f
```

### 2. Test Endpoints

```bash
# Node RPC
curl http://server-ip:3030/status

# API/Faucet Health
curl http://server-ip:8787/health

# Frontend (should return HTML)
curl http://server-ip:5173/
```

### 3. Test Faucet

```bash
# Request test tokens
curl -X POST http://server-ip:8787/faucet \
  -H "Content-Type: application/json" \
  -d '{
    "address": "dytallix1...",
    "denom": "udgt"
  }'
```

---

## 📊 Monitoring

### Access Monitoring Services

- **Prometheus**: http://server-ip:9090
  - Metrics collection and queries
  
- **Grafana**: http://server-ip:3000
  - Default credentials: admin/admin
  - Pre-configured dashboards for node metrics

- **Jaeger**: http://server-ip:16686 (if observability enabled)
  - Distributed tracing

### Key Metrics to Monitor

- Block height: `dytallix_block_height`
- Transaction count: `dytallix_tx_count`
- Peer connections: `dytallix_peer_count`
- Faucet requests: `faucet_requests_total`

---

## 🐛 Troubleshooting

### Services Won't Start

```bash
# Check logs for errors
docker-compose logs dytallix-node
docker-compose logs api-server
docker-compose logs frontend

# Check disk space
df -h

# Check memory
free -h

# Restart services
docker-compose restart
```

### Port Conflicts

```bash
# Check what's using a port
lsof -i :3030
netstat -tuln | grep 3030

# Kill process using port
kill -9 $(lsof -t -i:3030)
```

### Docker Issues

```bash
# Clean up Docker
docker system prune -a

# Rebuild images
docker-compose build --no-cache

# Reset everything
docker-compose down -v
docker system prune -a --volumes
./deploy.sh
```

### Faucet Not Working

```bash
# Check faucet logs
docker-compose logs api-server | grep faucet

# Verify mnemonic is set
docker-compose exec api-server env | grep FAUCET_MNEMONIC

# Test wallet
docker-compose exec api-server node -e "console.log(process.env.FAUCET_MNEMONIC)"
```

---

## 🔄 Updates and Maintenance

### Updating the Deployment

```bash
# On local machine, prepare new package
cd /path/to/dytallix/dytallix-fast-launch
git pull
./scripts/deployment/prepare-deployment-package.sh

# Transfer to server
scp ../build/dytallix-fast-launch-*.tar.gz user@server-ip:/tmp/

# On server
ssh user@server-ip
cd /opt/dytallix-fast-launch

# Backup current deployment
docker-compose down
cd /opt
mv dytallix-fast-launch dytallix-fast-launch.backup

# Extract new version
tar -xzf /tmp/dytallix-fast-launch-*.tar.gz
mv dytallix-fast-launch-* dytallix-fast-launch
cd dytallix-fast-launch

# Copy .env from backup
cp ../dytallix-fast-launch.backup/.env .

# Deploy
./deploy.sh
```

### Backup Important Data

```bash
# Backup blockchain data
docker-compose exec dytallix-node tar -czf /tmp/blockchain-data.tar.gz /root/.dytallix

# Copy backup off server
docker cp $(docker-compose ps -q dytallix-node):/tmp/blockchain-data.tar.gz ./
scp user@server-ip:/opt/dytallix-fast-launch/blockchain-data.tar.gz ./backups/

# Backup configuration
tar -czf config-backup.tar.gz .env docker-compose.yml
```

---

## 📞 Support

### Logs Location

- Node logs: `docker-compose logs dytallix-node`
- API logs: `docker-compose logs api-server`
- Frontend logs: `docker-compose logs frontend`
- All logs: `docker-compose logs -f`

### Common Issues

1. **"Cannot connect to Docker daemon"**
   - Solution: `sudo systemctl start docker`
   - Add user to docker group: `sudo usermod -aG docker $USER`

2. **"Port already in use"**
   - Change ports in `.env` file
   - Or stop conflicting service

3. **"Out of memory"**
   - Upgrade server RAM
   - Add swap space
   - Reduce Docker container limits

4. **"Genesis file not found"**
   - Verify `genesis.json` is in deployment directory
   - Re-run deployment package preparation

---

## 🌐 Production Considerations

### Security Hardening

- [ ] Use HTTPS with valid SSL certificates
- [ ] Set up firewall (ufw/iptables)
- [ ] Restrict SSH access (key-only, no root)
- [ ] Enable fail2ban
- [ ] Regular security updates
- [ ] Rotate credentials regularly

### Performance Optimization

- [ ] Use SSD storage
- [ ] Enable Docker logging rotation
- [ ] Set up log aggregation
- [ ] Configure Prometheus retention
- [ ] Use CDN for frontend assets

### High Availability

- [ ] Set up multiple validator nodes
- [ ] Use load balancer for API
- [ ] Implement database replication
- [ ] Configure automated backups
- [ ] Set up monitoring alerts

---

## 📚 Additional Resources

- [Deployment Files List](DEPLOYMENT_FILES_LIST.md) - Complete file inventory
- [Fast Launch Summary](FAST_LAUNCH_SUMMARY.md) - Technical overview
- [Builder Guide](BUILDER_GUIDE.md) - Development setup
- [README](README.md) - Project overview

---

**Last Updated:** October 2025  
**Version:** 1.0.0  
**Status:** Production Ready ✅
