You are to generate production-quality code for an automated cryptographic audit framework.

The system audits a Post-Quantum Cryptography (PQC)–native Layer 1 blockchain protocol with the following properties.

---

## 1. Objective
Build an automated, repeatable cryptographic audit system that continuously evaluates cryptographic primitives, protocol composition, implementation safety, side-channel resistance, and economic-cryptographic interactions.

---

## 2. Target System
Name: Dytallix (PQC-native Layer 1 blockchain)

---

## 3. Execution Environment
- OS: Linux (x86_64)
- CPU: AVX2-capable
- Deployment: CI/CD + local reproducible runs
- Containerization: Docker
- Determinism: Required

---

## 4. Implementation Constraints
- Primary language: Rust
- Orchestration: Rust CLI
- Configuration: YAML
- Artifact output: JSON
- Reproducible builds required

---

## 5. Cryptographic Primitives (Audit Targets)
### Signatures
- ML-DSA-65 (FIPS 204, Dilithium3-derived)
- SLH-DSA-SHAKE-192s (FIPS 205, SPHINCS+)

### KEM
- ML-KEM-768 (FIPS 203, Kyber768-derived)

### Hashing
- BLAKE3 (state, Merkleization)
- SHAKE256 (internal PQC routines, block hash)

---

## 6. Mathematical Assumptions
- Hardness of Module-LWE
- Hardness of Module-SIS
- No known polynomial-time quantum algorithm for SVP/SIVP at selected parameters
- Grover-limited security for hashes

---

## 7. Threat Model (Must Be Encoded)
### Adversaries
- Passive network observer (HNDL)
- Active spammer / DoS attacker
- Minority Byzantine validators (< 1/3 stake)
- Economic cartel (< 51% stake)
- Quantum-capable adversary (post-CRQC)

### Capabilities
- Chosen-plaintext
- Chosen-ciphertext
- Replay
- Fault injection
- Side-channel observation
- Adaptive behavior

---

## 8. Required Automated Test Classes
Enable all of the following:

### Cryptographic
- Parameter adequacy analysis (classical + quantum cost modeling)
- Lattice attack cost simulation (BKZ estimates)
- Signature unforgeability stress tests
- KEM IND-CCA misuse tests
- Hash collision / preimage bounds

### Protocol
- Hash-commit-reveal address safety
- Key rotation invariants
- VRF sortition soundness
- Consensus quorum intersection
- Checkpoint finality safety

### Side-Channel
- Timing variance detection
- Constant-time verification
- Cache behavior profiling

### Fault Injection
- Signature fault recovery attempts
- Aborted signing leakage tests
- Verification bypass attempts

### Randomness
- Deterministic signature validation
- Entropy bias detection
- Nonce reuse detection

### Economic–Cryptographic
- DoS cost asymmetry verification (Wsolve ≥ k·Wverify)
- Bandwidth fee exponential ramp correctness
- PID emission controller stability bounds
- Oracle Medianizer robustness (IQR filtering)

---

## 9. Scheduling & Execution
- Continuous mode (nightly)
- Per-test time budgets
- Parallel execution allowed
- Deterministic replay via seeded runs

---

## 10. Evidence Requirements
Each test must emit:
- test_id
- assumption tested
- pass/fail
- confidence score
- artifact hash
- reproduction seed

Output format: JSON

---

## 11. Decision Policy
- HARD FAIL: private key recovery, signature forgery, KEM break, quorum violation
- WARN: reduced security margin, side-channel signal
- PASS: no violation within budget

---

## 12. Extensibility
- Plugin-based test modules
- Stable trait-based interfaces
- Backward-compatible upgrades only

---

## 13. Explicit Non-Goals
- No legacy ECC testing
- No trust in manual review
- No probabilistic “best-effort” outputs

---

## 14. Code Output Expectations
Generate:
- CLI entry point
- Module-separated test engines
- YAML config examples
- JSON schema for results
- Dockerfile
- README describing execution and reproduction

All code must compile and run without modification.
