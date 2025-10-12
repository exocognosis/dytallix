#!/bin/bash
# Setup SSL/HTTPS for Dytallix on Hetzner server

set -e

echo "🔒 Setting up HTTPS with Let's Encrypt SSL..."

# Install certbot and nginx if not already installed
echo "📦 Installing dependencies..."
apt-get update
apt-get install -y certbot python3-certbot-nginx nginx

# Check if nginx config exists
if [ ! -f /etc/nginx/sites-available/dytallix ]; then
  echo "📝 Creating nginx configuration..."
  
  # Create nginx config for HTTP (will be upgraded to HTTPS)
  cat > /etc/nginx/sites-available/dytallix << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name 65.109.188.158;
    
    root /var/www/dytallix;
    index index.html;
    
    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
  
  # Enable the site
  ln -sf /etc/nginx/sites-available/dytallix /etc/nginx/sites-enabled/
  
  # Remove default site if it exists
  rm -f /etc/nginx/sites-enabled/default
  
  # Test nginx config
  nginx -t
  
  # Restart nginx
  systemctl restart nginx
  systemctl enable nginx
  
  echo "✅ Nginx configured and running"
else
  echo "ℹ️  Nginx config already exists"
fi

# Note: Let's Encrypt requires a domain name
# Since you're using an IP address (65.109.188.158), we have two options:
# 1. Use a domain name (recommended)
# 2. Use a self-signed certificate

echo ""
echo "⚠️  IMPORTANT: Let's Encrypt SSL certificates require a domain name."
echo ""
echo "Options:"
echo "1. Point a domain to your server IP (65.109.188.158) and use Let's Encrypt (FREE, recommended)"
echo "2. Use a self-signed certificate (works but shows browser warning)"
echo ""
echo "For production, you should:"
echo "  • Register a domain (e.g., dytallix.io, dytallix-testnet.com)"
echo "  • Point it to 65.109.188.158"
echo "  • Run: certbot --nginx -d yourdomain.com"
echo ""
echo "For now, creating a self-signed certificate..."
echo ""

# Create self-signed certificate for IP address
mkdir -p /etc/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/dytallix.key \
  -out /etc/nginx/ssl/dytallix.crt \
  -subj "/C=US/ST=State/L=City/O=Dytallix/CN=65.109.188.158"

# Update nginx config for HTTPS
cat > /etc/nginx/sites-available/dytallix << 'EOF'
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name 65.109.188.158;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name 65.109.188.158;
    
    ssl_certificate /etc/nginx/ssl/dytallix.crt;
    ssl_certificate_key /etc/nginx/ssl/dytallix.key;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    root /var/www/dytallix;
    index index.html;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Test and reload nginx
nginx -t
systemctl reload nginx

echo ""
echo "✅ SSL/HTTPS setup complete!"
echo ""
echo "🌐 Your site is now available at:"
echo "   https://65.109.188.158"
echo ""
echo "⚠️  Note: Self-signed certificates will show a browser warning."
echo "   Users must click 'Advanced' > 'Proceed to site' to continue."
echo ""
echo "🎯 For production without warnings, get a domain and run:"
echo "   certbot --nginx -d yourdomain.com"
echo ""
