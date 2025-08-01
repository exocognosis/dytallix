# Dytallix Testnet Dashboard Deployment

This directory contains everything needed to deploy the Dytallix testnet dashboard.

## Quick Start

### Local Development
```bash
./serve_local.sh
```
Open http://localhost:8000

### Production Deployment
```bash
./deploy_production.sh
```

## Directory Structure

```
testnet/
├── index.html              # Main dashboard page
├── docs/                   # Documentation files
├── scripts/                # Deployment scripts
│   ├── deploy_testnet.sh  # This deployment script
│   ├── deploy_production.sh
│   ├── serve_local.sh
│   └── update_site.sh
├── site/                   # Generated site files
├── nginx.conf              # Nginx configuration
├── Dockerfile              # Docker container config
└── docker-compose.yml      # Docker Compose config
```

## Manual Setup

### 1. Install Dependencies

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install nginx docker.io docker-compose curl
```

**CentOS/RHEL:**
```bash
sudo yum install nginx docker docker-compose curl
sudo systemctl enable docker
sudo systemctl start docker
```

**macOS:**
```bash
brew install nginx docker docker-compose
```

### 2. Configure Nginx

Copy the nginx configuration:
```bash
sudo cp nginx.conf /etc/nginx/sites-available/testnet.dytallix.com
sudo ln -s /etc/nginx/sites-available/testnet.dytallix.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Setup SSL (Production)

For production, add SSL certificates:
```bash
# Using Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d testnet.dytallix.com
```

### 4. Deploy Site Files

```bash
sudo mkdir -p /var/www/dytallix-testnet
sudo cp -r site/* /var/www/dytallix-testnet/
sudo chown -R www-data:www-data /var/www/dytallix-testnet
```

## DNS Configuration

Point your domain to the server:
```
testnet.dytallix.com.  300  IN  A  YOUR_SERVER_IP
```

## Monitoring

The deployment includes Prometheus monitoring:
- Prometheus: http://localhost:9090
- Metrics endpoint: http://localhost:9090/metrics

## Troubleshooting

### Check service status:
```bash
docker-compose ps
docker-compose logs
```

### Test nginx configuration:
```bash
sudo nginx -t
```

### Check site accessibility:
```bash
curl -I http://testnet.dytallix.com
```

### View logs:
```bash
docker-compose logs -f testnet-dashboard
```

## Updates

To update the site:
```bash
./update_site.sh
```

## Support

- Documentation: ./docs/
- GitHub: https://github.com/HisMadRealm/dytallix
- Discord: https://discord.gg/fw34A8bK
- Email: hello@dytallix.com
