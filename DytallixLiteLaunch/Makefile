# DytallixLiteLaunch Makefile
# Deployment-ready lightweight testnet for Dytallix ecosystem

.PHONY: help up down logs reset install build test clean wasm-build gov-demo emissions-cron status health

# Default target
help:
	@echo "DytallixLiteLaunch - Lightweight Testnet Commands"
	@echo "================================================"
	@echo ""
	@echo "Quick Start:"
	@echo "  make install      - Install all dependencies"
	@echo "  make build        - Build all services" 
	@echo "  make up           - Start complete testnet"
	@echo "  make down         - Stop all services"
	@echo "  make reset        - Reset blockchain state"
	@echo ""
	@echo "Development:"
	@echo "  make logs         - View all service logs"
	@echo "  make status       - Check service status"
	@echo "  make health       - Run health checks"
	@echo "  make test         - Run test suite"
	@echo ""
	@echo "Blockchain Operations:"
	@echo "  make wasm-build   - Build WASM contracts"
	@echo "  make gov-demo     - Run governance demo"
	@echo "  make emissions-cron - Run DRT emissions"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean        - Clean build artifacts"
	@echo "  make faucet-test  - Test faucet functionality"
	@echo "  make pqc-demo     - Demo PQC operations"

# Environment setup
.env:
	cp .env.example .env
	@echo "Created .env file. Please configure your settings."

# Install dependencies
install: .env
	@echo "Installing dependencies..."
	cd server && npm install
	cd faucet && npm install  
	cd frontend && npm install
	cd explorer && npm install
	@echo "Dependencies installed successfully"

# Build services
build: install
	@echo "Building services..."
	cd server && npm run build
	cd faucet && npm run build
	cd frontend && npm run build
	cd explorer && npm run build
	@echo "Build completed successfully"

# Start complete testnet
up: build
	@echo "Starting DytallixLiteLaunch testnet..."
	docker-compose -f node/docker-compose.yml up -d
	docker-compose -f faucet/docker-compose.faucet.yml up -d
	@echo "Waiting for services to initialize..."
	sleep 10
	cd server && npm start &
	cd frontend && npm start &
	cd explorer && npm start &
	@echo "Testnet is running!"
	@echo "Frontend: http://localhost:3001"
	@echo "Explorer: http://localhost:3000" 
	@echo "Faucet: http://localhost:8787"
	@echo "Node RPC: http://localhost:26657"

# Stop all services
down:
	@echo "Stopping testnet services..."
	docker-compose -f node/docker-compose.yml down
	docker-compose -f faucet/docker-compose.faucet.yml down
	pkill -f "npm start" || true
	@echo "Testnet stopped"

# View logs
logs:
	@echo "Viewing service logs..."
	docker-compose -f node/docker-compose.yml logs -f &
	docker-compose -f faucet/docker-compose.faucet.yml logs -f &

# Reset blockchain state
reset: down
	@echo "Resetting blockchain state..."
	docker-compose -f node/docker-compose.yml down -v
	rm -rf node/data/* || true
	@echo "Blockchain state reset"

# Service status
status:
	@echo "Service Status:"
	@echo "=============="
	@docker-compose -f node/docker-compose.yml ps
	@docker-compose -f faucet/docker-compose.faucet.yml ps
	@echo ""
	@echo "Port Status:"
	@ss -tuln | grep -E ':(3000|3001|8080|8787|26657|1317)' || echo "No services detected"

# Health checks
health:
	@echo "Running health checks..."
	@scripts/health_check.sh

# Build WASM contracts
wasm-build:
	@echo "Building WASM contracts..."
	@scripts/build_counter_wasm.sh
	@scripts/build_pqc_wasm.sh
	@echo "WASM contracts built"

# Governance demo
gov-demo:
	@echo "Running governance demonstration..."
	@scripts/governance-demo.sh

# DRT emissions cron
emissions-cron:
	@echo "Running DRT emissions..."
	@scripts/emissions_cron.sh

# Test faucet
faucet-test:
	@echo "Testing faucet functionality..."
	@curl -X POST http://localhost:8787/dispense \
		-H "Content-Type: application/json" \
		-d '{"address":"dytallix1test123456789012345678901234567890","tokens":["DGT","DRT"]}'

# PQC demonstration  
pqc-demo:
	@echo "Running PQC demonstration..."
	@scripts/pqc_runtime_check.sh

# Run tests
test:
	@echo "Running test suite..."
	cd server && npm test
	cd faucet && npm test
	cd frontend && npm test
	cd explorer && npm test

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf server/dist server/node_modules
	rm -rf faucet/dist faucet/node_modules
	rm -rf frontend/dist frontend/node_modules  
	rm -rf explorer/dist explorer/node_modules
	rm -rf contracts/target
	@echo "Clean completed"

# Docker rebuild
rebuild: clean build