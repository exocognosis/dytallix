#!/bin/bash

# QuantumVault Integration Startup Script
# Starts all required services for QuantumVault functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BLOCKCHAIN_PORT=3030
QUANTUMVAULT_API_PORT=3002
FRONTEND_PORT=3000

echo -e "${BLUE}🚀 Starting QuantumVault Integration Services${NC}"
echo ""

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port $1 is already in use${NC}"
        return 1
    fi
    return 0
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=${SERVICE_WAIT_MAX_ATTEMPTS:-180}
    local attempt=1
    
    echo -e "${YELLOW}⏳ Waiting for $name to be ready...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -fsS --max-time 1 "$url" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $name is ready${NC}"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ $name failed to start within $max_attempts seconds${NC}"
    return 1
}

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}❌ Rust/Cargo not found. Please install Rust: https://rustup.rs/${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js: https://nodejs.org/${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found. Please install npm${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites found${NC}"
echo ""

# Check ports
echo -e "${BLUE}🔍 Checking ports...${NC}"
check_port $BLOCKCHAIN_PORT || echo -e "${YELLOW}   Blockchain core may already be running${NC}"
check_port $QUANTUMVAULT_API_PORT || echo -e "${YELLOW}   QuantumVault API may already be running${NC}"
check_port $FRONTEND_PORT || echo -e "${YELLOW}   Frontend may already be running${NC}"
echo ""

# Start Blockchain Core
echo -e "${BLUE}🔗 Starting Blockchain Core...${NC}"
cd blockchain-core
if [ ! -d "target" ]; then
    echo -e "${YELLOW}⚠️  First time setup - this may take several minutes...${NC}"
fi

# Start blockchain core in background
# NOTE: Use an isolated target dir to avoid stale artifacts in the default `target/`.
# NOTE: This workspace defines multiple binaries; we must specify which one.
CARGO_TARGET_DIR="../target-qv" PORT=$BLOCKCHAIN_PORT cargo run --bin dytallix-node > ../blockchain-core.log 2>&1 &
BLOCKCHAIN_PID=$!
echo -e "${GREEN}✅ Blockchain Core started (PID: $BLOCKCHAIN_PID)${NC}"
cd ..

# Wait for blockchain to be ready
wait_for_service "http://localhost:$BLOCKCHAIN_PORT/health" "Blockchain Core" || {
    echo -e "${RED}❌ Failed to start Blockchain Core${NC}"
    kill $BLOCKCHAIN_PID 2>/dev/null || true
    exit 1
}

# Start QuantumVault API
echo -e "${BLUE}🔐 Starting QuantumVault API...${NC}"
cd dytallix-fast-launch/services/quantumvault-api

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  Installing QuantumVault API dependencies...${NC}"
    npm install
fi

# Set environment variables
export BLOCKCHAIN_API_URL="http://localhost:$BLOCKCHAIN_PORT"
export QUANTUMVAULT_API_PORT="$QUANTUMVAULT_API_PORT"
export PORT="$QUANTUMVAULT_API_PORT"
export VITE_QUANTUMVAULT_API_URL="http://localhost:$QUANTUMVAULT_API_PORT"

# Start QuantumVault API in background
npm start > ../../../quantumvault-api.log 2>&1 &
QUANTUMVAULT_PID=$!
echo -e "${GREEN}✅ QuantumVault API started (PID: $QUANTUMVAULT_PID)${NC}"
cd ../../..

# Wait for QuantumVault API to be ready
wait_for_service "http://localhost:$QUANTUMVAULT_API_PORT/health" "QuantumVault API" || {
    echo -e "${RED}❌ Failed to start QuantumVault API${NC}"
    kill $BLOCKCHAIN_PID $QUANTUMVAULT_PID 2>/dev/null || true
    exit 1
}

# Start Frontend
echo -e "${BLUE}🌐 Starting Frontend...${NC}"
cd quantumvault/frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  Installing Frontend dependencies...${NC}"
    npm install
fi

# Set environment variables
export VITE_API_BASE="http://localhost:$QUANTUMVAULT_API_PORT"
export VITE_BLOCKCHAIN_API="http://localhost:$BLOCKCHAIN_PORT"
export VITE_QUANTUMVAULT_API_URL="http://localhost:$QUANTUMVAULT_API_PORT"

# Start frontend in background
npm run dev -- --port "$FRONTEND_PORT" --host > ../../frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
cd ../..

# Wait for frontend to be ready
wait_for_service "http://localhost:$FRONTEND_PORT" "Frontend" || {
    echo -e "${RED}❌ Failed to start Frontend${NC}"
    kill $BLOCKCHAIN_PID $QUANTUMVAULT_PID $FRONTEND_PID 2>/dev/null || true
    exit 1
}

# Run integration test
echo ""
echo -e "${BLUE}🧪 Running Integration Test...${NC}"
sleep 2  # Give services a moment to fully initialize

if node quantumvault-integration-test.js; then
    echo -e "${GREEN}✅ Integration test passed!${NC}"
else
    echo -e "${YELLOW}⚠️  Integration test had issues, but services are running${NC}"
fi

# Display service information
echo ""
echo -e "${GREEN}🎉 All services are running!${NC}"
echo ""
echo -e "${BLUE}📋 Service Information:${NC}"
echo -e "   🔗 Blockchain Core:    http://localhost:$BLOCKCHAIN_PORT (PID: $BLOCKCHAIN_PID)"
echo -e "   🔐 QuantumVault API:   http://localhost:$QUANTUMVAULT_API_PORT (PID: $QUANTUMVAULT_PID)"
echo -e "   🌐 Frontend:           http://localhost:$FRONTEND_PORT (PID: $FRONTEND_PID)"
echo ""
echo -e "${BLUE}📖 Usage:${NC}"
echo -e "   • Visit http://localhost:$FRONTEND_PORT to use QuantumVault"
echo -e "   • View logs: tail -f *.log"
echo -e "   • Stop services: kill $BLOCKCHAIN_PID $QUANTUMVAULT_PID $FRONTEND_PID"
echo ""
echo -e "${BLUE}📁 Log Files:${NC}"
echo -e "   • blockchain-core.log"
echo -e "   • quantumvault-api.log" 
echo -e "   • frontend.log"
echo ""

# Create stop script
cat > stop-quantumvault.sh << EOF
#!/bin/bash
echo "🛑 Stopping QuantumVault services..."
kill $BLOCKCHAIN_PID $QUANTUMVAULT_PID $FRONTEND_PID 2>/dev/null || true
echo "✅ All services stopped"
rm -f *.log
rm -f stop-quantumvault.sh
EOF
chmod +x stop-quantumvault.sh

echo -e "${YELLOW}💡 To stop all services, run: ./stop-quantumvault.sh${NC}"
echo ""

# Wait for user to stop or services to exit
echo -e "${BLUE}🔄 Services running... Press Ctrl+C to stop all services${NC}"

# Handle Ctrl+C
trap 'echo -e "\n${YELLOW}🛑 Stopping all services...${NC}"; kill $BLOCKCHAIN_PID $QUANTUMVAULT_PID $FRONTEND_PID 2>/dev/null || true; echo -e "${GREEN}✅ All services stopped${NC}"; rm -f *.log; exit 0' INT

# Wait for any service to exit
wait $BLOCKCHAIN_PID $QUANTUMVAULT_PID $FRONTEND_PID
