#!/bin/bash
set -x

echo "Stopping services..."
pkill -f dytallix-fast-node || true
pkill -f dytallix-node || true
pkill -f cargo || true
pkill -f rustc || true
pkill -f "node server" || true
pkill -f vite || true
pkill -f "node index.js" || true

echo "Waiting for processes to exit..."
sleep 2

echo "Starting blockchain..."
cd /opt/dytallix-fast-launch || { echo "Directory /opt/dytallix-fast-launch not found"; exit 1; }

# Ensure log dir exists
mkdir -p /var/log/dytallix

# Check for binary
if [ -f "./target/release/dytallix-fast-node" ]; then
    BINARY="./target/release/dytallix-fast-node"
elif [ -f "./target/debug/dytallix-fast-node" ]; then
    BINARY="./target/debug/dytallix-fast-node"
else
    echo "Binary not found in target/release or target/debug"
    exit 1
fi

echo "Found binary at $BINARY"
nohup $BINARY > /var/log/dytallix/blockchain.log 2>&1 &
PID=$!
echo "Blockchain started with PID $PID"

# Wait a bit to verify it stays up
sleep 5
if ps -p $PID > /dev/null; then
   echo "Blockchain is running."
else
   echo "Blockchain failed to start. Checking logs:"
   tail -n 20 /var/log/dytallix/blockchain.log
   exit 1
fi
