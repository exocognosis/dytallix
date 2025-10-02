# Security Notes

## Overview
This project integrates post-quantum signature schemes (Dilithium3, Falcon-512, SPHINCS+-128s) compiled from vendored PQClean sources to WebAssembly with deterministic builds and integrity verification.

## Cryptography Stack
- PQ Schemes: Dilithium3, Falcon-512, SPHINCS+-128s-simple (NIST PQC standard set coverage diversity: lattice vs hash-based).
- Key Material Lifecycle:
  - Generated client-side (WebCrypto for randomness → CSPRNG seeds PQClean C code).
  - Stored only encrypted (never raw) in the browser vault.
  - Decrypted into memory on unlock; wiped (zeroized) on manual lock, tab visibility loss (best-effort), or inactivity timeout.
- Address Derivation (current prototype): `dytallix1` + first 38 hex chars of `sha256(algo_id || base64(pubKey))`. (Will transition to Bech32 with HRP + version + algo code.)

## Vault / KDF & Secret Handling
- Password → Argon2id (libsodium) with parameters chosen for ≈ 250–500ms on mid-range laptop: `opsLimit=3`, `memLimit≈64MB` (tunable via env in future).
- Derived key length: 32 bytes (AES-256-GCM key + HKDF sub-derivations if needed).
- Encrypted Keystore Format (JSON):
  ```json
  {
    "v":1,
    "kdf":"argon2id",
    "params":{"ops":3,"mem":65536,"parallelism":1},
    "algo_keys":{"dilithium3":{...}, ...},
    "cipher":"aes-256-gcm",
    "salt":"base64...",
    "nonce":"base64...",
    "ct":"base64..."
  }
  ```
- Zeroization: after decrypt / sign, Buffers / Uint8Arrays mutated with `fill(0)`; references nulled. JS GC is non-deterministic—residual risk documented.
- No plaintext secret writes to `localStorage`, `sessionStorage`, or IndexedDB.

## Browser Threat Model (Primary Concerns)
| Threat | Mitigation | Residual Risk |
|--------|------------|---------------|
| Malicious third-party script (XSS) | Strict CSP (`default-src 'self'`; no external scripts) | Inline style allowance until hashed styles adopted |
| WASM tampering / substitution | Manifest hash + optional Ed25519 signature check before instantiation | If both manifest & WASM replaced AND signature disabled |
| Memory scraping (in-tab) | Minimize exposure window; zeroize on lock/blur | Active attacker with JS execution can exfiltrate live secrets |
| Phishing domain | Encourage bookmark + TLS; integrity banner mismatch warns users | Sophisticated lookalike + user ignores banner |
| Supply chain (npm dep compromise) | Minimal runtime deps; vendored crypto C; security audit script | Dependency added later without review |
| Timing side-channels | Constant-time primitives in PQClean C; avoid branching on secrets in TS | Browser JIT micro-architectural leakage |

## Supply Chain Controls
- Vendored minimal PQClean sources under `vendor/pqclean/` with recorded upstream commit & LICENSE.
- Deterministic build via pinned emscripten (3.1.57) in CI.
- Manifest (SHA-256) generated per build, optionally Ed25519 signed with CI-held seed (`MANIFEST_SIGN_KEY`).
- Runtime denies operation if any WASM hash mismatch or manifest signature fails.
- CI compares produced hashes against previous known-good to surface unexpected drift.

## Integrity & Tamper Resistance
Flow on app load:
1. Download `manifest.json` + `*.wasm` assets.
2. Compute SHA-256 on each WASM blob (sorted keys).
3. Compare to manifest hashes; if signature present verify Ed25519 over concatenated hash list.
4. Set integrity state: OK / Degraded (manifest fetch transient failure) / Failure (hash mismatch).
5. On Failure: disable signing & high-risk UI elements; prompt hard refresh.

User Feedback:
- Banner + icon color (green / amber / red).
- Console log (dev) with non-sensitive diagnostics.

## Dependency Hygiene
- Minimal external runtime deps; cryptographic core isolated to vendored C.
- `npm run security:audit` (wrapper script) runs `npm audit --omit=dev` + license enumeration → `artifacts/security/audit.txt`.
- PR review gate: changes under `vendor/pqclean/` require explicit reviewer ack.

## Server Hardening (API / Faucet)
Optional security headers via env flags (`ENABLE_SEC_HEADERS=1`, `ENABLE_CSP=1`). See table (unchanged):
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `X-Frame-Options: DENY`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-site`
- `Content-Security-Policy: default-src 'self'; script-src 'self'; connect-src 'self' wss: ws:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'` (plus enumerated origins & style/img adjustments in code)

## Content Security Policy (CSP)
- Dev: Vite sets baseline CSP with only necessary relaxations for HMR (`'unsafe-inline'` styles currently).
- Prod: Dynamic enumeration of allowed `connect-src` origins from env prevents silent addition of exfiltration endpoints.
- Next Hardening Step: remove `'unsafe-inline'` by adopting hashed style tags or extracted CSS.

## Logging & Redaction
- Server logger redacts keys containing: mnemonic / private / secret / token / key. (Case-insensitive.)
- Frontend browser logger similarly scrubs before console output.
- Never log decrypted vault content or derived keys.

## Memory Handling & Zeroization Caveats
- JS cannot guarantee immediate reclamation; zeroization best-effort reduces persistence window.
- WASM linear memory pages containing secrets are overwritten before free when practical; full page purge not always feasible without performance cost.

## Incident Response
1. Detect anomaly (integrity failure, suspicious outbound traffic, audit mismatch).
2. Freeze deployments; snapshot current artifact manifests.
3. Rebuild WASM from clean environment; compare hashes.
4. Rotate manifest signing key (revoke old public key).
5. Release advisory & patched build; force clients to refetch (cache bust).
6. Post-incident review; adjust CSP / dependency allowlist.

## Vault Integration for Key Management

### Overview
Dytallix validators use HashiCorp Vault for secure key storage and retrieval. Private signing keys never touch the filesystem and exist only in Vault's encrypted storage and node memory during runtime.

### Vault Configuration

**Authentication**: AppRole method
- Each validator has a unique Role ID
- Secret ID rotated every 90 days
- Token TTL: 3600 seconds with auto-renewal

**Key Storage Path**: `secret/dytallix/validators/{validator-name}/signing_key`

**Key Properties**:
- Type: PQC (Dilithium3)
- Storage: Encrypted at rest in Vault
- Access: Logged in Vault audit trail
- Rotation: Zero-downtime key rotation supported

### Validator Startup Procedure

1. **Initialize Vault Client**
   ```bash
   export VAULT_ADDR="https://vault.dytallix.internal:8200"
   export VAULT_ROLE_ID="validator-role-001"
   export VAULT_SECRET_ID="[from secure config]"
   ```

2. **Authenticate and Retrieve Key**
   ```bash
   # Node automatically:
   # - Authenticates with AppRole
   # - Retrieves signing key from Vault
   # - Loads key into secure memory
   # - Never writes key to disk
   ```

3. **Start Consensus**
   ```bash
   # Validator joins consensus with Vault-sourced key
   # All signatures use in-memory key material
   ```

### Key Rotation Procedure

1. **Generate New Key in Vault**
   ```bash
   vault write transit/keys/validator-1 \
     type=dilithium3 \
     exportable=false
   ```

2. **Update Validator Configuration**
   ```bash
   # Broadcast key update transaction
   # Old key remains valid for grace period (100 blocks)
   # New key becomes active automatically
   ```

3. **Verify Rotation**
   ```bash
   # Check Vault audit logs
   # Confirm new key in use for signatures
   ```

### Restart and Recovery

**Normal Restart**:
- Node re-authenticates with Vault
- Keys rehydrated from Vault
- No manual intervention required

**Token Expiry**:
- Tokens auto-renew before expiration
- If expired, re-authenticate with AppRole credentials
- Node continues operation with new token

**Vault Unavailability**:
- Node cannot start without Vault access
- Existing running nodes continue with keys in memory
- Alerts triggered for Vault connectivity issues

### Security Guarantees

✅ **No Filesystem Keys**: Private keys never written to disk  
✅ **Audit Trail**: All key access logged in Vault  
✅ **Memory-Only**: Keys exist in node memory only during runtime  
✅ **Automatic Cleanup**: Keys zeroized on node shutdown  
✅ **Rotation Support**: Zero-downtime key rotation  
✅ **Access Control**: Role-based access via AppRole

## TLS Configuration

### Endpoint Security

All public-facing endpoints use TLS 1.3 with strong cipher suites:

**Endpoints**:
- API Gateway: `https://api.dytallix.network`
- RPC Node: `https://rpc.dytallix.network`
- WebSocket: `wss://ws.dytallix.network`
- Faucet: `https://faucet.dytallix.network`

**Protocol Configuration**:
- TLS 1.3 (primary)
- TLS 1.2 (backwards compatibility)
- SSLv3, TLSv1.0, TLSv1.1: **Disabled**

**Cipher Suites** (in order of preference):
1. `TLS_AES_256_GCM_SHA384`
2. `TLS_CHACHA20_POLY1305_SHA256`
3. `TLS_AES_128_GCM_SHA256`

### Certificate Management

**Certificate Authority**: Let's Encrypt  
**Renewal**: Automated (90 days before expiry)  
**OCSP Stapling**: Enabled on all endpoints  
**Certificate Transparency**: All certificates logged

**Manual Renewal** (if needed):
```bash
certbot renew --cert-name dytallix.network
systemctl reload nginx
```

### TLS Health Checks

**Automated Monitoring**:
```bash
# Check TLS configuration
openssl s_client -connect api.dytallix.network:443 -tls1_3 -brief

# Verify certificate validity
openssl s_client -connect api.dytallix.network:443 | \
  openssl x509 -noout -dates
```

**Expected Output**:
- Protocol: TLSv1.3
- Cipher: Strong suite (AES-256-GCM or ChaCha20-Poly1305)
- Certificate: Valid and not expired
- OCSP: Stapling active

### Security Headers

All HTTPS endpoints include:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### Deployment Configuration

**Kubernetes Ingress**:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dytallix-api
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-protocols: "TLSv1.2 TLSv1.3"
    nginx.ingress.kubernetes.io/ssl-ciphers: "TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256"
spec:
  tls:
  - hosts:
    - api.dytallix.network
    secretName: api-dytallix-tls
  rules:
  - host: api.dytallix.network
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: dytallix-api
            port:
              number: 8080
```

### Troubleshooting

**Certificate Issues**:
1. Check certificate expiry: `openssl s_client -connect <endpoint>:443 | openssl x509 -noout -dates`
2. Verify certificate chain: `openssl s_client -connect <endpoint>:443 -showcerts`
3. Check OCSP stapling: `openssl s_client -connect <endpoint>:443 -status`

**TLS Protocol Issues**:
1. Test TLS 1.3: `openssl s_client -connect <endpoint>:443 -tls1_3`
2. List supported ciphers: `nmap --script ssl-enum-ciphers -p 443 <endpoint>`

### Evidence Artifacts

See `launch-evidence/security/` for:
- `vault_integration.log`: Vault key lifecycle tests
- `tls_probe.txt`: TLS configuration validation
- Deployment manifests: Kubernetes configs with Vault + TLS

## Future / Roadmap Hardening
- SLSA provenance build attestation & publish provenance file.
- WebAuthn hardware-backed wrap key for vault master key.
- Enclave-backed faucet signer (mitigate server exfil risk).
- Continuous integrity monitoring (subresource integrity + report-uri).
- In-browser side-channel mitigation experiments (site isolation hints).

## Responsible Disclosure
Please open a security advisory (GitHub Security tab) or email security@dytallix.invalid (placeholder) with detailed reproduction steps. Provide: affected commit SHA, environment, PoC script, and impact assessment.

---

(See `README.md` for operational & troubleshooting notes; `LAUNCH-CHECKLIST.md` for final pre-launch validation steps.)

## Validator Keys (Server) — Vault or Sealed Keystore
- No plaintext private keys are ever written to disk by the node.
- Startup flow (dytallix-lean-node):
  - If `DYTALLIX_VAULT_URL`+`DYTALLIX_VAULT_TOKEN` (or `VAULT_URL`/`VAULT_TOKEN`) are set, the node reads validator key material from HashiCorp Vault KV v2 at `/<mount>/data/<base>/VALIDATOR_ID` (configurable via `DYTALLIX_VAULT_KV_MOUNT`, `DYTALLIX_VAULT_PATH_BASE`). The secret payload is expected to be `{ "data": { "private_key": base64 } }`.
  - Otherwise, a sealed local keystore is used at `~/.dytallix/keystore/validator-<VALIDATOR_ID>.seal`. The keystore is encrypted with Argon2id KDF + ChaCha20-Poly1305. A passphrase is required (prompted interactively or via `DYT_KEYSTORE_PASSPHRASE` for non-interactive).
- Evidence artifacts:
  - `launch-evidence/secrets/vault_config.sample.md` — sample, redacted Vault configuration.
  - `launch-evidence/secrets/keystore_proof.txt` — path, size, and SHA-256 of sealed keystore (no secrets).

### Key Rotation (Operational Steps)
Fast path using CLI (preferred):

- Rotate via Vault (if `DYTALLIX_VAULT_URL`/`VAULT_URL` and token are set):
  - `dcli secrets rotate-validator --validator-id <VALIDATOR_ID>`
- Rotate via sealed keystore fallback (no Vault env present):
  - `DYT_KEYSTORE_PASSPHRASE=... dcli secrets rotate-validator --validator-id <VALIDATOR_ID>`

Manual alternative (for ops automation or break-glass):
1. Prepare new key material (HSM-backed or offline-generated).
2. Vault: `vault kv put secret/dytallix/validators/<VALIDATOR_ID> private_key=$(base64 -w0 newkey.bin)`;
   Keystore: run the node once with `DYT_KEYSTORE_PASSPHRASE` and it will seal to `~/.dytallix/keystore/validator-<VALIDATOR_ID>.seal`.
3. Restart node(s) to load the new key into memory.
4. Verify signatures/attestations generated with the new key; revoke old key where applicable.

Rollback procedure is documented in `ROLLBACK.md`.

Guarantees:
- The application never logs or writes decrypted key material to disk.
- In-memory key buffers are wrapped with `Zeroizing` to reduce residence after drop.
