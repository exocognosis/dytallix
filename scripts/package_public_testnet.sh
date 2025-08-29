#!/usr/bin/env bash
# package_public_testnet.sh - Orchestrate Public Testnet Launch Pack packaging
# Generates all phase manifests and appends pass table to INDEX.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LAUNCH_PACK_DIR="$PROJECT_ROOT/launch-evidence/public-testnet-pack"
INDEX_FILE="$LAUNCH_PACK_DIR/INDEX.md"

echo "📦 Public Testnet Launch Pack Packaging"
echo "======================================="
echo ""

# Ensure launch pack directory exists
mkdir -p "$LAUNCH_PACK_DIR"

# Function to run gating checks
run_gating_checks() {
    echo "🚪 Running gating checks..."
    
    echo "  🔍 Running cargo check..."
    if ! cargo check --workspace --all-targets >/dev/null 2>&1; then
        echo "❌ Cargo check failed - fix errors before packaging"
        return 1
    fi
    
    echo "  🧪 Running cargo test..."
    if ! timeout 300 cargo test --lib >/dev/null 2>&1; then
        echo "❌ Cargo test failed - fix tests before packaging"
        return 1
    fi
    
    echo "  🔍 Running cargo clippy with warnings as errors..."
    if ! cargo clippy --workspace --all-targets -- -D warnings >/dev/null 2>&1; then
        echo "❌ Cargo clippy failed - fix warnings before packaging"
        return 1
    fi
    
    echo "✅ All gating checks passed"
    return 0
}

# Define phases
declare -a PHASES=(
    "1:explorer"
    "2:onboarding" 
    "3:secrets"
    "4:observability"
    "5:perf"
    "6:pqc"
    "7:policy"
    "8:site"
)

# Function to package a single phase
package_phase() {
    local phase_spec="$1"
    local phase_num="${phase_spec%:*}"
    local phase_name="${phase_spec#*:}"
    local phase_dir="$LAUNCH_PACK_DIR/$phase_name"
    
    echo "📝 Packaging Phase $phase_num: $phase_name"
    
    if [[ ! -d "$phase_dir" ]]; then
        echo "❌ Phase directory not found: $phase_dir"
        return 1
    fi
    
    # Generate manifest for this phase
    if ! "$SCRIPT_DIR/gen_manifest.sh" "$phase_num" "$phase_name" "$phase_dir"; then
        echo "❌ Failed to generate manifest for phase $phase_num"
        return 1
    fi
    
    # Verify manifest was created
    if [[ ! -f "$phase_dir/manifest.json" ]] || [[ ! -f "$phase_dir/manifest.json.sig" ]]; then
        echo "❌ Manifest files not created for phase $phase_num"
        return 1
    fi
    
    echo "✅ Phase $phase_num ($phase_name) packaged successfully"
    return 0
}

# Main packaging flow
main() {
    local start_time
    start_time=$(date +%s)
    
    echo "🔍 Pre-packaging validation..."
    
    # Run gating checks first
    if ! run_gating_checks; then
        echo "❌ Gating checks failed - packaging aborted"
        exit 1
    fi
    
    echo ""
    echo "📦 Packaging all phases..."
    
    # Track phase results
    declare -a PHASE_RESULTS=()
    local failed_phases=0
    
    # Package each phase
    for phase_spec in "${PHASES[@]}"; do
        echo ""
        if package_phase "$phase_spec"; then
            PHASE_RESULTS+=("✅ ${phase_spec#*:}")
        else
            PHASE_RESULTS+=("❌ ${phase_spec#*:}")
            ((failed_phases++))
        fi
    done
    
    echo ""
    echo "📊 Phase packaging summary:"
    for result in "${PHASE_RESULTS[@]}"; do
        echo "  $result"
    done
    
    if [[ $failed_phases -gt 0 ]]; then
        echo ""
        echo "❌ $failed_phases phases failed - packaging incomplete"
        exit 1
    fi
    
    echo ""
    echo "📄 Generating INDEX.md with pass table..."
    
    # Generate or update INDEX.md
    generate_index_md
    
    echo ""
    echo "🎯 Final validation..."
    
    # Validate all expected files exist
    validate_package_completeness
    
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    echo "🎉 Public Testnet Launch Pack packaging complete!"
    echo "   Duration: ${duration}s"
    echo "   Location: $LAUNCH_PACK_DIR"
    echo "   Index: $INDEX_FILE"
    echo ""
    echo "📋 Next steps:"
    echo "  1. Review INDEX.md for complete manifest"
    echo "  2. Verify phase artifacts and signatures"
    echo "  3. Deploy to testnet environment"
}

# Generate INDEX.md with phase pass table
generate_index_md() {
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    cat > "$INDEX_FILE" << 'EOF'
# Public Testnet Launch Pack

This package contains comprehensive evidence artifacts demonstrating launch readiness across all critical system components for the Dytallix Public Testnet.

## Overview

The Public Testnet Launch Pack follows a structured 8-phase approach with integrity verification through PQC signatures and comprehensive gating checks.

## Directory Structure

### Phase 1: Explorer (`explorer/`)
User interface flows and screen mockups for blockchain explorer functionality.

### Phase 2: Onboarding (`onboarding/`)
Developer onboarding materials and sample artifacts for getting started.

### Phase 3: Secrets (`secrets/`)
Vault integration for secure secret management with redacted operational evidence.

### Phase 4: Observability (`observability/`)
Monitoring and alerting configurations with sample metrics data.

### Phase 5: Performance (`perf/`)
Performance benchmarks including block times, TPS reports, and latency measurements.

### Phase 6: Post-Quantum Cryptography (`pqc/`)
PQC implementation evidence with key generation and transaction signing samples.

### Phase 7: Policy (`policy/`)
Security, testnet, and privacy policy documentation.

### Phase 8: Site (`site/`)
Public-facing website assets for testnet information and documentation.

## Integrity Verification

Each phase includes:
- `manifest.json`: Artifact inventory with SHA-256 hashes
- `manifest.json.sig`: Dilithium3 PQC signature for tamper detection

## Known Limitations

- PQC signatures are currently placeholders pending full Dilithium integration
- Some performance metrics are based on simulated load testing
- Vault integration uses redacted/mock data for security
- Real production deployment requires additional security hardening

## Gating Requirements

All phases must pass:
- `cargo check --workspace --all-targets`
- `cargo test --lib` 
- `cargo clippy --workspace --all-targets -- -D warnings`

EOF

    # Append phase pass table
    cat >> "$INDEX_FILE" << EOF

## Phase Pass Table

Generated: $timestamp

| Phase | Name | Status | Manifest | Signature | Artifacts |
|-------|------|--------|----------|-----------|-----------|
EOF

    # Add each phase status
    for phase_spec in "${PHASES[@]}"; do
        local phase_num="${phase_spec%:*}"
        local phase_name="${phase_spec#*:}"
        local phase_dir="$LAUNCH_PACK_DIR/$phase_name"
        
        local status="❌ FAIL"
        local manifest_status="❌"
        local signature_status="❌"
        local artifacts_count="0"
        
        if [[ -d "$phase_dir" ]]; then
            if [[ -f "$phase_dir/manifest.json" ]]; then
                manifest_status="✅"
            fi
            
            if [[ -f "$phase_dir/manifest.json.sig" ]]; then
                signature_status="✅"
            fi
            
            if [[ -f "$phase_dir/manifest.json" ]] && [[ -f "$phase_dir/manifest.json.sig" ]]; then
                status="✅ PASS"
            fi
            
            # Count artifacts (excluding manifest files)
            artifacts_count=$(find "$phase_dir" -type f ! -name "manifest.json*" | wc -l | tr -d ' ')
        fi
        
        echo "| $phase_num | $phase_name | $status | $manifest_status | $signature_status | $artifacts_count |" >> "$INDEX_FILE"
    done
    
    cat >> "$INDEX_FILE" << 'EOF'

## Usage

To validate the complete package:

```bash
# Run gating checks
make gate

# Package everything
make package

# Validate integrity
for phase in explorer onboarding secrets observability perf pqc policy site; do
    echo "Validating $phase..."
    if [ -f "launch-evidence/public-testnet-pack/$phase/manifest.json" ]; then
        echo "✅ $phase manifest found"
    else
        echo "❌ $phase manifest missing"
    fi
done
```

## Support

For questions or issues with this launch pack, see:
- `docs/` directory for comprehensive documentation
- `scripts/` directory for automation tools
- `Makefile` for available commands
EOF

    echo "✅ INDEX.md generated: $INDEX_FILE"
}

# Validate package completeness
validate_package_completeness() {
    echo "🔍 Validating package completeness..."
    
    local missing_files=0
    
    # Check INDEX.md
    if [[ ! -f "$INDEX_FILE" ]]; then
        echo "❌ Missing INDEX.md"
        ((missing_files++))
    fi
    
    # Check each phase
    for phase_spec in "${PHASES[@]}"; do
        local phase_name="${phase_spec#*:}"
        local phase_dir="$LAUNCH_PACK_DIR/$phase_name"
        
        if [[ ! -d "$phase_dir" ]]; then
            echo "❌ Missing phase directory: $phase_name"
            ((missing_files++))
            continue
        fi
        
        if [[ ! -f "$phase_dir/manifest.json" ]]; then
            echo "❌ Missing manifest.json for $phase_name"
            ((missing_files++))
        fi
        
        if [[ ! -f "$phase_dir/manifest.json.sig" ]]; then
            echo "❌ Missing manifest.json.sig for $phase_name"
            ((missing_files++))
        fi
    done
    
    if [[ $missing_files -gt 0 ]]; then
        echo "❌ Package validation failed: $missing_files missing files"
        return 1
    fi
    
    echo "✅ Package validation passed"
    return 0
}

# Run main function
main "$@"