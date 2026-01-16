#!/bin/bash

# QuantumVault - Full Stack Startup Script
# This script starts all services needed to run QuantumVault locally

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to wait for a service to be ready
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=0
    
    print_status "Waiting for $name to be ready..."
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            print_success "$name is ready!"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    
    print_error "$name failed to start after $max_attempts seconds"
    return 1
}

# Print banner
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║              🔒 QuantumVault Startup Script 🔒                ║"
echo "║                                                                ║"
echo "║     Enterprise Post-Quantum Cryptographic Asset Protection     ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check prerequisites
print_status "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

if ! command -v cargo &> /dev/null; then
    print_error "Rust/Cargo is not installed. Please install Rust first."
    exit 1
fi

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

print_success "All prerequisites are installed"

# Check if .env exists
if [ ! -f .env ]; then
    print_warning ".env file not found, copying from .env.example"
    if [ -f .env.example ]; then
        cp .env.example .env
        print_success "Created .env file"
    else
        print_error ".env.example not found!"
        exit 1
    fi
fi

# Step 1: Start PostgreSQL
print_status "Step 1/3: Starting PostgreSQL database..."

if check_port 5432; then
    print_warning "Port 5432 is already in use (PostgreSQL may already be running)"
else
    print_status "Starting PostgreSQL with Docker Compose..."
    docker-compose up -d postgres
    sleep 3
    print_success "PostgreSQL container started"
fi

# Wait for PostgreSQL to be ready
print_status "Waiting for PostgreSQL to accept connections..."
sleep 5
print_success "PostgreSQL is ready"

# Step 2: Start Blockchain Node
print_status "Step 2/4: Starting Dytallix blockchain node..."

if check_port 3030; then
    print_warning "Port 3030 is already in use (Blockchain may already be running)"
    print_warning "Skipping blockchain startup. Stop the existing process first if you want to restart."
else
    print_status "Building and starting blockchain node..."
    cd blockchain-node
    # Start blockchain in background
    DYTALLIX_SKIP_SIG_VERIFY=true DYT_RPC_PORT=3030 cargo run --release --package dytallix-fast-node --bin dytallix-fast-node > ../blockchain.log 2>&1 &
    BLOCKCHAIN_PID=$!
    echo $BLOCKCHAIN_PID > ../blockchain.pid
    cd ..
    print_success "Blockchain starting (PID: $BLOCKCHAIN_PID)"
    
    # Wait for blockchain to be ready
    sleep 5
    if wait_for_service "http://localhost:3030/stats" "Blockchain Node"; then
        print_success "Blockchain node is running on http://localhost:3030"
    else
        print_warning "Blockchain may still be starting. Check blockchain.log for details."
    fi
fi

# Step 3: Start Backend Server
print_status "Step 3/4: Starting Rust backend server..."

if check_port 8080; then
    print_warning "Port 8080 is already in use (Backend may already be running)"
    print_warning "Skipping backend startup. Stop the existing process first if you want to restart."
else
    print_status "Building and starting Rust backend..."
    # Start backend in background with blockchain URL
    RUST_LOG=info BLOCKCHAIN_API_URL=http://localhost:3030 cargo run --release > backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > backend.pid
    print_success "Backend starting (PID: $BACKEND_PID)"
    
    # Wait for backend to be ready
    if wait_for_service "http://localhost:8080/health" "Backend API"; then
        print_success "Backend server is running on http://localhost:8080"
    else
        print_error "Backend failed to start. Check backend.log for details."
        exit 1
    fi
fi

# Step 4: Start Frontend
print_status "Step 4/4: Starting React frontend..."

if check_port 5173; then
    print_warning "Port 5173 is already in use (Frontend may already be running)"
    print_warning "Skipping frontend startup. Stop the existing process first if you want to restart."
else
    cd frontend
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install
        print_success "Frontend dependencies installed"
    fi
    
    print_status "Starting frontend development server..."
    npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../frontend.pid
    cd ..
    print_success "Frontend starting (PID: $FRONTEND_PID)"
    
    # Wait for frontend to be ready
    if wait_for_service "http://localhost:5173" "Frontend"; then
        print_success "Frontend server is running on http://localhost:5173"
    else
        print_error "Frontend failed to start. Check frontend.log for details."
        exit 1
    fi
fi

# Final status
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    🎉 QuantumVault Started! 🎉                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
print_success "All services are running!"
echo ""
echo "Service Status:"
echo "  📊 PostgreSQL:  http://localhost:5432"
echo "  ⛓️  Blockchain:  http://localhost:3030"
echo "  🦀 Backend API: http://localhost:8080"
echo "  ⚛️  Frontend UI: http://localhost:5173"
echo ""
echo "Quick Links:"
echo "  🏠 Home:        http://localhost:5173/"
echo "  📦 Assets:      http://localhost:5173/assets"
echo "  🔐 Policies:    http://localhost:5173/policies"
echo "  📋 Audit Log:   http://localhost:5173/audit"
echo ""
echo "API Documentation:"
echo "  Health Check:   curl http://localhost:8080/health"
echo "  Blockchain:     curl http://localhost:3030/stats"
echo "  List Assets:    curl -H 'X-API-Key: dev-api-key-change-in-production' http://localhost:8080/api/assets"
echo ""
echo "Logs:"
echo "  Blockchain:     tail -f blockchain.log"
echo "  Backend:        tail -f backend.log"
echo "  Frontend:       tail -f frontend.log"
echo "  PostgreSQL:     docker-compose logs -f postgres"
echo ""
echo "To stop all services:"
echo "  ./stop.sh"
echo ""
print_warning "Press Ctrl+C to stop watching (services will continue running in background)"
echo ""

# Keep script running and tail logs
trap 'echo ""; print_warning "Use ./stop.sh to stop all services"; exit 0' INT

echo "Tailing logs (Ctrl+C to exit)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
tail -f blockchain.log backend.log frontend.log 2>/dev/null || sleep infinity
