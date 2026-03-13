#!/bin/bash

# QuantumVault - Stop All Services Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                 🛑 Stopping QuantumVault 🛑                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Stop Frontend
if [ -f frontend.pid ]; then
    FRONTEND_PID=$(cat frontend.pid)
    print_status "Stopping frontend (PID: $FRONTEND_PID)..."
    if kill $FRONTEND_PID 2>/dev/null; then
        print_success "Frontend stopped"
    else
        print_warning "Frontend process not found (may have already stopped)"
    fi
    rm frontend.pid
else
    print_warning "No frontend.pid file found"
    # Try to kill by port
    print_status "Attempting to stop any process on port 5173..."
    lsof -ti:5173 | xargs kill -9 2>/dev/null && print_success "Stopped process on port 5173" || print_warning "No process found on port 5173"
fi

# Stop Backend
if [ -f backend.pid ]; then
    BACKEND_PID=$(cat backend.pid)
    print_status "Stopping backend (PID: $BACKEND_PID)..."
    if kill $BACKEND_PID 2>/dev/null; then
        print_success "Backend stopped"
    else
        print_warning "Backend process not found (may have already stopped)"
    fi
    rm backend.pid
else
    print_warning "No backend.pid file found"
    # Try to kill by port
    print_status "Attempting to stop any process on port 8080..."
    lsof -ti:8080 | xargs kill -9 2>/dev/null && print_success "Stopped process on port 8080" || print_warning "No process found on port 8080"
fi

# Stop Blockchain
if [ -f blockchain.pid ]; then
    BLOCKCHAIN_PID=$(cat blockchain.pid)
    print_status "Stopping blockchain (PID: $BLOCKCHAIN_PID)..."
    if kill $BLOCKCHAIN_PID 2>/dev/null; then
        print_success "Blockchain stopped"
    else
        print_warning "Blockchain process not found (may have already stopped)"
    fi
    rm blockchain.pid
else
    print_warning "No blockchain.pid file found"
    # Try to kill by port
    print_status "Attempting to stop any process on port 3030..."
    lsof -ti:3030 | xargs kill -9 2>/dev/null && print_success "Stopped process on port 3030" || print_warning "No process found on port 3030"
fi

# Stop PostgreSQL
print_status "Stopping PostgreSQL container..."
docker-compose stop postgres
print_success "PostgreSQL stopped"

echo ""
print_success "All QuantumVault services have been stopped"
echo ""
print_warning "Note: PostgreSQL data is preserved in Docker volumes"
echo "To completely remove PostgreSQL and its data, run:"
echo "  docker-compose down -v"
echo ""
