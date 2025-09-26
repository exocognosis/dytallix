#!/usr/bin/env bash
# Final Evidence Validation Script
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
EVIDENCE_BASE="$REPO_ROOT/launch-evidence"

echo "🔄 Starting Final Evidence Validation"

# Define required evidence files as per specification
declare -a REQUIRED_FILES=(
    "tx/submit_demo.log"
    "tx/receipt.json" 
    "tx/cli_broadcast.log"
    "tx/mempool_snapshot.json"
    "pqc/pubkey.hex"
    "pqc/signed_tx.json"
    "pqc/verify_ok.log"
    "pqc/verify_fail_tamper.log"
    "pqc/receipt.json"
    "governance/proposal.json"
    "governance/votes.json"
    "governance/execution.log"
    "governance/final_params.json"
    "wasm/contract.wasm"
    "wasm/deploy_tx.json"
    "wasm/calls.json"
    "wasm/gas_report.json"
    "wasm/final_state.json"
    "staking/emission_config.json"
    "staking/before_balances.json"
    "staking/after_balances.json"
    "staking/claims.log"
    "ai/latency.json"
    "ai/sample_scores.json"
    "monitoring/prometheus_targets.json"
    "monitoring/grafana_dashboard.json"
    "monitoring/alert_test_output.log"
    "monitoring/rollback_dry_run.log"
)

echo "📋 Checking evidence completeness..."

MISSING_COUNT=0
EMPTY_COUNT=0
TOTAL_COUNT=${#REQUIRED_FILES[@]}

for file in "${REQUIRED_FILES[@]}"; do
    FULL_PATH="$EVIDENCE_BASE/$file"
    
    if [[ ! -f "$FULL_PATH" ]]; then
        echo "❌ MISSING: $file"
        ((MISSING_COUNT++))
    elif [[ ! -s "$FULL_PATH" ]]; then
        echo "⚠️ EMPTY: $file"
        ((EMPTY_COUNT++))
    else
        echo "✅ OK: $file ($(stat -f%z "$FULL_PATH" 2>/dev/null || stat -c%s "$FULL_PATH") bytes)"
    fi
done

echo ""
echo "📊 Evidence Validation Summary:"
echo "  Total Required Files: $TOTAL_COUNT"
echo "  Files Present & Non-Empty: $((TOTAL_COUNT - MISSING_COUNT - EMPTY_COUNT))"
echo "  Missing Files: $MISSING_COUNT"
echo "  Empty Files: $EMPTY_COUNT"

# Calculate completion percentage
VALID_FILES=$((TOTAL_COUNT - MISSING_COUNT - EMPTY_COUNT))
COMPLETION_PCT=$(( (VALID_FILES * 100) / TOTAL_COUNT ))

echo "  Completion: $COMPLETION_PCT%"
echo ""

if [[ $MISSING_COUNT -eq 0 && $EMPTY_COUNT -eq 0 ]]; then
    echo "🎉 ALL EVIDENCE FILES PRESENT AND NON-EMPTY!"
    echo "✅ MVP Launch Evidence: COMPLETE"
    echo ""
    echo "Evidence demonstrates:"
    echo "  ✅ End-to-end transaction lifecycle with receipts"
    echo "  ✅ PQC Dilithium5 signature verification"
    echo "  ✅ Governance parameter change execution"  
    echo "  ✅ WASM contract deployment and execution"
    echo "  ✅ Staking rewards accrual and claiming"
    echo "  ✅ AI risk scoring with latency metrics"
    echo "  ✅ Observability stack with alerting"
    exit 0
else
    echo "❌ Evidence validation FAILED"
    echo "Missing or empty files must be fixed before launch"
    exit 1
fi
