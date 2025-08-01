#!/bin/bash

# Dytallix Testnet Website Deployment Script
# This script sets up the testnet dashboard for hosting

set -e

echo "🚀 Deploying Dytallix Testnet Dashboard..."

# Configuration
SITE_DIR="./site"
TESTNET_DOMAIN="testnet.dytallix.com"
BACKUP_DIR="./backup"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command -v nginx &> /dev/null; then
        warn "nginx not found, will provide installation instructions"
    fi
    
    if ! command -v docker &> /dev/null; then
        warn "docker not found, will provide installation instructions"
    fi
    
    if ! command -v node &> /dev/null; then
        warn "node.js not found, will provide installation instructions"
    fi
}

# Create site directory structure
setup_site_structure() {
    log "Setting up site structure..."
    
    # Create directories
    mkdir -p $SITE_DIR
    mkdir -p $SITE_DIR/css
    mkdir -p $SITE_DIR/js
    mkdir -p $SITE_DIR/docs
    mkdir -p $SITE_DIR/api
    
    # Copy main files
    cp ../index.html $SITE_DIR/
    cp -r ../docs/* $SITE_DIR/docs/
    cp -r ../init/logs/*.csv $SITE_DIR/docs/ 2>/dev/null || true
    cp -r ../init/logs/*.json $SITE_DIR/docs/ 2>/dev/null || true
    
    log "Site structure created in $SITE_DIR"
}

# Generate nginx configuration
generate_nginx_config() {
    log "Generating nginx configuration..."
    
    cat > nginx.conf << 'EOF'
server {
    listen 80;
    server_name testnet.dytallix.com;
    root /var/www/dytallix-testnet;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Main site
    location / {
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, no-transform";
    }

    # API proxy to blockchain nodes
    location /api/ {
        proxy_pass http://api.dytallix.com:1317/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers "Authorization, Content-Type";
    }

    # RPC proxy
    location /rpc/ {
        proxy_pass http://rpc.dytallix.com:26657/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket proxy
    location /websocket {
        proxy_pass http://rpc.dytallix.com:26657/websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Documentation
    location /docs/ {
        expires 1d;
        add_header Cache-Control "public, no-transform";
    }

    # Static assets
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable, no-transform";
    }

    # Security: block access to hidden files
    location ~ /\. {
        deny all;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}

# HTTPS redirect (for production)
server {
    listen 443 ssl http2;
    server_name testnet.dytallix.com;
    
    # SSL configuration (add your certificates)
    # ssl_certificate /path/to/certificate.crt;
    # ssl_certificate_key /path/to/private.key;
    
    # Include the main configuration
    include /etc/nginx/sites-available/testnet.dytallix.com;
}
EOF

    log "Nginx configuration generated"
}

# Create Docker configuration
generate_docker_config() {
    log "Generating Docker configuration..."
    
    cat > Dockerfile << 'EOF'
FROM nginx:alpine

# Copy website files
COPY site/ /usr/share/nginx/html/

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
EOF

    cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  testnet-dashboard:
    build: .
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./logs:/var/log/nginx
    environment:
      - NGINX_HOST=testnet.dytallix.com
      - NGINX_PORT=80
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Optional: Add monitoring
  monitoring:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    restart: unless-stopped

networks:
  default:
    driver: bridge
EOF

    log "Docker configuration generated"
}

# Create deployment scripts
create_deployment_scripts() {
    log "Creating deployment scripts..."
    
    # Production deployment script
    cat > deploy_production.sh << 'EOF'
#!/bin/bash

# Production deployment script for Dytallix testnet dashboard

set -e

echo "🚀 Deploying to production..."

# Build and deploy with Docker
docker-compose down || true
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services..."
sleep 10

# Health check
if curl -f http://localhost/ > /dev/null 2>&1; then
    echo "✅ Deployment successful!"
    echo "🌐 Site available at: http://testnet.dytallix.com"
else
    echo "❌ Deployment failed - health check failed"
    exit 1
fi

# Show logs
echo "📊 Recent logs:"
docker-compose logs --tail=20
EOF

    # Development server script
    cat > serve_local.sh << 'EOF'
#!/bin/bash

# Local development server for testnet dashboard

echo "🔧 Starting local development server..."

# Check if Python is available
if command -v python3 &> /dev/null; then
    echo "📡 Server running at: http://localhost:8000"
    echo "🛑 Press Ctrl+C to stop"
    cd site && python3 -m http.server 8000
elif command -v python &> /dev/null; then
    echo "📡 Server running at: http://localhost:8000"
    echo "🛑 Press Ctrl+C to stop"
    cd site && python -m SimpleHTTPServer 8000
elif command -v node &> /dev/null && command -v npx &> /dev/null; then
    echo "📡 Server running at: http://localhost:8000"
    echo "🛑 Press Ctrl+C to stop"
    cd site && npx http-server -p 8000
else
    echo "❌ No suitable web server found"
    echo "Please install Python 3 or Node.js to run local server"
    exit 1
fi
EOF

    # Update script
    cat > update_site.sh << 'EOF'
#!/bin/bash

# Update script for testnet dashboard

echo "🔄 Updating testnet dashboard..."

# Pull latest changes
git pull origin main

# Rebuild site
./deploy_testnet.sh

# Restart services
docker-compose restart

echo "✅ Update complete!"
EOF

    # Make scripts executable
    chmod +x deploy_production.sh
    chmod +x serve_local.sh
    chmod +x update_site.sh
    
    log "Deployment scripts created"
}

# Create monitoring configuration
setup_monitoring() {
    log "Setting up monitoring..."
    
    mkdir -p monitoring
    
    cat > monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'testnet-dashboard'
    static_configs:
      - targets: ['localhost:80']

  - job_name: 'dytallix-rpc'
    static_configs:
      - targets: ['rpc.dytallix.com:26657']
    scrape_interval: 30s

  - job_name: 'dytallix-api'
    static_configs:
      - targets: ['api.dytallix.com:1317']
    scrape_interval: 30s
EOF

    log "Monitoring configuration created"
}

# Generate README for deployment
generate_deployment_readme() {
    log "Generating deployment README..."
    
    cat > DEPLOYMENT.md << 'EOF'
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
EOF

    log "Deployment README generated"
}

# Main deployment function
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                 Dytallix Testnet Dashboard                  ║"
    echo "║                    Deployment Script                        ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    check_prerequisites
    setup_site_structure
    generate_nginx_config
    generate_docker_config
    create_deployment_scripts
    setup_monitoring
    generate_deployment_readme
    
    echo -e "${GREEN}"
    echo "🎉 Deployment setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. For local testing: ./serve_local.sh"
    echo "2. For production: ./deploy_production.sh"
    echo "3. Configure DNS to point testnet.dytallix.com to your server"
    echo "4. For SSL: Follow instructions in DEPLOYMENT.md"
    echo ""
    echo "📁 Site files: $SITE_DIR"
    echo "📖 Documentation: $SITE_DIR/docs"
    echo "🔧 Configuration: nginx.conf, docker-compose.yml"
    echo -e "${NC}"
}

# Run main function
main "$@"
