#!/usr/bin/env bash
set -e

echo "🔨 Building Dytallix Node..."

cd "$(dirname "$0")/.."

# Build the node
echo "Building node binary..."
cd node
cargo build --release

echo "✅ Node built successfully!"
echo ""
echo "Binary location: node/target/release/dytallix-fast-node"
echo ""
echo "To run the node:"
echo "  cd node && cargo run --release"
echo "  OR"
echo "  ./node/target/release/dytallix-fast-node"
