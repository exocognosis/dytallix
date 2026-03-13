#!/bin/bash
# Setup SSL/HTTPS for dytallix.com on Hetzner server

set -e

DOMAIN="dytallix.com"
EMAIL="therickglenn@gmail.com"

echo "🔒 Setting up HTTPS with Let's Encrypt for ${DOMAIN}..."
echo ""

# Install certbot and nginx if not already installed
echo "📦 Installing dependencies..."
apt-get update
apt-get install -y certbot python3-certbot-nginx nginx

# Create nginx config for dytallix.com
echo "📝 Creating nginx configuration..."
cat > /etc/nginx/sites-available/dytallix << EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};
    
    root /var/www/dytallix;
    index index.html;
    
    # SPA routing - serve index.html for all routes
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|wasm)$ {
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
echo ""

# Get Let's Encrypt SSL certificate
echo "🔐 Obtaining Let's Encrypt SSL certificate..."
echo "   This may take a minute..."
echo ""

certbot --nginx \
  -d ${DOMAIN} \
  -d www.${DOMAIN} \
  --non-interactive \
  --agree-tos \
  --email ${EMAIL} \
  --redirect

echo ""
echo "✅ SSL certificate obtained and installed!"
echo ""
echo "🎉 Setup complete!"
echo ""
echo "🌐 Your site is now available at:"
echo "   https://dytallix.com"
echo "   https://www.dytallix.com"
echo ""
echo "🔒 SSL certificate will auto-renew via certbot systemd timer"
echo ""
echo "📋 Certificate details:"
certbot certificates
