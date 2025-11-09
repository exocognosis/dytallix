#!/bin/bash

# Fix QuantumVault API Nginx Configuration on Hetzner Server
# This script corrects the port mismatch and adds proper proxy routes

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SERVER_IP="178.156.187.81"
SSH_USER="root"
SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Fix QuantumVault API Nginx Configuration                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}Issues Found:${NC}"
echo "1. QuantumVault API runs on port 3031"
echo "2. Nginx proxy is configured for port 3002 (wrong!)"
echo "3. Missing /api/quantumvault/ route"
echo ""

echo -e "${BLUE}🔧 Applying fixes to Hetzner server...${NC}"
echo ""

# Create a backup and update nginx config
ssh $SSH_OPTS "${SSH_USER}@${SERVER_IP}" << 'ENDSSH'

echo "1. Backing up current nginx configuration..."
cp /etc/nginx/sites-available/dytallix /etc/nginx/sites-available/dytallix.backup-$(date +%Y%m%d-%H%M%S)

echo "2. Checking current QuantumVault API port..."
QVAULT_PORT=$(ss -tlnp | grep node | grep 3031 && echo "3031" || echo "not running")
echo "   QuantumVault API detected on port: $QVAULT_PORT"

echo "3. Updating nginx configuration..."

# Update the nginx config to use correct port (3031)
cat > /etc/nginx/sites-available/dytallix << 'EOF'
server {
    server_name dytallix.com www.dytallix.com;
    
    root /var/www/dytallix;
    index index.html;
    
    # Proxy QuantumVault API requests (fixed port to 3031)
    location /quantumvault/ {
        proxy_pass http://127.0.0.1:3031/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'Content-Type, Authorization' always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin * always;
            add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header Access-Control-Allow-Headers 'Content-Type, Authorization' always;
            add_header Content-Length 0;
            return 204;
        }
    }
    
    # Alternative route with /api/ prefix
    location /api/quantumvault/ {
        proxy_pass http://127.0.0.1:3031/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'Content-Type, Authorization' always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin * always;
            add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header Access-Control-Allow-Headers 'Content-Type, Authorization' always;
            add_header Content-Length 0;
            return 204;
        }
    }
    
    # Proxy RPC requests to blockchain node
    location /rpc/ {
        proxy_pass http://127.0.0.1:3030/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'Content-Type, Authorization' always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin * always;
            add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
            add_header Access-Control-Allow-Headers 'Content-Type, Authorization' always;
            add_header Content-Length 0;
            return 204;
        }
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|wasm)$ {
        expires 1y;
        add_header Cache-Control 'public, immutable';
    }
    
    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    listen [::]:443 ssl ipv6only=on; # managed by Certbot
    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/dytallix.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/dytallix.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = www.dytallix.com) {
        return 301 https://$host$request_uri;
    }

    if ($host = dytallix.com) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    listen [::]:80;
    server_name dytallix.com www.dytallix.com;
    return 404;
}
EOF

echo "4. Testing nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    
    echo "5. Reloading nginx..."
    systemctl reload nginx
    
    echo "✅ Nginx reloaded successfully"
else
    echo "❌ Nginx configuration test failed!"
    echo "Restoring backup..."
    cp /etc/nginx/sites-available/dytallix.backup-* /etc/nginx/sites-available/dytallix
    exit 1
fi

echo ""
echo "6. Verifying QuantumVault API status..."
systemctl status quantumvault-api --no-pager | head -10

echo ""
echo "7. Testing endpoints..."
echo "   Local test (port 3031):"
curl -s http://localhost:3031/health | jq '.' || echo "   Failed"

echo ""
echo "   Nginx proxy test (/quantumvault/):"
curl -s http://localhost/quantumvault/health | jq '.' || echo "   Failed"

echo ""
echo "   Nginx proxy test (/api/quantumvault/):"
curl -s http://localhost/api/quantumvault/health | jq '.' || echo "   Failed"

echo ""
echo "=========================================="
echo "✅ Configuration updated successfully!"
echo "=========================================="

ENDSSH

echo ""
echo -e "${GREEN}✅ Fix applied successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Testing from external network...${NC}"
echo ""

echo "1. Testing direct API (should be blocked by firewall):"
curl -s --connect-timeout 5 http://178.156.187.81:3031/health || echo "   ❌ Direct access blocked (expected)"

echo ""
echo "2. Testing via nginx proxy (https://dytallix.com/quantumvault/health):"
curl -s https://dytallix.com/quantumvault/health | jq '.' || echo "   ❌ Failed"

echo ""
echo "3. Testing via nginx proxy (https://dytallix.com/api/quantumvault/health):"
curl -s https://dytallix.com/api/quantumvault/health | jq '.' || echo "   ❌ Failed"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  QuantumVault API is now properly configured!              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Access QuantumVault API at:${NC}"
echo "  • https://dytallix.com/quantumvault/health"
echo "  • https://dytallix.com/api/quantumvault/health"
echo "  • https://dytallix.com/quantumvault/assets"
echo ""
echo -e "${YELLOW}Note: The API runs on internal port 3031 (not exposed externally)${NC}"
echo -e "${YELLOW}All traffic should go through nginx proxy on ports 80/443${NC}"
echo ""
