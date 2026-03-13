#!/bin/bash
# Deploy Dytallix frontend with SSL setup

set -e

SERVER="root@65.109.188.158"
LOCAL_BUILD_DIR="/Users/rickglenn/dytallix/dytallix-fast-launch/frontend/dist"
REMOTE_WEB_DIR="/var/www/dytallix"

echo "🚀 Deploying Dytallix Frontend with SSL..."
echo ""

# Step 1: Build frontend locally
echo "📦 Building frontend..."
cd /Users/rickglenn/dytallix/dytallix-fast-launch/frontend
npm run build

echo ""
echo "✅ Build complete!"
echo ""

# Step 2: Deploy to server
echo "📤 Deploying to Hetzner server..."
rsync -avz --delete ${LOCAL_BUILD_DIR}/ ${SERVER}:${REMOTE_WEB_DIR}/

echo ""
echo "✅ Files deployed!"
echo ""

# Step 3: Setup SSL on server
echo "🔒 Setting up SSL/HTTPS on server..."
scp /Users/rickglenn/dytallix/setup-ssl.sh ${SERVER}:/tmp/
ssh ${SERVER} "bash /tmp/setup-ssl.sh"

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "🌐 Your site is now available at:"
echo "   HTTP:  http://65.109.188.158 (redirects to HTTPS)"
echo "   HTTPS: https://65.109.188.158"
echo ""
echo "⚠️  Browser Warning:"
echo "   Because we're using a self-signed certificate, your browser will show"
echo "   a security warning. This is expected. Click 'Advanced' > 'Proceed to site'."
echo ""
echo "🎯 For production (no warnings), you should:"
echo "   1. Register a domain name (e.g., dytallix.io)"
echo "   2. Point it to 65.109.188.158"
echo "   3. On the server, run: certbot --nginx -d yourdomain.com"
echo ""
