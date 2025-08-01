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
