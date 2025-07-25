#!/bin/bash
# Dytallix Security Audit Runner Script
# 
# This script runs the comprehensive security audit for the Dytallix cross-chain bridge

set -e

echo "🔒 Dytallix Cross-Chain Bridge Security Audit"
echo "=============================================="
echo ""

# Check dependencies
echo "📋 Checking dependencies..."

if ! command -v cargo &> /dev/null; then
    echo "❌ Cargo not found. Please install Rust."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "⚠️  Node.js not found. Some tests may be skipped."
fi

if ! command -v python3 &> /dev/null; then
    echo "⚠️  Python3 not found. Some tests may be skipped."
fi

echo "✅ Dependencies checked"
echo ""

# Build the project
echo "🔨 Building security audit tools..."
cd "$(dirname "$0")"

# Build with security audit features
cargo build --release --features security-audit

echo "✅ Build completed"
echo ""

# Run security audit
echo "🔍 Running comprehensive security audit..."
echo "This may take several minutes..."
echo ""

# Run the security audit runner
cargo run --release --features security-audit --bin security_audit_runner

echo ""
echo "📊 Security audit completed!"
echo ""

# Check if report was generated
if [ -f "security_audit_report.json" ]; then
    echo "📄 Security audit report generated: security_audit_report.json"
    
    # Extract key metrics from report
    if command -v jq &> /dev/null; then
        echo ""
        echo "📈 Quick Summary:"
        
        TOTAL_TESTS=$(jq '.summary.total_tests' security_audit_report.json)
        PASSED_TESTS=$(jq '.summary.passed_tests' security_audit_report.json)
        CRITICAL_VULNS=$(jq '.summary.critical_vulnerabilities' security_audit_report.json)
        HIGH_VULNS=$(jq '.summary.high_vulnerabilities' security_audit_report.json)
        PRODUCTION_READY=$(jq '.summary.production_ready' security_audit_report.json)
        
        echo "  Tests: $PASSED_TESTS/$TOTAL_TESTS passed"
        echo "  Critical vulnerabilities: $CRITICAL_VULNS"
        echo "  High vulnerabilities: $HIGH_VULNS"
        echo "  Production ready: $PRODUCTION_READY"
        
        if [ "$PRODUCTION_READY" = "true" ]; then
            echo ""
            echo "🎉 Bridge is READY for production deployment!"
        else
            echo ""
            echo "⚠️  Bridge requires security fixes before production deployment"
        fi
    fi
else
    echo "⚠️  Security audit report not found"
fi

echo ""
echo "📚 Review complete security checklist: SECURITY_AUDIT_CHECKLIST.md"
echo "🔗 For detailed findings, see: security_audit_report.json"
echo ""
echo "✨ Security audit complete! ✨"