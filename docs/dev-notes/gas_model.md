# Gas Model

This document codifies the current gas schedule for WASM smart contract execution in Dytallix. It specifies per–host function base costs and size‑based multipliers. Values are conservative and designed to be easy to reason about and deterministic across platforms.

Goals:
- Deterministic: identical inputs → identical gas on every node
- Bounded: prevent pathological CPU/memory usage
- Simple: clear, fixed costs; linear size scaling

## Units
- 1 gas ≈ 1 nano‑op (logical accounting unit; not wall time).
- All charges are u64 and saturating where applicable. Never negative.

## Host Function Costs

Storage:
- storage_read(key_len): base=200, key_bytes=5 per byte
- storage_write(key_len, val_len): base=600, key_bytes=5/byte, val_bytes=20/KB (ceil)
- storage_remove(key_len): base=300, key_bytes=5/byte

Crypto:
- keccak256(len): base=400, bytes=12/KB (ceil)
- sha256(len): base=350, bytes=10/KB (ceil)
- blake3(len): base=350, bytes=10/KB (ceil)
- ed25519_verify: flat=3_000
- pqc_verify_dilithium5(len_msg): base=25_000, msg_bytes=8/KB (ceil)

Memory/ABI:
- alloc(len): base=100, bytes=2/KB (ceil)
- dealloc(len): base=40, bytes=1/KB (ceil)
- copy(len): base=80, bytes=6/KB (ceil)

Env & Misc:
- now(): flat=50
- caller(): flat=50
- contract_address(): flat=50
- emit_event(topic_len, data_len): base=300, topic_bytes=4/byte, data_bytes=8/KB (ceil)

## Size Multipliers
- Per‑byte multipliers apply to exact byte counts.
- Per‑KB multipliers apply to ceil(len/1024).

Examples:
- storage_write(32, 1000B) → 600 + 32*5 + 1*20 = 780 gas
- sha256(4097B) → 350 + 5*10 = 400 gas

## Metering Rules
- Charge on entry to each host fn using the above schedule.
- If remaining_gas < charge → trap with OutOfGas before the operation.
- Gas accounting must be monotonic: used_gas strictly increases.
- Determinism: do not branch charges on CPU features or platform.

## Call/Deploy Overheads
- deploy_contract: base=20_000 + code_bytes=40/KB (ceil)
- call_contract: base=5_000 + input_bytes=10/KB (ceil)

## Refunds
- No refunds in the current model (simplifies determinism). Future work may introduce bounded refunds for storage_remove.

## Versioning
- Gas schedule version: v1.0 (locked). Changing any constant requires a chain upgrade proposal and version bump.

## Testing
- Determinism test runs identical tx sets twice and asserts equal gas_used and state_root.
- CI fails if any TxReceipt records gas_used <= 0.

