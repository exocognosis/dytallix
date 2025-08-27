# Dytallix Gas Model (Draft)

Base host operation costs (GasTable defaults):
- storage_get: 40
- storage_set: 80 + 5 * ceil(value_len / 32)
- storage_delete: 50
- crypto_hash: 15 + 15 * ceil(data_len / 32) (base + per 32-byte chunk)
- crypto_verify_signature: 5000
- env_read (context access): 5
- log: 30 + 5 * ceil(msg_len / 64)

General formula: total_cost = base_cost + scaling_factor * ceil(size / unit) where applicable.

Execution fuel is preloaded with transaction gas_limit. Each host call charges immediately via Wasmtime fuel (consume_fuel). Upon completion remaining fuel => gas_used = gas_limit - remaining.

Out of gas abort semantics: If a host function tries to consume beyond remaining fuel Wasmtime returns an error; runtime surfaces failure and gas_used == gas_limit.

Future Extensions:
- Per-instruction baseline (Wasmtime fuel already accounts for instructions)
- Tiered pricing for storage growth (charging per new key vs overwrite)
- Refunds on storage_delete (currently none)
- Distinct costs for PQC algorithms (Dilithium/Falcon/SPHINCS)

Determinism: Costs depend only on input sizes & algorithm identifiers, not wall-clock or randomness.
