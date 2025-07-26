#!/bin/bash

# Dytallix Complete System Startup Script
# Launches blockchain node, AI services, frontend, and all monitoring dashboards

set -e

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
PID_DIR="$PROJECT_ROOT/.pids"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Create directories
mkdir -p "$LOG_DIR" "$PID_DIR"

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

# Check if a service is running on a port
check_port() {
    local port=$1
    local service_name=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null; then
        log_warn "$service_name is already running on port $port"
        return 0
    else
        return 1
    fi
}

# Start a service and save PID
start_service() {
    local service_name=$1
    local command=$2
    local port=$3
    local log_file="$LOG_DIR/${service_name}.log"
    local pid_file="$PID_DIR/${service_name}.pid"
    
    if check_port $port "$service_name"; then
        return 0
    fi
    
    log_step "Starting $service_name on port $port..."
    
    # Start the service in background
    eval "$command" > "$log_file" 2>&1 &
    local pid=$!
    echo $pid > "$pid_file"
    
    # Wait a bit and check if service started successfully
    sleep 3
    if kill -0 $pid 2>/dev/null; then
        log_success "$service_name started successfully (PID: $pid)"
        
        # Wait for service to be ready
        local attempts=0
        while [ $attempts -lt 30 ]; do
            if curl -s "http://localhost:$port" >/dev/null 2>&1 || \
               curl -s "http://localhost:$port/health" >/dev/null 2>&1 || \
               curl -s "http://localhost:$port/stats" >/dev/null 2>&1; then
                log_success "$service_name is ready and responding"
                return 0
            fi
            sleep 2
            attempts=$((attempts + 1))
        done
        
        log_warn "$service_name started but may not be fully ready yet"
    else
        log_error "Failed to start $service_name"
        return 1
    fi
}

# Cleanup function
cleanup() {
    log_info "Cleaning up services..."
    
    # Kill all services
    for pid_file in "$PID_DIR"/*.pid; do
        if [ -f "$pid_file" ]; then
            local pid=$(cat "$pid_file")
            local service=$(basename "$pid_file" .pid)
            if kill -0 $pid 2>/dev/null; then
                log_info "Stopping $service (PID: $pid)"
                kill $pid 2>/dev/null || true
            fi
            rm -f "$pid_file"
        fi
    done
    
    # Also try to kill by port
    for port in 3030 8000 3000 9090 3001; do
        local pid=$(lsof -ti:$port 2>/dev/null || true)
        if [ -n "$pid" ]; then
            log_info "Killing process on port $port (PID: $pid)"
            kill $pid 2>/dev/null || true
        fi
    done
}

# Set trap for cleanup on exit
trap cleanup EXIT INT TERM

echo "🚀 Starting Dytallix Complete System"
echo "====================================="
echo

# 1. Configure Python environment for AI services
log_step "Configuring Python environment..."
cd "$PROJECT_ROOT"

# Create virtual environment if it doesn't exist
if [ ! -d "ai-services/venv" ]; then
    log_info "Creating Python virtual environment..."
    cd ai-services
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt || {
        log_warn "Some packages failed to install, installing minimal set..."
        pip install fastapi uvicorn pydantic aiohttp numpy pandas scikit-learn || true
    }
    cd ..
else
    log_info "Using existing Python virtual environment"
fi

# 2. Install frontend dependencies if needed
log_step "Checking frontend dependencies..."
cd "$PROJECT_ROOT/frontend"
if [ ! -d "node_modules" ]; then
    log_info "Installing frontend dependencies..."
    npm install || {
        log_warn "npm install failed, trying yarn..."
        yarn install || log_error "Failed to install frontend dependencies"
    }
else
    log_info "Frontend dependencies already installed"
fi
cd "$PROJECT_ROOT"

# 3. Build blockchain core if needed
log_step "Building blockchain core..."
cd "$PROJECT_ROOT/blockchain-core"
if [ ! -f "target/release/dytallix-node" ] && [ ! -f "target/debug/dytallix-node" ]; then
    log_info "Building blockchain core..."
    cargo build --release || {
        log_warn "Release build failed, trying debug build..."
        cargo build || log_error "Failed to build blockchain core"
    }
else
    log_info "Blockchain core already built"
fi
cd "$PROJECT_ROOT"

echo
log_info "🚀 Starting services..."
echo

# 4. Start Blockchain Node
log_step "Starting Dytallix blockchain node..."
cd "$PROJECT_ROOT/blockchain-core"
BLOCKCHAIN_CMD="cargo run --bin dytallix-node"
if [ -f "target/release/dytallix-node" ]; then
    BLOCKCHAIN_CMD="./target/release/dytallix-node"
elif [ -f "target/debug/dytallix-node" ]; then
    BLOCKCHAIN_CMD="./target/debug/dytallix-node"
fi
start_service "blockchain-node" "$BLOCKCHAIN_CMD" 3030
cd "$PROJECT_ROOT"

# 5. Start AI Services
log_step "Starting AI services..."
cd "$PROJECT_ROOT/ai-services"
# Activate virtual environment and start services
AI_CMD="source venv/bin/activate && python3 simple_server.py"
start_service "ai-services" "$AI_CMD" 8000
cd "$PROJECT_ROOT"

# 6. Start Performance Dashboard
log_step "Starting AI Performance Dashboard..."
cd "$PROJECT_ROOT/ai-services"
DASHBOARD_CMD="source venv/bin/activate && cd .. && python3 simple_performance_dashboard.py"
start_service "performance-dashboard" "$DASHBOARD_CMD" 9090 || log_warn "Performance dashboard failed to start"
cd "$PROJECT_ROOT"

# 7. Start Frontend Development Server
log_step "Starting frontend development server..."
cd "$PROJECT_ROOT/frontend"
FRONTEND_CMD="npm run dev"
start_service "frontend" "$FRONTEND_CMD" 3000
cd "$PROJECT_ROOT"

# 8. Start Metrics Collector
log_step "Starting metrics collector..."
cd "$PROJECT_ROOT"
METRICS_CMD="cd ai-services && source venv/bin/activate && cd .. && python3 simple_metrics_collector.py"
start_service "metrics-collector" "$METRICS_CMD" 3001 || log_warn "Metrics collector failed to start"

echo
log_success "🎉 Dytallix system startup complete!"
echo
echo "📊 Available Services:"
echo "===================="
echo "🔗 Blockchain Node:           http://localhost:3030"
echo "   • Health Check:            http://localhost:3030/health"
echo "   • Network Stats:           http://localhost:3030/stats"
echo "   • Block Explorer API:      http://localhost:3030/blocks"
echo
echo "🤖 AI Services:               http://localhost:8000"
echo "   • Health Check:            http://localhost:8000/health"
echo "   • Fraud Detection:         http://localhost:8000/fraud_detection"
echo "   • Risk Scoring:            http://localhost:8000/risk_scoring"
echo "   • Transaction Analysis:    http://localhost:8000/analyze_transaction"
echo
echo "🌐 Frontend Dashboard:        http://localhost:3000"
echo "   • Main Dashboard:          http://localhost:3000/"
echo "   • Wallet Interface:        http://localhost:3000/wallet"
echo "   • Block Explorer:          http://localhost:3000/explorer"
echo "   • Analytics Dashboard:     http://localhost:3000/analytics"
echo "   • Smart Contracts:         http://localhost:3000/contracts"
echo

if [ -f "$PID_DIR/performance-dashboard.pid" ]; then
    echo "📈 Performance Dashboard:      http://localhost:9090"
    echo
fi

if [ -f "$PID_DIR/metrics-collector.pid" ]; then
    echo "📊 Metrics Collector:          http://localhost:3001"
    echo
fi

echo "🎯 Quick Tests:"
echo "=============="
echo "• Test blockchain health:      curl http://localhost:3030/health"
echo "• Test AI services:            curl http://localhost:8000/health"
echo "• Test fraud detection:        curl -X POST http://localhost:8000/fraud_detection -H 'Content-Type: application/json' -d '{\"transaction\":{\"amount\":1000,\"from\":\"test\",\"to\":\"test2\"}}'"
echo

echo "📝 Logs are available in: $LOG_DIR/"
echo "🔧 PIDs are stored in: $PID_DIR/"
echo

log_info "Press Ctrl+C to stop all services"
echo

# Keep the script running and show live logs
echo "📊 Live Service Status:"
echo "======================"

while true; do
    sleep 10
    
    # Check service health
    echo -ne "\r🔍 Health Check: "
    
    # Check blockchain
    if curl -s http://localhost:3030/health >/dev/null 2>&1; then
        echo -ne "${GREEN}Blockchain✅${NC} "
    else
        echo -ne "${RED}Blockchain❌${NC} "
    fi
    
    # Check AI services
    if curl -s http://localhost:8000/health >/dev/null 2>&1; then
        echo -ne "${GREEN}AI✅${NC} "
    else
        echo -ne "${RED}AI❌${NC} "
    fi
    
    # Check frontend
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        echo -ne "${GREEN}Frontend✅${NC} "
    else
        echo -ne "${RED}Frontend❌${NC} "
    fi
    
    echo -ne "$(date '+%H:%M:%S')"
done
