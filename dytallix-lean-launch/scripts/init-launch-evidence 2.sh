#!/usr/bin/env bash
set -euo pipefail

# Determine repo root
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
DYTALLIX_LEAN_LAUNCH="$REPO_ROOT/dytallix-lean-launch"

# Verify dytallix-lean-launch directory exists
if [ ! -d "$DYTALLIX_LEAN_LAUNCH" ]; then
    echo "Error: dytallix-lean-launch directory not found at $DYTALLIX_LEAN_LAUNCH"
    echo "This script must be run from a repository that contains the dytallix-lean-launch directory."
    exit 1
fi

EVIDENCE_DIR="$DYTALLIX_LEAN_LAUNCH/launch-evidence"

# Helper functions for creating files only if they don't exist
mkjson() {
    local f="$1"
    [ -f "$f" ] || printf '{ "TODO": "populate via evidence prompt" }\n' >"$f"
}

mktxt() {
    local f="$1"
    [ -f "$f" ] || printf '# TODO: populate via evidence prompt\n' >"$f"
}

mkbin() {
    local f="$1"
    [ -f "$f" ] || : >"$f"
}

echo "Initializing Launch Evidence Pack in $EVIDENCE_DIR"

# Create directory structure
mkdir -p "$EVIDENCE_DIR"/{governance,staking,contracts,ai-risk,monitoring,pqc,rollback,wallet,security,onboarding/onboarding_screenshots}

# Governance evidence
mkjson "$EVIDENCE_DIR/governance/proposal_tx.json"
mkjson "$EVIDENCE_DIR/governance/vote_tx.json"
mkjson "$EVIDENCE_DIR/governance/execution_log.json"
mkbin "$EVIDENCE_DIR/governance/proposal_screenshot.png"
mkbin "$EVIDENCE_DIR/governance/vote_screenshot.png"

# Staking evidence
mktxt "$EVIDENCE_DIR/staking/emission_script.rs"
mkjson "$EVIDENCE_DIR/staking/before_balances.json"
mkjson "$EVIDENCE_DIR/staking/after_balances.json"
mkjson "$EVIDENCE_DIR/staking/claim_tx.json"

# Contracts evidence
mkbin "$EVIDENCE_DIR/contracts/counter_contract.wasm"
mkjson "$EVIDENCE_DIR/contracts/deploy_tx.json"
mkjson "$EVIDENCE_DIR/contracts/invoke_tx.json"
mkjson "$EVIDENCE_DIR/contracts/gas_report.json"

# AI risk evidence
mktxt "$EVIDENCE_DIR/ai-risk/service_stub.py"
mkjson "$EVIDENCE_DIR/ai-risk/sample_api_call.json"
mkbin "$EVIDENCE_DIR/ai-risk/dashboard_screenshot.png"

# Monitoring evidence
mkjson "$EVIDENCE_DIR/monitoring/grafana_dashboard.json"
mktxt "$EVIDENCE_DIR/monitoring/alert_test.log"
mkbin "$EVIDENCE_DIR/monitoring/dashboard_screenshot.png"

# PQC evidence
mktxt "$EVIDENCE_DIR/pqc/manifest_hash_list.txt"
mktxt "$EVIDENCE_DIR/pqc/tamper_test_failure.log"

# Rollback evidence
mktxt "$EVIDENCE_DIR/rollback/redeploy_log.txt"
mktxt "$EVIDENCE_DIR/rollback/previous_image_tag.txt"

# Wallet evidence
mktxt "$EVIDENCE_DIR/wallet/keygen_log.txt"
mkjson "$EVIDENCE_DIR/wallet/faucet_tx.json"
mkjson "$EVIDENCE_DIR/wallet/broadcast_tx.json"

# Security evidence
mktxt "$EVIDENCE_DIR/security/npm_audit_report.txt"
mktxt "$EVIDENCE_DIR/security/cargo_audit_report.txt"

# Onboarding evidence
mktxt "$EVIDENCE_DIR/onboarding/onboarding_doc.md"
[ -f "$EVIDENCE_DIR/onboarding/onboarding_screenshots/.gitkeep" ] || : >"$EVIDENCE_DIR/onboarding/onboarding_screenshots/.gitkeep"

# Create main README if it doesn't exist
if [ ! -f "$EVIDENCE_DIR/README.md" ]; then
    cat > "$EVIDENCE_DIR/README.md" << 'EOF'
# Launch Evidence Pack

This directory contains audit-friendly evidence artifacts that demonstrate launch readiness across all critical system components.

## Directory Structure

### governance/
Governance protocol evidence including proposal transactions, voting records, and execution logs. Artifacts demonstrate proper governance process execution and community participation validation.

### staking/
Staking system evidence including emission scripts, balance snapshots before/after operations, and claim transaction records. Shows proper token distribution and rewards mechanism operation.

### contracts/
Smart contract deployment evidence including WASM binaries, deployment transactions, invocation records, and gas consumption reports. Validates contract security and proper deployment procedures.

### ai-risk/
AI risk management evidence including service stubs, API interaction samples, and monitoring dashboard captures. Demonstrates AI system safety controls and risk mitigation measures.

### monitoring/
System monitoring evidence including Grafana dashboard configurations, alert testing logs, and monitoring interface captures. Shows operational observability and incident response readiness.

### pqc/
Post-quantum cryptography evidence including manifest hash lists and tamper detection failure logs. Validates cryptographic integrity and quantum-resistance implementation.

### rollback/
System rollback evidence including redeployment logs and previous system image tags. Demonstrates disaster recovery capabilities and system resilience procedures.

### wallet/
Wallet system evidence including key generation logs, faucet transaction records, and transaction broadcast logs. Shows wallet functionality and fund distribution mechanisms.

### security/
Security audit evidence including npm and cargo audit reports. Demonstrates dependency security validation and vulnerability assessment completion.

### onboarding/
User onboarding evidence including documentation and interface screenshots. Shows user experience validation and accessibility compliance.

## Usage

Run `scripts/init-launch-evidence.sh` to initialize or refresh this evidence pack structure. The script is idempotent and will not overwrite existing evidence files.
EOF
fi

echo "Launch Evidence Pack initialization complete."

# Display tree if available, otherwise use find
if command -v tree >/dev/null; then
    tree "$EVIDENCE_DIR"
else
    find "$EVIDENCE_DIR" -maxdepth 3 -print
fi