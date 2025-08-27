# State Root Commitment

This document defines how Dytallix computes the canonical `state_root` included in each block header.

## Snapshot Acquisition
1. Execute all block transactions and apply resulting state updates to persistent storage.
2. Obtain an immutable key/value snapshot via `StorageManager::snapshot_kv()` *after* applying updates, *before* signing.
3. No further writes are permitted between snapshot and header signing; otherwise recompute.

## Inclusion / Exclusion Rules
Included: All RocksDB entries considered consensus state (accounts, contract code & storage, staking, governance, etc.).

Excluded prefixes (volatile / metadata):
- `meta:` (height, chain id, best hash) – node local metadata.
- `tx:` (raw transactions) – mempool artifacts.
- `rcpt:` legacy receipt storage (non-consensus).
- `receipt:` current receipt objects (ephemeral, reconstructible from execution + tx ordering).

Additional volatile namespaces may be appended without consensus break; removing an excluded prefix is a consensus change.

## Canonical Ordering
`snapshot_kv()` filters excluded prefixes and produces `(key_bytes, value_bytes)` pairs then sorts lexicographically by raw key bytes (stable, total order). Data structures must serialize deterministically (bincode currently) prior to storage so bytes are stable inputs.

## Commitment Function
Implemented in `state_commitment::commit`:
- Leaf hash: `H_leaf = blake3(key || value)`.
- Build binary Merkle: pair consecutive leaf hashes; internal node: `H_parent = blake3(left || right)`. Odd hash promoted upward unchanged.
- Empty input: `blake3("DYTALLIX/STATE/EMPTY")` constant.
- Output: 32-byte root; `commit_hex` returns hex string for header.

## Determinism Invariants
- Reordering insertions produces identical root (sorted order enforced).
- Identical final key/value multiset => identical root.
- Any changed value or missing/extra key => different root.
- Serialization of nested structures must remain stable; changes to encoding are consensus impacting.

## Timing & Usage
1. Consensus executes block: `runtime.execute_block_txs()` => receipts + state updates applied.
2. Acquire snapshot; compute `state_root = commit_hex(snapshot)`.
3. Populate header fields (excluding signature).
4. Canonical bytes: `PQCManager::canonical_header_without_sig(&header)`.
5. Sign bytes with Dilithium; attach signature & public key.
6. Persist block and auxiliary indices.

## Migration / Future
- Can swap Merkle over sorted pairs with a Sparse Merkle / Verkle implementation preserving: (a) deterministic ordering, (b) same key namespace semantics, (c) exclusion list semantics.
- Add version byte into future header to allow state root algorithm upgrades.

## Test Coverage
See tests: snapshot determinism, different order same root, value mutation changes root.
