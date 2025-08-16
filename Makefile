# Dytallix Project Makefile

.PHONY: help build test lint clean verify-token-migration

# Default target
help:
	@echo "Dytallix Project Build Commands"
	@echo "==============================="
	@echo ""
	@echo "Available targets:"
	@echo "  build                 - Build all components"
	@echo "  test                  - Run all tests"
	@echo "  lint                  - Run linters for all components"
	@echo "  clean                 - Clean build artifacts"
	@echo "  verify-token-migration - Verify no legacy DYT references remain"
	@echo ""

# Build all components
build:
	@echo "🔨 Building Rust components..."
	cargo build --release
	@echo "🔨 Building frontend..."
	cd frontend && npm run build
	@echo "✅ Build complete"

# Run tests
test:
	@echo "🧪 Running Rust tests..."
	cargo test
	@echo "🧪 Running frontend tests..."
	cd frontend && npm test
	@echo "✅ Tests complete"

# Run linters
lint:
	@echo "🔍 Running Rust linter..."
	cargo clippy -- -D warnings
	@echo "🔍 Running frontend linter..."
	cd frontend && npm run lint
	@echo "🔍 Running faucet linter..."
	cd faucet && npm run lint
	@echo "🔍 Running explorer linter..."
	cd explorer && npm run lint
	@echo "✅ Linting complete"

# Clean build artifacts
clean:
	@echo "🧹 Cleaning Rust artifacts..."
	cargo clean
	@echo "🧹 Cleaning frontend artifacts..."
	cd frontend && rm -rf dist node_modules/.cache
	@echo "✅ Clean complete"

# Verify token migration
verify-token-migration:
	@echo "🔍 Verifying token migration..."
	@./scripts/verify-token-migration.sh

# Development setup
setup:
	@echo "🚀 Setting up development environment..."
	@echo "Installing Rust components..."
	cargo build
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "Installing faucet dependencies..."
	cd faucet && npm install
	@echo "Installing explorer dependencies..."
	cd explorer && npm install
	@echo "✅ Setup complete"

# Docker commands
docker-build:
	@echo "🐳 Building Docker images..."
	docker-compose build
	@echo "✅ Docker build complete"

docker-up:
	@echo "🐳 Starting Docker services..."
	docker-compose up -d
	@echo "✅ Docker services started"

docker-down:
	@echo "🐳 Stopping Docker services..."
	docker-compose down
	@echo "✅ Docker services stopped"

docker-logs:
	@echo "📄 Showing Docker logs..."
	docker-compose logs -f