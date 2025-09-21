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

## PQC algorithm identifiers (launch alignment)

- Default wire identifier expected by the node: "dilithium5".
- SDK mock signer now emits algorithm: "dilithium5" for compatibility. Signature bytes remain mock (Blake3-based) in dev/test; production builds use real Dilithium5 verification on the node.
- Switching between real and mock PQC:
  - Node (Rust):
    - Real (default): cargo build -p dytallix-lean-node (feature "pqc-real" enabled by default).
    - Mock (dev only): cargo build -p dytallix-lean-node --no-default-features --features pqc-mock
  - CLI (Rust): similar feature flags per crate.
  - SDK (TypeScript): mock signer is used in dev; it now labels signatures as "dilithium5" for MVP/testnet acceptance.
- Rationale: maintain acceptance on private testnet while separating mock bytes from production cryptography. Node enforces real verification when pqc-real is enabled.

## WASM contracts demo (MVP)

- Build sample contract (counter):
  - rustup target add wasm32-unknown-unknown
  - ./dytallix-lean-launch/scripts/build_counter_wasm.sh
  - This produces dytallix-lean-launch/artifacts/counter.wasm. Optionally copy to repository root as examples/counter.wasm for the CLI script to auto-pick it up.

- Enable node runtime with contracts:
  - cargo build -p dytallix-lean-node --release --features contracts
  - Start the node normally; REST routes /wasm/deploy, /wasm/exec, /wasm/query become available.

- Run integration script:
  - ./dytallix-lean-launch/launch-evidence/cli/run_cli_integration.sh
  - This deploys the contract, executes increment twice, queries get, and writes JSON lines to launch-evidence/contracts/counter_demo.log.

- Evidence expectations in contracts/counter_demo.log (JSONL):
  - Line 1: deploy result { address, code_hash, gas_used, tx_hash? }
  - Lines 2-3: exec receipts for increment calls
  - Final line: query response with count matching number of increments (>=2)

## Usage

Run `scripts/init-launch-evidence.sh` to initialize or refresh this evidence pack structure. The script is idempotent and will not overwrite existing evidence files.