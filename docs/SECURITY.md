# Security Self-Test & PQC Vendor Manifest

## Overview
At process startup a **fail-closed security self-test** runs:
1. **PQC Functional Test**: Generates a key pair, signs a fixed message, verifies the signature, and performs structural checks (length / hex formatting). Uses a placeholder adapter until a real PQC primitive is integrated.
2. **Vendor Integrity Verification**: Recomputes SHA-256 hashes of whitelisted PQC vendor files (`vendor/pqclean`) and compares them to the pinned manifest (`artifacts/pqclean-manifest.json`). Any mismatch or missing file is treated as potential tampering.

If any check fails with `NODE_ENV=production`, the process exits before binding network listeners.

## Threat Model (Selected)
| Threat | Mitigation |
| ------ | ---------- |
| Tampered PQC source files | Hash manifest mismatch causes startup abort. |
| Broken / regressed signature flow | Functional self-test failure stops startup. |
| Partial deployments / corruption | Hash mismatch or functional error halts process. |
| Silent supply chain changes | Manifest + lockfiles highlight file divergence. |

## Behavior
- Success: One structured JSON log entry with `component=startup-self-test`.
- Failure: Error log + exit code 1 (production).
- Non-production: Failure logs but process continues (unless forced) to aid local debugging.
- Skip (development only): Set `SELF_TEST_SKIP=1` (ignored in production).

## Updating the Manifest
1. Add or modify files under `vendor/pqclean/`.
2. Run: `npm run gen:pqclean-manifest`
3. Review the diff (ensure only intentional changes).
4. Commit vendor changes + updated manifest together.

## Standalone Execution
```
npm run self-test
```
 or
```
./scripts/test-pqc.sh
```

## Adding Real PQC
Replace the placeholder adapter in `security/selfTest.js` with a real implementation (e.g., Dilithium, Falcon) ensuring:
- Key generation / sign / verify promise-based API.
- Consistent error throwing on failure.
- Deterministic known-answer tests (KATs) can supplement (avoid embedding sensitive vectors where licensing forbids).

## Logging Example
```json
{
  "level": "info",
  "component": "startup-self-test",
  "msg": "All security self-tests passed",
  "pqc": { "adapter": "placeholder-pqc", "publicKeyLength": 32, "signatureLength": 32 },
  "manifestFiles": 0
}
```

## Fail-Closed Rationale
Security degradation undetected at startup yields long-lived silent compromise risk. Proactively aborting elevates MTTR and reduces blast radius; availability is intentionally sacrificed in favor of integrity under suspicious conditions.

## Developer Notes
Integrate the call prior to any network listener or worker pool creation. The provided `server-secure.js` is a template and can be adapted to the actual entrypoint if different.