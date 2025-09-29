#!/bin/bash

# Build Counter WASM Contract
# Compiles the counter contract to WebAssembly

set -e

CONTRACTS_DIR="../contracts"
CONTRACT_NAME="counter"
OUTPUT_DIR="/tmp/wasm_artifacts"

echo "🔧 Building Counter WASM Contract"
echo "================================"
echo

# Check if Rust is installed
if ! command -v rustc &> /dev/null; then
    echo "❌ Error: Rust is not installed"
    echo "   Install Rust from https://rustup.rs/"
    exit 1
fi

# Check if wasm32-unknown-unknown target is installed
if ! rustup target list | grep -q "wasm32-unknown-unknown (installed)"; then
    echo "📦 Installing wasm32-unknown-unknown target..."
    rustup target add wasm32-unknown-unknown
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Change to contract directory
cd "$CONTRACTS_DIR/$CONTRACT_NAME"

echo "📁 Building contract: $CONTRACT_NAME"
echo "   Source: $(pwd)"
echo "   Target: wasm32-unknown-unknown"
echo

# Build the contract
if cargo build --release --target wasm32-unknown-unknown; then
    echo "✅ Contract compiled successfully"
    
    # Find the WASM file
    WASM_FILE="target/wasm32-unknown-unknown/release/${CONTRACT_NAME}.wasm"
    
    if [ -f "$WASM_FILE" ]; then
        # Copy to output directory
        cp "$WASM_FILE" "$OUTPUT_DIR/${CONTRACT_NAME}.wasm"
        
        # Get file size
        SIZE=$(wc -c < "$WASM_FILE")
        SIZE_KB=$((SIZE / 1024))
        
        echo "   📦 WASM file: $WASM_FILE"
        echo "   📏 Size: ${SIZE_KB} KB"
        echo "   💾 Copied to: $OUTPUT_DIR/${CONTRACT_NAME}.wasm"
        
        # Optimize with wasm-strip if available
        if command -v wasm-strip &> /dev/null; then
            echo "🔧 Optimizing with wasm-strip..."
            wasm-strip "$OUTPUT_DIR/${CONTRACT_NAME}.wasm"
            
            NEW_SIZE=$(wc -c < "$OUTPUT_DIR/${CONTRACT_NAME}.wasm")
            NEW_SIZE_KB=$((NEW_SIZE / 1024))
            SAVED_KB=$((SIZE_KB - NEW_SIZE_KB))
            
            echo "   ✨ Optimized size: ${NEW_SIZE_KB} KB (saved ${SAVED_KB} KB)"
        else
            echo "ℹ️  wasm-strip not found, install wabt for optimization"
        fi
        
        echo
        echo "🎉 Counter contract build completed!"
        echo
        echo "To deploy the contract:"
        echo "  ../cli/dytx/target/release/dytx wasm-deploy --wasm-file $OUTPUT_DIR/${CONTRACT_NAME}.wasm --deployer <address>"
        echo
        
    else
        echo "❌ Error: WASM file not found after build"
        exit 1
    fi
else
    echo "❌ Error: Contract compilation failed"
    exit 1
fi