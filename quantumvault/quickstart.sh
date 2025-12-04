#!/bin/bash
set -e

echo "🔒 QuantumVault - Quick Start Script"
echo "===================================="
echo ""

cd "$(dirname "$0")"

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  WARNING: Using default keys. CHANGE THESE IN PRODUCTION!"
    echo ""
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "🔨 Building and starting services..."
docker-compose up --build -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 5

# Wait for backend
for i in {1..30}; do
    if curl -s http://localhost:8080/health > /dev/null; then
        echo "✅ Backend is ready!"
        break
    fi
    echo "   Waiting for backend... ($i/30)"
    sleep 2
done

echo ""
echo "🎉 QuantumVault is running!"
echo ""
echo "📊 Services:"
echo "   - Backend API: http://localhost:8080"
echo "   - Frontend UI: http://localhost:3000"
echo "   - PostgreSQL: localhost:5432"
echo ""
echo "🔑 API Key: dev-api-key-change-in-production"
echo ""
echo "📚 Quick Tests:"
echo ""
echo "   # Health check"
echo "   curl http://localhost:8080/health"
echo ""
echo "   # List policies"
echo "   curl -H 'X-API-Key: dev-api-key-change-in-production' http://localhost:8080/api/policies"
echo ""
echo "   # Create an asset"
echo "   curl -X POST http://localhost:8080/api/assets/manual \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'X-API-Key: dev-api-key-change-in-production' \\"
echo "     -d '{\"name\":\"Test DB\",\"asset_type\":\"datastore\",\"endpoint_or_path\":\"localhost:5432\",\"owner\":\"admin\",\"sensitivity\":\"confidential\",\"regulatory_tags\":[\"GDPR\"],\"exposure_level\":\"internal\",\"data_lifetime_days\":365}'"
echo ""
echo "📖 View logs:"
echo "   docker-compose logs -f backend"
echo ""
echo "🛑 Stop services:"
echo "   docker-compose down"
echo ""
