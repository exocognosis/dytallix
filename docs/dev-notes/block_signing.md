# Block Signing & Verification

## Objective
Provide a deterministic, self‑contained canonical representation of the block header for PQC (Dilithium) signing that excludes the signature itself (no self‑reference).

## Canonical Bytes
Function: `PQCManager::canonical_header_without_sig(&BlockHeader) -> Vec<u8>`
Steps:
1. Clone header.
2. Zero / clear `header.signature.signature.data` and `header.signature.public_key`.
3. Serialize clone with `bincode` (deterministic struct field order).
4. Returned bytes are the canonical message to sign / verify.

## Signing Flow
1. Assemble header fields (number, parent_hash, transactions_root, state_root, timestamp, validator, nonce) with an *empty* signature (placeholders only).
2. Compute canonical bytes.
3. `sig = pqc.inner.sign(bytes)` (Dilithium5 currently).
4. Set `header.signature = { signature: sig, public_key: validator_pk }`.
5. Persist block.

## Verification Flow
1. Receive block.
2. Recompute canonical bytes via the same function (clearing signature fields logically).
3. Verify: `pqc.inner.verify(bytes, &block.header.signature.signature, pk)`.
4. Derive validator address: `dyt1 + hex(blake3(pk)[0..20])`; must match `header.validator`.
5. Reject block if verification fails or derived address mismatch; log DEBUG details.

## Invariants
- Signature never influences its own digest (excluded bytes).
- Validator address derivation is deterministic and purely a function of provided Dilithium public key.
- Any mutation of a signed header field (besides signature/public_key) invalidates verification.

## Test Matrix
- `validator_address_derivation` stable across runs.
- `block_sign_verify` happy path (true), tampered field (false).
- Canonical bytes identical on repeated construction.

## Future
- Add version byte to header for extensible serialization.
- Multi‑sig / threshold support: extend signature struct to vector of signatures over the same canonical bytes.
