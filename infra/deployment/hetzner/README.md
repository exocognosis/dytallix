# Dytallix Hetzner Deployment

This directory contains the complete deployment configuration for running Dytallix on Hetzner Cloud infrastructure. The deployment uses Docker Compose to orchestrate all services and provides comprehensive monitoring, logging, and management tools.

## 🏗️ Architecture Overview

The Hetzner deployment includes:

- **Blockchain Node**: Dytallix consensus node with P2P networking
- **Frontend**: React-based web application
- **Explorer**: Blockchain explorer for transaction and block viewing
- **Faucet**: Token distribution service for testnet
- **Bridge**: Cross-chain bridge service
- **Monitoring Stack**: Prometheus, Grafana, Loki, Promtail
- **Infrastructure**: PostgreSQL, Redis, Traefik (reverse proxy with SSL)

## 📁 Directory Structure

```
deployment/hetzner/
├── docker-compose/
│   ├── docker-compose.yml     # Main orchestration file
│   └── .env.example          # Environment variables template
├── scripts/
│   ├── deploy.sh             # Main deployment script
│   ├── setup-server.sh       # Server preparation script
│   ├── backup-restore.sh     # Data migration tools
│   ├── monitor.sh            # Health monitoring
│   └── maintenance.sh        # Update and maintenance
├── nginx/
│   ├── nginx.conf            # Main nginx configuration
│   └── frontend.conf         # Frontend-specific config
└── monitoring/
    ├── prometheus.yml        # Prometheus configuration
    ├── loki.yml             # Loki configuration
    ├── promtail.yml         # Promtail configuration
    └── grafana/
        └── provisioning/     # Grafana datasources
```

## 🚀 Quick Start

### 1. Server Preparation

First, prepare your Hetzner server:

```bash
# On your Hetzner server (as root)
curl -sSL https://raw.githubusercontent.com/your-repo/dytallix/main/deployment/hetzner/scripts/setup-server.sh | bash
```

Or manually:

```bash
# Copy setup script to server
scp scripts/setup-server.sh root@your-server:/tmp/
ssh root@your-server "bash /tmp/setup-server.sh"
```

### 2. Deploy Dytallix

```bash
# Copy deployment files to server
rsync -av deployment/hetzner/ dytallix@your-server:~/dytallix/

# SSH to server
ssh dytallix@your-server

# Configure environment
cd ~/dytallix/docker-compose
cp .env.example .env
nano .env  # Edit configuration

# Deploy
../scripts/deploy.sh
```

### 3. Monitor Deployment

```bash
# Check service status
../scripts/monitor.sh

# View logs
../scripts/monitor.sh logs

# Generate health report
../scripts/monitor.sh report
```

## ⚙️ Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Domain configuration
DOMAIN=yourdomain.com
SERVER_IP=your.server.ip

# Blockchain configuration
CHAIN_ID=dytallix-testnet-1
MONIKER=my-validator

# Database credentials
POSTGRES_PASSWORD=secure_password
REDIS_PASSWORD=secure_password

# Monitoring credentials
GRAFANA_PASSWORD=admin_password

# SSL configuration (for Traefik)
ACME_EMAIL=your@email.com
```

### Key Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `DOMAIN` | Your domain name | `dytallix.local` |
| `SERVER_IP` | Server IP address | Auto-detected |
| `CHAIN_ID` | Blockchain chain ID | `dytallix-testnet-1` |
| `MONIKER` | Node identifier | `dytallix-node` |
| `POSTGRES_PASSWORD` | Database password | `changeme123` |
| `GRAFANA_PASSWORD` | Grafana admin password | `admin123` |

## 🔧 Service Management

### Using Docker Compose

```bash
cd docker-compose/

# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Restart specific service
docker-compose restart dytallix-node

# Scale service
docker-compose up -d --scale frontend=3
```

### Using Management Scripts

```bash
# Update all services
scripts/maintenance.sh update --backup

# Restart services
scripts/maintenance.sh restart dytallix-node

# Scale services
scripts/maintenance.sh scale frontend 3

# Rebuild service
scripts/maintenance.sh rebuild bridge --pull

# Clean up Docker resources
scripts/maintenance.sh cleanup
```

## 📊 Monitoring and Logging

### Access Points

- **Grafana Dashboard**: `https://monitoring.yourdomain.com`
- **Prometheus**: `https://prometheus.yourdomain.com` (internal)
- **Blockchain RPC**: `https://rpc.yourdomain.com`
- **Explorer**: `https://explorer.yourdomain.com`
- **Faucet**: `https://faucet.yourdomain.com`

### Health Monitoring

```bash
# Run health checks
scripts/monitor.sh check

# View specific service logs
scripts/monitor.sh logs dytallix-node

# Generate detailed report
scripts/monitor.sh report
```

### Log Management

Logs are collected by Promtail and sent to Loki:

- Container logs: Automatically collected
- System logs: Available in Grafana
- Application logs: Available via Loki queries

## 🔄 Data Migration

### From GCP to Hetzner

```bash
# On GCP (backup)
scripts/backup-restore.sh backup-all --source-cluster gke_project_zone_cluster

# Transfer backup to Hetzner
scp -r /tmp/dytallix-backup-* dytallix@hetzner-server:~/

# On Hetzner (restore)
scripts/backup-restore.sh restore-hetzner --backup-dir ~/dytallix-backup-*
```

### Backup Types

- **Genesis Files**: Blockchain configuration and genesis state
- **Database**: PostgreSQL and Redis data
- **Blockchain Data**: Node state and blockchain history
- **Configuration**: All service configurations

## 🔐 Security Features

### Network Security

- UFW firewall with restrictive rules
- Fail2ban for intrusion prevention
- Non-root service execution
- Private Docker networks

### SSL/TLS

- Automatic SSL certificates via Let's Encrypt
- HTTPS-only access for public endpoints
- Secure headers and HSTS

### Access Control

- SSH key-based authentication
- Dedicated service user accounts
- Database access restrictions
- Internal service communication only

## 🚦 Service Endpoints

### Public Endpoints

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | `https://yourdomain.com` | Main application |
| Explorer | `https://explorer.yourdomain.com` | Blockchain explorer |
| Faucet | `https://faucet.yourdomain.com` | Token faucet |
| RPC | `https://rpc.yourdomain.com` | Blockchain RPC |
| Monitoring | `https://monitoring.yourdomain.com` | Grafana dashboard |

### Internal Endpoints

| Service | Port | Purpose |
|---------|------|---------|
| Blockchain Node | 26657 | RPC server |
| Blockchain Node | 26656 | P2P networking |
| Bridge Service | 8080 | API server |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache |
| Prometheus | 9090 | Metrics |

## 🔧 Troubleshooting

### Common Issues

**Services won't start:**
```bash
# Check Docker status
docker info

# Check compose file syntax
docker-compose config

# View service logs
docker-compose logs service-name
```

**Network connectivity issues:**
```bash
# Check firewall rules
sudo ufw status

# Test port connectivity
nc -zv localhost 26657

# Check Docker networks
docker network ls
```

**Performance issues:**
```bash
# Check system resources
free -h
df -h
top

# Monitor container resources
docker stats
```

### Log Locations

- **Docker containers**: `docker-compose logs`
- **Nginx**: `/var/log/nginx/`
- **System**: `journalctl -u docker`
- **Monitoring**: Grafana → Explore → Loki

## 📈 Performance Tuning

### Resource Allocation

Recommended server specifications:
- **CPU**: 4+ cores
- **RAM**: 8GB+ (16GB recommended)
- **Storage**: 100GB+ SSD
- **Network**: 1Gbps+

### Docker Configuration

```bash
# Optimize Docker daemon
sudo nano /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
```

### Database Optimization

PostgreSQL settings in docker-compose.yml:
- `shared_buffers`: 25% of RAM
- `effective_cache_size`: 75% of RAM
- `checkpoint_segments`: 32+

## 🔄 Updates and Maintenance

### Regular Maintenance

```bash
# Weekly health check
scripts/monitor.sh check
scripts/monitor.sh report

# Monthly updates
scripts/maintenance.sh update --backup

# Quarterly cleanup
scripts/maintenance.sh cleanup
```

### Update Procedures

1. **Create backup**: `scripts/maintenance.sh backup`
2. **Pull latest images**: `docker-compose pull`
3. **Rolling update**: `scripts/maintenance.sh rolling-update`
4. **Verify health**: `scripts/monitor.sh check`

## 🆘 Support and Contact

### Getting Help

1. Check logs: `scripts/monitor.sh logs`
2. Run health check: `scripts/monitor.sh check`
3. Generate report: `scripts/monitor.sh report`
4. Review troubleshooting guide above

### Contributing

1. Test changes on staging environment
2. Update documentation
3. Submit pull request with detailed description

## 📄 License

This deployment configuration is part of the Dytallix project. See the main project LICENSE file for details.

---

**⚠️ Important Notes:**

- Always test deployments on staging before production
- Keep regular backups of critical data
- Monitor resource usage and scale as needed
- Follow security best practices for production deployments
- Keep all components updated with latest security patches
