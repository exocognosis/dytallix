#!/bin/bash

# QuantumVault - Status Check Script

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to check if a service is running
check_service() {
    local url=$1
    local name=$2
    if curl -s "$url" > /dev/null 2>&1; then
        print_success "$name is running ($url)"
        return 0
    else
        print_error "$name is NOT running ($url)"
        return 1
    fi
}

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              🔍 QuantumVault Status Check 🔍                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check PostgreSQL
print_status "PostgreSQL (port 5432):"
if lsof -Pi :5432 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_success "PostgreSQL is running"
    docker-compose ps postgres 2>/dev/null | grep -q "Up" && print_success "Docker container is healthy" || echo ""
else
    print_error "PostgreSQL is NOT running"
fi

echo ""

# Check Backend
print_status "Backend API (port 8080):"
if check_service "http://localhost:8080/health" "Backend"; then
    # Get backend PID if available
    if [ -f backend.pid ]; then
        PID=$(cat backend.pid)
        print_success "Backend PID: $PID"
    fi
    # Check API endpoints
    echo -e "  Testing API endpoints..."
    curl -s -H "X-API-Key: dev-api-key-change-in-production" \
        http://localhost:8080/api/assets > /dev/null 2>&1 && \
        print_success "Assets API responding" || \
        print_error "Assets API not responding"
else
    if [ -f backend.pid ]; then
        print_error "Backend PID file exists but service is not responding"
    fi
fi

echo ""

# Check Frontend
print_status "Frontend UI (port 5173):"
if check_service "http://localhost:5173" "Frontend"; then
    # Get frontend PID if available
    if [ -f frontend.pid ]; then
        PID=$(cat frontend.pid)
        print_success "Frontend PID: $PID"
    fi
else
    if [ -f frontend.pid ]; then
        print_error "Frontend PID file exists but service is not responding"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Overall status
if lsof -Pi :5432 -sTCP:LISTEN -t >/dev/null 2>&1 && \
   curl -s http://localhost:8080/health > /dev/null 2>&1 && \
   curl -s http://localhost:5173 > /dev/null 2>&1; then
    print_success "All services are running! 🎉"
    echo ""
    echo "Access QuantumVault:"
    echo "  🌐 Web UI:      http://localhost:5173"
    echo "  🔌 Backend API: http://localhost:8080"
    echo ""
else
    print_error "Some services are not running"
    echo ""
    echo "To start all services, run:"
    echo "  ./start.sh"
    echo ""
fi
