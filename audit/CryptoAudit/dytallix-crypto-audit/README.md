# Dytallix Cryptographic Audit Execution Script

## Overview

This is a production-ready, deterministic audit tool that performs comprehensive cryptographic analysis of the Dytallix protocol. It validates PQC primitives, performs cryptanalysis, checks protocol security, analyzes side-channel resistance, and verifies economic-cryptographic invariants.

## Requirements

- **Rust 1.70+** (install from https://rustup.rs)
- **macOS** (x86_64 or ARM64)
- ~100MB disk space for build artifacts

## Quick Start

```bash
# Navigate to the audit directory
cd /Users/rickglenn/Desktop/dytallix/CryptoAudit/dytallix-crypto-audit

# Make the run script executable
chmod +x run_audit.sh

# Run the audit
./run_audit.sh
```

## Manual Execution

```bash
# Build
cargo build --release

# Run with default paths
./target/release/dytallix-audit

# Run with custom paths
./target/release/dytallix-audit \
    --target /path/to/codebase \
    --output /path/to/output \
    --seed 20260105 \
    --verbose
```

## Command Line Options

| Option | Default | Description |
|--------|---------|-------------|
| `-t, --target` | `/Users/rickglenn/Desktop/dytallix/dytallix-fast-launch` | Path to target codebase |
| `-o, --output` | `/Users/rickglenn/Desktop/dytallix/CryptoAudit/01052026Audit` | Output directory |
| `-s, --seed` | `20260105` | Random seed for reproducibility |
| `-v, --verbose` | `false` | Enable verbose output |

## Audit Phases

The audit executes 7 phases:

1. **Mathematical & Parameter Validation** - FIPS 203/204/205 compliance
2. **Algorithmic Cryptanalysis** - Forgery, misuse, downgrade tests
3. **Protocol-Level Analysis** - Commit-reveal, VRF, BFT, finality
4. **Side-Channel Analysis** - Timing, constant-time, cache
5. **Fault Injection Simulation** - Resilience, leakage, bypass
6. **Randomness & Determinism** - Entropy, nonces, RNG quality
7. **Economic-Cryptographic Invariants** - Fees, PID, oracles, staking

## Output Structure

```
01052026Audit/
├── logs/           # Execution logs
├── metrics/        # Performance and security metrics (JSON)
├── artifacts/      # Test artifacts with hashes
├── traces/         # Detailed execution traces
└── reports/
    ├── final_audit_report.json   # Machine-readable report
    └── audit_summary.txt          # Human-readable summary
```

## Report Format

The final report includes:

```json
{
  "metadata": {
    "report_id": "DYTALLIX-AUDIT-20260105...",
    "target_codebase": "/path/to/codebase",
    "audit_seed": 20260105
  },
  "overall_verdict": "APPROVED | CONDITIONAL_APPROVAL | REJECTED",
  "summary": {
    "total_tests": 35,
    "passed": 35,
    "warned": 0,
    "failed": 0
  },
  "test_results": { ... },
  "evidence_merkle_root": "..."
}
```

## Verdicts

| Verdict | Meaning |
|---------|---------|
| `APPROVED` | All tests passed, no security issues |
| `CONDITIONAL_APPROVAL` | Passed with warnings, review recommended |
| `REJECTED` | Critical security issues found |

## Decision Policy

### HARD FAIL (Automatic Rejection)
- Key recovery attack successful
- Signature forgery demonstrated
- KEM decapsulation break
- Quorum safety violation
- BFT intersection failure

### WARN
- Reduced safety margin (< 20 bits)
- Detectable timing variance
- Non-constant-time code pattern
- Entropy source concerns

## Reproducibility

The audit is fully deterministic:
- All randomness uses the seeded ChaCha20 PRNG
- Same seed produces identical results
- Re-running with `--seed 20260105` reproduces all outputs

## Cryptographic Primitives Tested

| Primitive | Standard | Security Level |
|-----------|----------|----------------|
| ML-DSA-65 | FIPS 204 | NIST Level 3 |
| SLH-DSA-SHAKE-192s | FIPS 205 | NIST Level 3 |
| ML-KEM-768 | FIPS 203 | NIST Level 3 |
| BLAKE3 | - | 256-bit |
| SHAKE256 | FIPS 202 | 256-bit |

## Evidence Integrity

All evidence is hashed with BLAKE3 and a Merkle root is computed:
- Each test artifact is individually hashed
- The `evidence_merkle_root` in the report provides integrity verification
- Artifact hashes are stored in `artifact_manifest`

## License

MIT License - Dytallix Security Team
