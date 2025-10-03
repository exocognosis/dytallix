# Dytallix Lite Launch PQC (Dilithium3)

This document defines the end-to-end Post-Quantum Cryptography integration using CRYSTALS-Dilithium3 across CLI, wallet, server, and explorer.

Key points:
- Algorithm: pqc/dilithium3 only (NIST standard). PQC_ALGORITHM must be 'dilithium3' when enabled.
- Addressing: address = bech32(hrp, sha256(pubkey)[0..20]). Default HRP 'dyt'.
- Canonical bytes: deterministic JSON (stable key ordering) over object {chainId, accountNumber, sequence, msgs, fee, memo}.
- Envelope:
  {
    "signer": { "address": "...", "publicKey": "<b64>", "algo": "pqc/dilithium3" },
    "signature": "<b64>",
    "body": { ...canonical sign doc... }
  }

Security notes:
- Secret keys must be stored encrypted-at-rest in wallet; memory should be zeroized soon after use where possible.
- RNG: use getrandom/OsRng; do not implement custom RNG.
- Do not log secrets.

Tests and vectors:
- Rust native unit tests in crates/pqc-wasm.
- TypeScript vector verification in packages/pqc.

Migration:
- Set PQC_ENABLED=true and PQC_ALGORITHM=dilithium3 in .env.
- Wallets must switch to PQC signing; legacy CosmJS is disabled when PQC is enabled.
