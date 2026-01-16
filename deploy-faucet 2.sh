#!/bin/bash

# Dytallix Faucet Deployment Script for Hetzner
# This script deploys the complete faucet system

set -e

echo "🚰 Deploying Dytallix Faucet System..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running on server
if [ ! -d "/root/dytallix" ]; then
    print_error "This script should be run on the Hetzner server in /root/dytallix"
    exit 1
fi

cd /root/dytallix

# Stop any existing containers
print_status "Stopping existing containers..."
docker stop dytallix-node dytallix-faucet faucet-frontend 2>/dev/null || true
docker rm dytallix-node dytallix-faucet faucet-frontend 2>/dev/null || true

# Copy deployment files to server
print_status "Setting up faucet deployment files..."

# Create docker-compose directory if it doesn't exist
mkdir -p docker-compose

# Navigate to docker-compose directory
cd docker-compose

# Copy the faucet docker-compose file (you'll need to copy this from your local machine)
print_warning "Make sure you've copied the following files to /root/dytallix/docker-compose/:"
echo "  - docker-compose-faucet.yml"
echo "  - .env.faucet"
echo "  - nginx-faucet.conf"
echo "  - faucet-frontend/index.html"

# Check if required files exist
if [ ! -f "docker-compose-faucet.yml" ]; then
    print_error "docker-compose-faucet.yml not found! Please copy it from your local machine."
    exit 1
fi

if [ ! -f ".env.faucet" ]; then
    print_error ".env.faucet not found! Please copy it from your local machine."
    exit 1
fi

# Load environment variables
source .env.faucet

# Build and start services
print_status "Building and starting faucet services..."
docker-compose -f docker-compose-faucet.yml --env-file .env.faucet up -d --build

# Wait for services to start
print_status "Waiting for services to start..."
sleep 30

# Check service status
print_status "Checking service status..."
docker-compose -f docker-compose-faucet.yml ps

# Test endpoints
print_status "Testing faucet endpoints..."

# Test health endpoint
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    print_status "✅ Faucet API is healthy!"
else
    print_warning "⚠️ Faucet API health check failed - service might still be starting"
fi

# Test frontend
if curl -f http://localhost:80 > /dev/null 2>&1; then
    print_status "✅ Frontend is accessible!"
else
    print_warning "⚠️ Frontend not accessible yet"
fi

# Show access information
print_status "🎉 Faucet deployment completed!"
echo ""
echo "Access your faucet at:"
echo "  Frontend: http://178.156.187.81"
echo "  API: http://178.156.187.81/api"
echo "  Health: http://178.156.187.81/health"
echo ""
echo "Container status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "To view logs:"
echo "  docker logs dytallix-faucet -f"
echo "  docker logs dytallix-node -f"
echo "  docker logs faucet-frontend -f"
echo ""
print_status "Developers can now request test tokens at http://178.156.187.81"
