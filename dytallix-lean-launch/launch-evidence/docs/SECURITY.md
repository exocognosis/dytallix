# SECURITY.md (MVP)

- PQC signatures (Falcon/Dilithium) in node; client-signed AI requests.
- Governance restricts parameter changes to allowlist (gas_limit, consensus.max_gas_per_block).
- Secrets: no raw keys on disk. Vault and sealed keystore providers. Proof in `launch-evidence/secrets/keystore_proof.txt`.
- Prometheus endpoints and basic alerting for TPS/latency.

See also:
- Governance evidence: `launch-evidence/governance/`
- WASM evidence: `launch-evidence/wasm/`
- Ops evidence: `launch-evidence/ops/`

