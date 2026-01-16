#!/bin/bash

# Dytallix Testnet Infrastructure Startup Script
# This script starts the faucet and explorer services for development

set -e

echo "🚀 Starting Dytallix Testnet Infrastructure..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are available"

# Function to setup service
setup_service() {
    local service_name=$1
    local service_dir=$2
    
    echo "📦 Setting up $service_name..."
    
    if [ ! -d "$service_dir" ]; then
        echo "❌ Directory $service_dir not found!"
        exit 1
    fi
    
    cd "$service_dir"
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        echo "   Installing dependencies..."
        npm install
    fi
    
    # Copy environment file if it doesn't exist
    if [ ! -f ".env" ] && [ -f ".env.example" ]; then
        echo "   Creating environment file..."
        cp .env.example .env
        echo "   ⚠️  Please review and edit $service_dir/.env for your configuration"
    fi
    
    cd - > /dev/null
}

# Setup services
setup_service "Faucet" "faucet"
setup_service "Explorer" "explorer"

echo ""
echo "🎯 Services are ready to start!"
echo ""
echo "📋 Available commands:"
echo "   Start Faucet:    cd faucet && npm start"
echo "   Start Explorer:  cd explorer && npm start"
echo "   Docker:          docker-compose up -d"
echo ""
echo "🌐 Service URLs:"
echo "   Faucet API:      http://localhost:3001"
echo "   Block Explorer:  http://localhost:3002"
echo ""
echo "🔍 Health Checks:"
echo "   Faucet:          curl http://localhost:3001/health"
echo "   Explorer:        curl http://localhost:3002/health"
echo ""
echo "📖 Documentation:"
echo "   Faucet README:   ./faucet/README.md"
echo "   Explorer docs:   ./FAUCET_EXPLORER_README.md"
echo ""

# Offer to start services in development mode
read -p "🚀 Would you like to start both services now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting services in development mode..."
    
    # Start faucet in background
    echo "Starting Faucet API on port 3001..."
    cd faucet
    npm run dev &
    FAUCET_PID=$!
    cd - > /dev/null
    
    # Wait a moment
    sleep 2
    
    # Start explorer in background
    echo "Starting Block Explorer on port 3002..."
    cd explorer
    npm run dev &
    EXPLORER_PID=$!
    cd - > /dev/null
    
    echo ""
    echo "✅ Services started!"
    echo "   Faucet PID: $FAUCET_PID"
    echo "   Explorer PID: $EXPLORER_PID"
    echo ""
    echo "🌐 Access the services at:"
    echo "   Faucet API: http://localhost:3001"
    echo "   Explorer UI: http://localhost:3002"
    echo ""
    echo "Press Ctrl+C to stop services"
    
    # Wait for interrupt
    trap 'echo ""; echo "🛑 Stopping services..."; kill $FAUCET_PID $EXPLORER_PID 2>/dev/null; echo "✅ Services stopped."; exit 0' INT
    wait
else
    echo "👍 Services are ready. Start them manually when needed."
fi