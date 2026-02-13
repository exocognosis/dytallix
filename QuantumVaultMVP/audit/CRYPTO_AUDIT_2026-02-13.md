# QuantumVaultMVP Cryptographic Audit
Date: 2026-02-13
Scope: `/Users/rickglenn/Desktop/dytallix/QuantumVaultMVP`

## Executive Summary
Overall risk: **Critical**.

The project uses strong modern primitives (ML-KEM-1024, ML-DSA-65, AES-256-GCM, HKDF-SHA256), but several implementation and operational controls negate those strengths:
- PQC signatures are generated but **never verified** in the attestation path (including smart contract path).
- High-impact secrets and privileged keys are embedded in local production config/deployment files.
- JWT/session handling allows token replay after logout.
- Crypto-admin functionality is insufficiently role-restricted.

These issues are directly exploitable and high blast-radius for key custody, attestation integrity, and platform-wide trust.

## Crypto Inventory
| Primitive / Protocol | Where | Purpose | Notes |
|---|---|---|---|
| ML-KEM-1024 | `backend/src/crypto/mlkem.ts:3`, `backend/src/wrapping/wrapping.service.ts:163`, `backend/src/transport/transport.service.ts:52` | KEM for envelope/session secret establishment | Strong choice; correctness depends on downstream key/session controls |
| ML-DSA-65 | `backend/src/crypto/mldsa.ts:3`, `backend/src/attestation/attestation.service.ts:130`, `backend/src/transport/transport.service.ts:165` | Sign attestations and server info | Verify API exists but is not used in production paths |
| SLH-DSA-SHAKE-128s | `backend/src/crypto/slhdsa.ts:3`, `backend/src/anchors/anchors.service.ts:63` | Optional signing anchor generation | No active verification flow observed |
| HKDF-SHA256 | `backend/src/crypto/mlkem.ts:41`, `backend/src/transport/transport.service.ts:131` | Derive AES-256 keys from shared secret + salt | Domain-separated info labels present |
| AES-256-GCM | `backend/src/wrapping/wrapping.service.ts:173`, `backend/src/admin/admin.service.ts:852`, `backend/src/transport/transport.service.ts:217` | AEAD for wrapped assets and session messages | 96-bit nonce generation correct; replay/nonce lifecycle controls incomplete in transport |
| SHA-256 | `backend/src/attestation/attestation.service.ts:114`, `backend/src/admin/admin.service.ts:69` | Attestation hash + manifest/file digests | Attestation hashing lacks canonicalization/domain binding |
| CSPRNG (`randomBytes`) | `backend/src/wrapping/wrapping.service.ts:166`, `backend/src/transport/transport.service.ts:200`, `backend/src/admin/admin.service.ts:849` | Salt/nonce/session ID generation | Good randomness source |
| UUID (`randomUUID`) | `backend/src/admin/admin.service.ts:76` | Manifest object IDs | Non-crypto identity use |
| bcrypt (cost 12) | `backend/src/auth/auth.service.ts:21`, `backend/src/auth/auth.service.ts:116`, `backend/prisma/seed.ts:10` | Password hashing/verification | Acceptable work factor for MVP |
| JWT (HMAC secret) | `backend/src/auth/auth.module.ts:16`, `backend/src/auth/auth.service.ts:43`, `backend/src/auth/strategies/jwt.strategy.ts:16` | API authentication | Revocation/session binding broken |
| TLS/X.509 inspection | `backend/src/tls-scanner/tls-scanner.service.ts:2`, `backend/src/tls-scanner/tls-scanner.service.ts:56` | Scan external TLS endpoints | Scanner mode intentionally uses `rejectUnauthorized: false` |
| Ethereum signing (secp256k1 via ethers) | `backend/src/blockchain/blockchain.service.ts:49`, `backend/src/blockchain/blockchain.service.ts:123` | Sign/send attestation tx | Trust depends on private key protection and chain config |

## Findings
| ID | Severity | File:Line | Vulnerability | Why it matters | Exploit scenario | Recommended fix |
|---|---|---|---|---|---|---|
| QV-CRYPTO-001 | **Critical** | `backend/src/attestation/attestation.service.ts:130`, `contracts/contracts/QuantumVaultAttestation.sol:45` | PQC signatures are never verified in attestation flow | Attestation integrity is not cryptographically enforced; signatures become opaque bytes | Attacker (or compromised backend owner key) anchors forged attestations with arbitrary `mldsaSignature`, and downstream consumers cannot detect forgery from contract state | Before anchoring, call `this.dsa.verify(messageBytes, signature, publicKey)` and fail closed. Persist signer public-key fingerprint/key-id with each attestation. In contract, enforce uniqueness and store signer key hash; if on-chain PQC verify is unavailable, require pre-verified proof artifact and key-id binding. |
| QV-CRYPTO-002 | **Critical** | `.env.production:7`, `.env.production:11`, `.env.production:23`, `infra/docker-compose.yml:41`, `infra/docker-compose.yml:97`, `infra/docker-compose.yml:106` | Sensitive secrets and privileged keys are hardcoded in local production/deploy configs | Exposure of JWT secret, Vault root token, or blockchain private key enables full auth bypass, key extraction, and chain impersonation | A leaked backup/archive/screenshot of this workspace gives attacker valid credentials to mint JWTs, read/write Vault, and submit owner-chain transactions | Remove plaintext secrets from project files. Use injected runtime secrets (Vault AppRole/K8s secret store), rotate all exposed values, and add pre-commit secret scanning. |
| QV-CRYPTO-003 | **High** | `backend/src/auth/auth.service.ts:49`, `backend/src/auth/auth.service.ts:77`, `backend/src/auth/strategies/jwt.strategy.ts:20`, `backend/prisma/schema.prisma:38` | JWT logout/revocation is ineffective; session tokens stored plaintext | Deleted session rows do not invalidate JWT presented to `JwtStrategy`; DB token theft yields reusable bearer tokens | Attacker steals a token once and continues API access until JWT expiry even after user logs out | Add JWT `jti` and validate against active session record on every request. Store only hashed token/session identifiers in DB. Add explicit revocation list/rotation. |
| QV-CRYPTO-004 | **High** | `frontend/src/lib/api.ts:18`, `frontend/src/lib/api.ts:69`, `frontend/src/lib/api.ts:305` | Bearer tokens stored in `localStorage` | Any XSS yields immediate token exfiltration and API compromise | Malicious script in frontend origin reads `localStorage.token` and replays it to backend | Move auth to `HttpOnly` + `Secure` + `SameSite` cookies, reduce token lifetime, and add CSP + output-hardening. |
| QV-CRYPTO-005 | **High** | `backend/src/admin/admin.controller.ts:6`, `backend/src/admin/admin.controller.ts:10`, `backend/prisma/seed.ts:10`, `frontend/src/app/login/page.tsx:141` | Crypto-admin operations are not role-restricted; default credentials are disclosed/seeded | Low-priv authenticated users can trigger sensitive crypto workflows (scan/pipeline/algo updates) | Any authenticated viewer account can run `/admin/pqc-pipeline` and `/admin/algos/update` without ADMIN role | Add `@Roles(UserRole.ADMIN)` (or explicit least-priv set) on all admin crypto endpoints. Remove hardcoded default creds from UI and gate seed defaults behind non-production flag. |
| QV-CRYPTO-006 | **High** | `infra/docker-compose.yml:64`, `infra/docker-compose.yml:73`, `infra/docker-compose.yml:108`, `backend/src/main.ts:23` | Insecure blockchain/auth runtime defaults (dev RPC APIs, insecure unlock, weak secret checks) | Dev-only chain controls and predictable keys dramatically lower barrier to transaction forgery and auth compromise | Exposed JSON-RPC with `personal,debug` and `--allow-insecure-unlock` can be abused if reachable; known dev keys bypass weak fail-fast checks | Remove `personal/debug` and `--allow-insecure-unlock` outside isolated dev. Enforce deny-list for known dev keys/secrets beyond a single literal check. Restrict RPC bind/access. |
| QV-CRYPTO-007 | **High** | `backend/src/blockchain/blockchain.service.ts:93`, `infra/docker-compose.yml:103` | Attestation backend call uses plaintext HTTP and no request authentication | Anchoring response integrity can be tampered in transit; fake tx metadata can be injected | MITM between backend and Dytallix API returns attacker-chosen `tx_hash`/status and pollutes attestation state | Use HTTPS with certificate validation/pinning and signed API requests (mTLS or HMAC/JWT service auth). Fail closed on insecure URL in production. |
| QV-CRYPTO-008 | **Medium** | `backend/src/transport/transport.service.ts:245` | No replay/nonce lifecycle enforcement for AES-GCM transport messages | GCM security depends on nonce uniqueness per key; replayed ciphertexts are accepted | Captured `(nonce,ciphertext,tag)` is replayed repeatedly against the same `sessionId`; future stateful handlers would be vulnerable | Enforce `nonce.length===12`, maintain per-session nonce cache/counter (Redis/Vault), reject duplicates, and bind AAD to `sessionId` + message counter. |
| QV-CRYPTO-009 | **Medium** | `backend/src/attestation/attestation.service.ts:106` | Attestation hash is built from non-canonical JSON without explicit domain separator | Different serializers/platforms may produce mismatched attestable messages; weak cross-context binding | Integrator computes same logical fields in different key order/encoding and fails verification/reproducibility | Use canonical serialization (e.g., JCS/CBOR canonical form) and prepend strict context fields: protocol version, chain ID, contract address, signer key-id. |
| QV-CRYPTO-010 | **Medium** | `backend/src/attestation/attestation.service.ts:29`, `backend/src/transport/transport.service.ts:59` | Key material auto-regenerated on broad Vault read failures | Transient Vault issues can cause silent key rotation and trust discontinuity | Temporary Vault outage triggers unexpected new identity keys; clients/verifiers lose trust continuity | Distinguish `not found` vs connectivity/permission errors. Only generate keys on explicit bootstrap/rotation; fail startup on transient Vault failures. |
| QV-CRYPTO-011 | **Medium** | `backend/src/wrapping/wrapping.service.ts:173`, `backend/src/admin/admin.service.ts:852` | AEAD metadata binding (AAD) is missing | Ciphertext integrity does not cover external metadata fields, enabling semantic tampering | Attacker alters side metadata (`object_id`, `relative_path`, policy fields) while ciphertext/tag remain valid | Set `cipher.setAAD(canonicalMetadata)` and verify with same AAD at decrypt time. Persist metadata hash with envelope. |
| QV-CRYPTO-012 | **Medium** | `backend/src/assets/assets.service.ts:149`, `backend/src/wrapping/wrapping.service.ts:178`, `backend/src/anchors/anchors.service.ts:15` | Tenant identifier used in vault pathing is unsanitized in some flows | Inconsistent path normalization risks tenant-boundary mistakes and key/object path collisions | Crafted `tenantId` with path separators creates unexpected vault hierarchy and cross-tenant confusion | Reuse `sanitizePathSegment` for all tenant-derived vault paths (`assets`, `wrapping`, transport scopes). Add allowlist validation at DTO layer. |
| QV-CRYPTO-013 | **High** | `backend/package.json:33`, `backend/package.json:41`, `backend/package.json:44`, `frontend/package.json:12`, `frontend/package.json:15`, `contracts/package.json:17` | Known vulnerable dependencies in crypto-relevant runtime/toolchain | Public advisories include high-severity issues affecting API gateway, vault client chain, and HTTP client stack | Exploit paths depend on deployment usage, but current versions are within vulnerable ranges per `npm audit` (run 2026-02-13) | Upgrade to patched versions (`fastify`, `@nestjs/platform-fastify`, `axios`, `next`, Hardhat toolchain), then re-run `npm audit --json` in all modules. |

## Patch Sketches (Minimal, High-Impact)
1. `backend/src/attestation/attestation.service.ts:130`
```ts
const isValid = await this.dsa.verify(messageBytes, signature, this.keys.publicKey);
if (!isValid) throw new Error('ML-DSA signature verification failed before anchoring');
```

2. `backend/src/auth/strategies/jwt.strategy.ts:20`
```ts
// After loading user, validate JWT jti/session binding
const session = await this.prisma.session.findUnique({ where: { id: payload.jti } });
if (!session || session.expiresAt < new Date()) throw new UnauthorizedException();
```

3. `backend/src/admin/admin.controller.ts:10`
```ts
@Roles(UserRole.ADMIN)
@Post('pqc-pipeline')
```

4. `backend/src/transport/transport.service.ts:245`
```ts
if (nonce.length !== 12) throw new Error('Invalid nonce length');
// check and reject replayed nonce for sessionId
```

5. `backend/src/assets/assets.service.ts:149` and `backend/src/wrapping/wrapping.service.ts:178`
```ts
const tenantId = sanitizePathSegment(String(assetMeta.tenantId || ''));
```

## Dependency/Config Review Notes
- `npm audit` executed on 2026-02-13:
  - `backend`: 19 vulnerabilities (10 high)
  - `frontend`: 2 vulnerabilities (2 high)
  - `contracts`: 30 vulnerabilities (1 high, 14 moderate)
- Highest-impact backend chain includes Fastify middleware/path bypass and vulnerable vault client dependency chain (`node-vault` -> `postman-request` -> `qs`).
- Frontend high findings include `axios` and `next` DoS advisories.

## Quick Wins (Can Fix Today)
1. Enforce role guards on all `admin` cryptographic endpoints (`backend/src/admin/admin.controller.ts`).
2. Remove hardcoded credentials from UI and seed outputs (`frontend/src/app/login/page.tsx`, `backend/prisma/seed.ts`).
3. Rotate all exposed secrets and private keys in `.env.production` and compose envs.
4. Add local signature verification before attestation submission (`backend/src/attestation/attestation.service.ts`).
5. Disable insecure Geth flags and dev APIs in non-dev compose profiles (`infra/docker-compose.yml`).
6. Upgrade `axios`, `next`, `fastify`, `@nestjs/platform-fastify`, and re-run audits.

## Hardening Roadmap
### 30 Days
1. Implement fixes QV-CRYPTO-001..007.
2. Move auth to secure cookies; add token/session revocation binding.
3. Replace static Vault root token usage with scoped auth (AppRole/Kubernetes auth).

### 60 Days
1. Add deterministic attestation canonicalization and context binding.
2. Add transport replay protections and AAD metadata binding in all AEAD paths.
3. Add secret scanning + policy checks in CI (block known dev keys/tokens).

### 90 Days
1. Introduce key lifecycle governance: explicit rotation ceremonies, key-id pinning, and recovery testing.
2. Add cryptographic integration tests (negative signature tests, replay tests, nonce misuse tests).
3. Perform external red-team validation of attestation trust model and vault boundary enforcement.

## Confidence and Remaining Uncertainty
Confidence: **High** for code/config findings (static line-level evidence).

Targeted uncertainty remains for exploitability of some dependency advisories in this exact deployment topology. To confirm impact, run environment-specific PoCs for:
- Fastify middleware bypass path handling,
- Node-vault request-chain vulnerabilities under your Vault endpoint usage,
- Replay behavior against any future state-mutating transport endpoint derived from `secureEcho`.
