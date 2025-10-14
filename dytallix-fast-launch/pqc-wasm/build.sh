#!/bin/bash
set -e

echo "🔨 Building @dytallix/pqc-wasm package..."
echo ""

# Check for required tools
command -v cargo >/dev/null 2>&1 || { echo "❌ Rust/Cargo not found. Install from https://rustup.rs/"; exit 1; }
command -v wasm-pack >/dev/null 2>&1 || { echo "❌ wasm-pack not found. Installing..."; cargo install wasm-pack; }

# Navigate to pqc-wasm directory
cd "$(dirname "$0")"

echo "📦 Building WASM package..."
wasm-pack build --target web --out-dir pkg

# Copy our custom package.json over wasm-pack's generated one
echo "📝 Restoring custom package.json..."
cp package.json pkg/package.json

echo ""
echo "✅ Build complete!"
echo ""
echo "📋 Package contents:"
ls -lh pkg/

echo ""
echo "📊 WASM size:"
ls -lh pkg/*.wasm

echo ""
echo "🎉 Package built successfully!"
echo ""
echo "Next steps:"
echo "  1. Test: cd pkg && npm link"
echo "  2. Publish: cd pkg && npm publish --access public"
echo ""
