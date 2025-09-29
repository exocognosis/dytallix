#!/bin/bash

# DytallixLiteLaunch Automated Deployment Runbook
# This script automates the complete deployment process

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check system requirements
check_requirements() {
    log_info "Checking system requirements..."
    
    local missing_deps=()
    
    if ! command_exists docker; then
        missing_deps+=("docker")
    fi
    
    if ! command_exists docker-compose; then
        if ! docker compose version >/dev/null 2>&1; then
            missing_deps+=("docker-compose")
        fi
    fi
    
    if ! command_exists node; then
        missing_deps+=("nodejs")
    fi
    
    if ! command_exists npm; then
        missing_deps+=("npm")
    fi
    
    if ! command_exists jq; then
        missing_deps+=("jq")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_info "Please install missing dependencies and run again"
        exit 1
    fi
    
    # Check Docker daemon
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    log_success "All requirements satisfied"
}

# Check port availability
check_ports() {
    log_info "Checking port availability..."
    
    local required_ports=(26657 26656 1317 8080 8787 3001)
    local busy_ports=()
    
    for port in "${required_ports[@]}"; do
        if ss -tuln | grep -q ":$port "; then
            busy_ports+=("$port")
        fi
    done
    
    if [ ${#busy_ports[@]} -ne 0 ]; then
        log_error "Ports in use: ${busy_ports[*]}"
        log_info "Please free these ports and run again"
        exit 1
    fi
    
    log_success "All required ports available"
}

# Setup environment
setup_environment() {
    log_info "Setting up environment..."
    
    cd "$PROJECT_DIR"
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_success "Created .env from .env.example"
        else
            log_error ".env.example not found"
            exit 1
        fi
    else
        log_info ".env already exists, skipping creation"
    fi
    
    log_success "Environment setup complete"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    cd "$PROJECT_DIR"
    
    # Install server dependencies
    if [ -d "server" ]; then
        log_info "Installing server dependencies..."
        cd server && npm install && cd ..
    fi
    
    # Install faucet dependencies
    if [ -d "faucet" ]; then
        log_info "Installing faucet dependencies..."
        cd faucet && npm install && cd ..
    fi
    
    # Install frontend dependencies
    if [ -d "frontend" ]; then
        log_info "Installing frontend dependencies..."
        cd frontend && npm install && cd ..
    fi
    
    # Install explorer dependencies (if exists)
    if [ -d "explorer" ]; then
        log_info "Installing explorer dependencies..."
        cd explorer && npm install && cd ..
    fi
    
    log_success "Dependencies installed"
}

# Build services
build_services() {
    log_info "Building services..."
    
    cd "$PROJECT_DIR"
    
    # Build server
    if [ -d "server" ]; then
        log_info "Building server..."
        cd server && npm run build && cd ..
    fi
    
    # Build faucet
    if [ -d "faucet" ]; then
        log_info "Building faucet..."
        cd faucet && npm run build && cd ..
    fi
    
    # Build frontend
    if [ -d "frontend" ]; then
        log_info "Building frontend..."
        cd frontend && npm run build && cd ..
    fi
    
    # Build explorer (if exists)
    if [ -d "explorer" ]; then
        log_info "Building explorer..."
        cd explorer && npm run build && cd ..
    fi
    
    log_success "Services built successfully"
}

# Start services
start_services() {
    log_info "Starting services..."
    
    cd "$PROJECT_DIR"
    
    # Start node
    if [ -f "node/docker-compose.yml" ]; then
        log_info "Starting blockchain node..."
        cd node && docker-compose up -d && cd ..
        sleep 10  # Wait for node to initialize
    fi
    
    # Start faucet
    if [ -f "faucet/docker-compose.faucet.yml" ]; then
        log_info "Starting faucet..."
        cd faucet && docker-compose -f docker-compose.faucet.yml up -d && cd ..
        sleep 5
    fi
    
    # Start server
    if [ -d "server" ]; then
        log_info "Starting server..."
        cd server && nohup npm start > ../logs/server.log 2>&1 & echo $! > ../logs/server.pid && cd ..
        sleep 3
    fi
    
    # Start frontend
    if [ -d "frontend" ]; then
        log_info "Starting frontend..."
        cd frontend && nohup npm start > ../logs/frontend.log 2>&1 & echo $! > ../logs/frontend.pid && cd ..
        sleep 3
    fi
    
    # Start explorer (if exists)
    if [ -d "explorer" ]; then
        log_info "Starting explorer..."
        cd explorer && nohup npm start > ../logs/explorer.log 2>&1 & echo $! > ../logs/explorer.pid && cd ..
        sleep 3
    fi
    
    log_success "Services started"
}

# Health checks
run_health_checks() {
    log_info "Running health checks..."
    
    local failed_checks=()
    
    # Check node
    log_info "Checking blockchain node..."
    if curl -sf http://localhost:26657/status >/dev/null 2>&1; then
        log_success "Node is healthy"
    else
        log_warning "Node health check failed"
        failed_checks+=("node")
    fi
    
    # Check server
    log_info "Checking server..."
    if curl -sf http://localhost:8080/health >/dev/null 2>&1; then
        log_success "Server is healthy"
    else
        log_warning "Server health check failed"
        failed_checks+=("server")
    fi
    
    # Check faucet
    log_info "Checking faucet..."
    if curl -sf http://localhost:8787/health >/dev/null 2>&1; then
        log_success "Faucet is healthy"
    else
        log_warning "Faucet health check failed"
        failed_checks+=("faucet")
    fi
    
    # Check frontend
    log_info "Checking frontend..."
    if curl -sf http://localhost:3001/ >/dev/null 2>&1; then
        log_success "Frontend is healthy"
    else
        log_warning "Frontend health check failed"
        failed_checks+=("frontend")
    fi
    
    if [ ${#failed_checks[@]} -ne 0 ]; then
        log_warning "Some health checks failed: ${failed_checks[*]}"
        log_info "Services may still be starting up. Check logs if issues persist."
    else
        log_success "All health checks passed"
    fi
}

# Display deployment info
show_deployment_info() {
    log_success "🎉 DytallixLiteLaunch deployment completed!"
    echo
    log_info "Services are available at:"
    echo "  🌐 Frontend (Wallet & Dashboard): http://localhost:3001"
    echo "  🔍 Explorer: http://localhost:3000"
    echo "  🚰 Faucet: http://localhost:8787"
    echo "  ⛓️  Node RPC: http://localhost:26657"
    echo "  🤖 AI Oracle & Metrics: http://localhost:8080"
    echo "  📊 Metrics: http://localhost:8080/metrics"
    echo
    log_info "Useful commands:"
    echo "  make logs    - View all service logs"
    echo "  make status  - Check service status"
    echo "  make down    - Stop all services"
    echo "  make reset   - Reset blockchain state"
    echo
    log_info "CLI tool located at: ./cli/dytx/target/release/dytx"
    echo
    log_info "Test the deployment:"
    echo "  1. Open http://localhost:3001 in your browser"
    echo "  2. Go to the Faucet page and request test tokens"
    echo "  3. Use the Wallet to view balances and send transactions"
    echo "  4. Check the Dashboard for network metrics"
}

# Main deployment function
main() {
    log_info "🚀 Starting DytallixLiteLaunch deployment..."
    echo
    
    # Create logs directory
    mkdir -p "$PROJECT_DIR/logs"
    
    check_requirements
    check_ports
    setup_environment
    install_dependencies
    build_services
    start_services
    
    log_info "Waiting for services to fully initialize..."
    sleep 10
    
    run_health_checks
    show_deployment_info
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi