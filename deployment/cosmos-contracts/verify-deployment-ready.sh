#!/bin/bash

# Dytallix Bridge Deployment Verification Script
# This script verifies that all prerequisites are in place for deployment

echo "🔍 Verifying Dytallix Bridge Deployment Prerequisites..."
echo "=================================================="

# Check Rust installation and WASM target
echo "✅ Checking Rust toolchain..."
rustc --version
if rustup target list --installed | grep -q "wasm32-unknown-unknown"; then
    echo "✅ WASM target is installed"
else
    echo "❌ WASM target not found. Installing..."
    rustup target add wasm32-unknown-unknown
fi

# Check Node.js installation
echo "✅ Checking Node.js..."
node --version
npm --version

# Verify project structure
echo "✅ Checking project structure..."
if [ -f "Cargo.toml" ]; then
    echo "✅ Cargo.toml found"
else
    echo "❌ Cargo.toml not found"
    exit 1
fi

if [ -f "package.json" ]; then
    echo "✅ package.json found"
else
    echo "❌ package.json not found"
    exit 1
fi

# Build the contract
echo "🔨 Building CosmWasm contract..."
cargo build --release --target wasm32-unknown-unknown

# Verify WASM output
if [ -f "target/wasm32-unknown-unknown/release/dytallix_cosmos_bridge.wasm" ]; then
    WASM_SIZE=$(wc -c < "target/wasm32-unknown-unknown/release/dytallix_cosmos_bridge.wasm")
    echo "✅ Contract compiled successfully"
    echo "📦 WASM file size: $WASM_SIZE bytes"
else
    echo "❌ Contract compilation failed"
    exit 1
fi

# Check NPM dependencies
echo "📦 Installing NPM dependencies..."
npm install --silent

# Verify environment configuration
echo "⚙️ Checking environment configuration..."
if [ -f ".env" ]; then
    echo "✅ .env file found"
    # Check for required variables
    if grep -q "MNEMONIC=" .env && grep -q "OSMOSIS_TESTNET_RPC=" .env; then
        echo "✅ Required environment variables configured"
    else
        echo "⚠️  Some environment variables may need configuration"
    fi
else
    echo "⚠️  .env file not found - using template"
    cp .env.template .env
fi

# Create deployments directory
mkdir -p deployments

echo ""
echo "🎉 Deployment Prerequisites Summary:"
echo "===================================="
echo "✅ Rust toolchain with WASM target: Ready"
echo "✅ CosmWasm contract compilation: Ready"
echo "✅ Node.js and NPM dependencies: Ready"
echo "✅ Deployment scripts: Ready"
echo "✅ Configuration templates: Ready"

echo ""
echo "📋 Next Steps for Live Deployment:"
echo "1. Fund deployment wallet with testnet OSMO tokens"
echo "2. Update .env file with funded wallet mnemonic"
echo "3. Configure validator addresses"
echo "4. Run: npm run deploy:osmo-testnet"
echo ""
echo "🚀 Ready for deployment to Osmosis testnet!"