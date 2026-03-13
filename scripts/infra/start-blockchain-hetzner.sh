#!/bin/bash

# Quick Fix: Start Blockchain on Hetzner
# This script properly configures PATH and starts the blockchain

set -e

SERVER_IP="178.156.187.81"
SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

echo "🚀 Starting Dytallix Blockchain on Hetzner..."
echo "=============================================="

ssh $SSH_OPTS root@$SERVER_IP << 'REMOTE_SCRIPT'

# Setup Rust environment
export PATH="/root/.cargo/bin:$PATH"
export BLOCKCHAIN_PORT=3003

# Kill any existing blockchain process
echo "Stopping any existing blockchain process..."
lsof -ti:3003 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 2

# Check if we have the blockchain source
if [ ! -d "/opt/dytallix-fast-launch/blockchain-core" ]; then
    echo "❌ Blockchain source not found!"
    exit 1
fi

# Navigate to the fast-launch directory
cd /opt/dytallix-fast-launch

# Check if binary already exists
if [ -f "target/release/dytallix-fast-node" ]; then
    echo "✅ Using existing binary"
    nohup ./target/release/dytallix-fast-node > /var/log/dytallix/blockchain.log 2>&1 &
    PID=$!
    echo "🎉 Blockchain started with PID: $PID"
else
    echo "📦 Building blockchain from source..."
    echo "⚠️  This may take 10-15 minutes..."
    
    # First add swap if needed
    if [ ! -f /swapfile ]; then
        echo "Adding 4GB swap space..."
        fallocate -l 4G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=4096
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        echo "✅ Swap added"
    fi
    
    # Build with limited parallelism to avoid OOM
    echo "Building (this will take a while)..."
    CARGO_BUILD_JOBS=2 cargo build --release --bin dytallix-fast-node 2>&1 | tee /var/log/dytallix/blockchain-build.log
    
    if [ -f "target/release/dytallix-fast-node" ]; then
        echo "✅ Build successful!"
        nohup ./target/release/dytallix-fast-node > /var/log/dytallix/blockchain.log 2>&1 &
        PID=$!
        echo "🎉 Blockchain started with PID: $PID"
    else
        echo "❌ Build failed! Check /var/log/dytallix/blockchain-build.log"
        exit 1
    fi
fi

# Wait and verify
sleep 10
if curl -sf http://localhost:3003/health > /dev/null 2>&1; then
    echo "✅ Blockchain is running!"
    curl -s http://localhost:3003/status | head -20
else
    echo "⚠️  Blockchain may still be starting..."
    echo "Check logs: tail -f /var/log/dytallix/blockchain.log"
fi

REMOTE_SCRIPT

echo ""
echo "=============================================="
echo "✅ Script completed!"
echo ""
echo "Check status:"
echo "  curl http://178.156.187.81:3003/health"
echo ""
echo "View logs:"
echo "  ssh root@178.156.187.81 'tail -f /var/log/dytallix/blockchain.log'"
