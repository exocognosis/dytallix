#!/bin/bash

# Quick Fix Script for Dytallix Compilation Warnings
# This script automatically fixes safe, trivial warnings

echo "🔧 Starting Dytallix compilation warnings cleanup..."
echo "📍 Working directory: $(pwd)"

# Ensure we're in the right directory
if [ ! -f "blockchain-core/Cargo.toml" ]; then
    echo "❌ Error: Not in Dytallix root directory"
    echo "Please run this script from the root of the Dytallix project"
    exit 1
fi

cd blockchain-core

echo "📋 Current warning count:"
cargo check --workspace 2>&1 | grep -c "warning:" || echo "No warnings found"

echo ""
echo "🔄 Phase 1: Auto-fixing trivial warnings..."

# Fix unused imports and simple issues
echo "  • Fixing unused imports and variables..."
cargo fix --lib --allow-dirty --allow-staged 2>/dev/null
cargo fix --bin dytallix-node --allow-dirty --allow-staged 2>/dev/null

echo "  • Fixing specific crates..."
cargo fix --lib -p dytallix-node --allow-dirty 2>/dev/null
cargo fix --lib -p dytallix-pqc --allow-dirty 2>/dev/null
cargo fix --lib -p dytallix-contracts --allow-dirty 2>/dev/null

echo ""
echo "📋 Warning count after auto-fixes:"
cargo check --workspace 2>&1 | grep -c "warning:" || echo "No warnings found"

echo ""
echo "🔍 Running clippy for additional suggestions..."
cargo clippy --workspace --all-targets --all-features --quiet 2>/dev/null || echo "Clippy completed with suggestions"

echo ""
echo "✅ Phase 1 complete!"
echo ""
echo "📝 Manual fixes still needed:"
echo "  • Unused struct fields (review if needed for future features)"
echo "  • Unused Result values (add proper error handling)"  
echo "  • Incomplete AI integration features"
echo "  • Large unused infrastructure components"
echo ""
echo "📚 See COMPILATION_WARNINGS_TRACKING.md for detailed cleanup plan"
echo ""
echo "🧪 Running final compilation test..."
if cargo check --workspace --quiet; then
    echo "✅ Compilation successful!"
else
    echo "❌ Compilation issues remain"
    exit 1
fi

echo "🎉 Quick fixes applied successfully!"
