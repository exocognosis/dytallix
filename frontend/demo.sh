#!/bin/bash

# Dytallix Frontend Demo Script
# This script demonstrates the current frontend functionality

set -e

echo "🚀 Dytallix Frontend Demo"
echo "========================="
echo

# Check if services are running
echo "📡 Checking backend services..."

# Check blockchain node
if curl -s http://localhost:3030/stats > /dev/null; then
    echo "✅ Blockchain node is running on port 3030"
else
    echo "❌ Blockchain node is not running on port 3030"
    echo "   Start it with: cd blockchain-core && cargo run --bin dytallix-node"
fi

# Check AI services  
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ AI services are running on port 8000"
else
    echo "❌ AI services are not running on port 8000"
    echo "   Start it with: cd ai-services && python3 simple_server.py"
fi

echo

# Check if frontend dev server is running
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend development server is running on port 3000"
    echo "   🌐 Open http://localhost:3000 in your browser"
else
    echo "❌ Frontend development server is not running"
    echo "   Start it with: cd frontend && npm run dev"
fi

echo
echo "🎯 Available Features:"
echo "   📊 Dashboard - Network overview and statistics"
echo "   👛 Wallet - PQC account management and transactions"  
echo "   🔍 Explorer - Blockchain data exploration"
echo "   🤖 Analytics - AI-powered fraud detection"
echo "   📄 Smart Contracts - Contract deployment and interaction"
echo "   ⚙️  Settings - User preferences and configuration"

echo
echo "📚 API Endpoints:"
echo "   Blockchain: http://localhost:3030/stats"
echo "   AI Services: http://localhost:8000/health"

echo
echo "🛠️  Tech Stack:"
echo "   React 18 + TypeScript + Vite"
echo "   Tailwind CSS + Headless UI"
echo "   Zustand + TanStack Query"
echo "   WebSocket + Recharts"

echo
echo "Happy coding! 🎉"
