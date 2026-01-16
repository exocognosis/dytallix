#!/bin/bash
set -e

echo "🧪 Running QuantumVault Tests"
echo "=============================="
echo ""

cd "$(dirname "$0")/.."

echo "📦 Building project..."
cargo build --quiet

echo ""
echo "🔬 Running unit tests..."
cargo test --lib -- --nocapture

echo ""
echo "🔗 Running integration tests..."
cargo test --test '*' -- --nocapture

echo ""
echo "✅ All tests passed!"
echo ""
echo "📊 Test Coverage:"
echo "   - Domain logic (risk scoring, validation)"
echo "   - Policy compatibility checks"
echo "   - Asset classification updates"
echo "   - Cryptographic operations (see crypto tests)"
echo "   - Audit chain verification (see audit tests)"
echo ""
