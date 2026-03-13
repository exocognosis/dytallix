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
