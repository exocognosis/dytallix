# Dyt CLI

## Overview
Production-friendly modular CLI for Dytallix.

Modules:
- `cmd/` subcommand handlers
- `keystore/` secure Argon2id + XChaCha20Poly1305 encrypted keys (no plaintext on disk)
- `tx/` canonical message & signed transaction types
- `rpc/` lightweight HTTP client
- `config.rs` persistent defaults at `~/.dyt/config.json`
- `output.rs` uniform JSON vs text printing
- `batch.rs` batch transaction ingestion & validation
- `secure.rs` signal-driven keystore purge

Global flags:
- `--rpc` (override config)
- `--chain-id` (override config)
- `--output text|json` (default text)

## Security Model
Secret keys stored only encrypted in `keystore.json` with:
- KDF: Argon2id (m=19456 KiB, t=2, p=1) -> 32-byte key
- AEAD: XChaCha20-Poly1305 (24-byte nonce)
- Salt: 16 bytes random
- Secret key decrypted only in-memory after `keys unlock`
- Password failure rate limit (5 per process)
- Auto-lock timeout (env `DYL_KEY_TIMEOUT_SECS`, default 300s) after which decrypted keys are purged
- In-memory secret material zeroized on drop (Guard + purge)
- Signal handlers (SIGINT/SIGTERM) trigger immediate in-memory purge (`secure.rs`)

### Keystore JSON Schema
```
{
  "version": 1,
  "keys": [
    {
      "name": "default",
      "address": "dyt1...",
      "pk": "<base64 public key>",
      "enc": {
        "alg": "chacha20poly1305",
        "nonce": "<base64 24 bytes>",
        "salt": "<base64 16 bytes>",
        "kdf": { "alg": "argon2id", "m_cost": 19456, "t_cost": 2, "p": 1 },
        "ct": "<base64 ciphertext+tag>"
      },
      "created": 1690000000
    }
  ]
}
```

### Message & Transaction Schema
Messages (enum, `type` tagged, snake_case):
```
// Msg
{"type":"send","from":"dyt1...","to":"dyt1...","denom":"DGT","amount":"100"}
```
Canonical Tx JSON (fields order stable through serde struct):
```
{
  "chain_id": "dyt-localnet",
  "nonce": 1,
  "msgs": [ {"type":"send", ... } ],
  "fee": "1",
  "memo": ""
}
```
Signed Tx:
```
{
  "tx": { ... },
  "signature": "<base64>",
  "public_key": "<base64>",
  "hash": "0x<sha3-256(tx_json)>"
}
```
Hash: `sha3-256` over canonical JSON bytes of `tx` (no signature fields included).

### Canonical Hashing Rules
1. Serialize `Tx` via serde_json with numeric u128 fields stringified.
2. Compute SHA3-256 digest.
3. Hex prefix with `0x`.
4. Signing uses PQC Active implementation (Dilithium real or mock) over hash bytes.

## Commands & Examples
### Config
```
# Show current (merged) config
$ dyt config show
# Set defaults
$ dyt config set --key rpc --value http://127.0.0.1:3030
$ dyt config set --key chain-id --value dyt-localnet
# JSON output
$ dyt --output json config show
```

### Keys
```
$ dyt keys new --name alice
$ dyt keys list
$ dyt keys unlock --name alice
$ dyt keys change-password --name alice
$ dyt keys export --name alice
```
JSON output variant:
```
$ dyt --output json keys list
```

### Transfer
```
$ dyt tx transfer --from alice --to dyt1xyz... --denom DGT --amount 100 --fee 1
# Legacy shortcut
$ dyt transfer --from alice --to dyt1xyz... --denom DGT --amount 100 --fee 1
```

### Batch Transactions
Batch JSON schema (`cli/src/batch.rs`):
```
{
  "chain_id": "dytallix-testnet-1",
  "from": "alice",
  "nonce": "auto" | <number>,
  "fee": "1000",
  "memo": "", // optional
  "messages": [
    { "type":"send", "to":"dyt1...", "denom":"DGT", "amount":"100" }
  ],
  "broadcast": true
}
```
Rules:
- `nonce":"auto"` fetches from RPC `/account/nonce/{address}` else falls back to 0.
- `denom` must be `DGT` or `DRT` (case-insensitive input; normalized upper-case).
- `amount` > 0.
- At least one message required.

Create file example `batch.json`:
```
{
  "chain_id": "dytallix-testnet-1",
  "from": "alice",
  "nonce": "auto",
  "fee": "10",
  "memo": "airdrop round 1",
  "messages": [
    { "type":"send","to":"dyt1abc...","denom":"dgt","amount":"5" },
    { "type":"send","to":"dyt1def...","denom":"DGT","amount":"7" }
  ],
  "broadcast": false
}
```
Sign only (no broadcast):
```
$ cat batch.json | dyt tx batch --file - --output json
[
  {
    "tx": { ... },
    "signature": "<base64>",
    "public_key": "<base64>",
    "hash": "0x..."
  }
]
```
Broadcast variant (`broadcast:true`):
```
$ dyt tx batch --file batch.json --output json
[
  { "hash": "0x...", "status": "ok" }
]
```
Text output prints simple lines (`hash=... status=...`).

Security note: If interrupted (Ctrl+C) during batch processing, in-memory decrypted keys are immediately purged by signal handlers.

## Testing
```
cargo test -q
cargo test -q --no-default-features --features pqc-mock
```

## Exit Codes
- Non-zero on validation, RPC, signing, or IO errors.

## Future Work
- Staking, governance, wasm deploy integration
- Offline signing flow
