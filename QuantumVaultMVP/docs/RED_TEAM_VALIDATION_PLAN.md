# QuantumVault External Red-Team Validation Plan

## Objective

Validate the end-to-end trust model for:

1. attestation integrity and signer trust continuity
2. Vault boundary enforcement and scoped-secret isolation
3. resilience of key lifecycle governance controls

This plan is the 90-day external assessment package defined in the cryptographic hardening roadmap.

## Scope

In scope:

- Attestation flow from backend signing through blockchain anchoring metadata.
- Key governance APIs:
  - `GET /api/v1/admin/keys/status`
  - `POST /api/v1/admin/keys/attestation/rotate`
  - `POST /api/v1/admin/keys/transport/rotate`
  - `POST /api/v1/admin/keys/recovery-test`
- Vault access model used by backend AppRole/Kubernetes policy scope.
- Transport session anti-replay and nonce validation on PQC endpoints.

Out of scope:

- general web application UI/UX testing unrelated to cryptographic trust boundaries
- non-production third-party infrastructure not controlled by QuantumVault

## Engagement Model

- Testing style: gray-box (architecture and API docs provided; no source modifications by testers).
- Test window: 2 weeks (5 days active testing, 5 days retest/reporting).
- Target environment: staging mirror of production policy and auth controls.
- Change freeze: no cryptographic logic changes during active testing window.

## Required Scenarios

## 1) Attestation trust model

Test goals:

1. Attempt forged attestation payload injection with mismatched signer context.
2. Attempt replay of prior signed payloads against new asset/context.
3. Validate signer key continuity checks across rotation events.
4. Validate downstream detection when key pin or signer context mismatches.

Expected pass condition:

- forged and replayed attestations are rejected or provably flagged, and trust continuity remains bound to expected signer identity.

## 2) Vault boundary enforcement

Test goals:

1. Attempt path traversal and cross-namespace reads/writes outside `quantumvault/*`.
2. Attempt key reads using non-privileged service credentials.
3. Validate denied access to non-approved mounts/paths.
4. Validate Vault policy least-privilege for runtime tokens.

Expected pass condition:

- unauthorized read/write/list operations fail consistently and are audit-logged.

## 3) Key ceremony abuse resistance

Test goals:

1. Attempt rotation with stale expected prior key IDs.
2. Attempt rotation without valid admin authorization.
3. Attempt startup with pin mismatches and bootstrap disabled.
4. Validate recovery-test execution after each successful rotation.

Expected pass condition:

- unauthorized/stale rotations fail closed; pin mismatch blocks startup; successful rotations include passing recovery checks.

## 4) Transport cryptographic misuse tests

Test goals:

1. Replay identical `secure-echo` ciphertext/counter payload.
2. Submit invalid nonce length payloads.
3. Attempt modified AAD context tampering.

Expected pass condition:

- replay/misuse/tampering requests are rejected with non-success status and no state corruption.

## Evidence Requirements

Red team should provide:

1. attack narrative and reproducible steps
2. request/response samples and timestamps
3. impact rating and blast radius
4. concrete remediation guidance
5. retest validation results after fixes

QuantumVault team should provide:

1. environment architecture and data-flow diagram
2. sanitized API/auth documentation
3. key rotation ceremony evidence samples
4. Vault policy definitions for runtime identities

## Exit Criteria

Engagement considered complete when:

1. all critical and high findings are remediated or have approved risk acceptance
2. all remediated findings pass retest
3. final report and remediation tracker are archived with security leadership sign-off

## Post-Engagement Actions

1. Map all findings to roadmap and create change tickets.
2. Update `docs/KEY_GOVERNANCE_RUNBOOK.md` with validated operational improvements.
3. Add regression tests for each confirmed exploit path.
