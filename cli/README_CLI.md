# Dytallix CLI (dcli)

## Dual Token Model
Governance token: **DGT** (used for staking, governance proposals, voting, security).
Reward token: **DRT** (emission / rewards distribution). CLI accepts only these two denoms.
All examples use `DGT` for governance/staking flows and `DRT` for reward transfers where noted.

## Overview
Production-friendly modular CLI for Dytallix.

Modules:
- `cmd/` subcommand handlers
- `keystore/` secure Argon2id + XChaCha20Poly1305 encrypted keys (no plaintext on disk)
- `tx/` canonical message & signed transaction types
- `rpc/` lightweight HTTP client
- `config.rs` persistent defaults at `~/.dcli/config.json`
- `output.rs` uniform JSON vs text printing
- `batch.rs` batch transaction ingestion & validation
- `secure.rs` signal-driven keystore purge

Global flags:
- `--rpc` (override config)
- `--chain-id` (override config)
- `--output text|json` (default text)

Backward compatibility: old env vars with `DYT_` prefix still read with deprecation warnings. Prefer `DX_*` going forward.

## Security Model
Secret keys stored only encrypted in `keystore.json` with:
- KDF: Argon2id (m=19456 KiB, t=2, p=1) -> 32-byte key
- AEAD: XChaCha20-Poly1305 (24-byte nonce)
- Salt: 16 bytes random
- Secret key decrypted only in-memory after `keys unlock`
- Password failure rate limit (5 per process)
- Auto-lock timeout (env `DX_KEY_TIMEOUT_SECS`, default 300s) after which decrypted keys are purged
- In-memory secret material zeroized on drop (Guard + purge)
- Signal handlers (SIGINT/SIGTERM) trigger immediate in-memory purge (`secure.rs`)
- Structured logging via `tracing` (set `RUST_LOG=info` or `warn`, no secrets ever logged)
- Passphrase retry UX with bounded attempts + backoff (env override)
- CI no-confirm mode to skip interactive confirmation in automation

### Passphrase UX (Retries & Backoff)
Defaults (configurable):
- Max retries: 3 (`DX_PASSPHRASE_MAX_RETRIES`)
- Backoff: 400ms (`DX_PASSPHRASE_BACKOFF_MS`)

### CI Mode (No Confirm)
Set `DX_CI_NO_CONFIRM=1` (or `true`) to disable confirmation prompt in non-interactive pipelines.

### Message & Transaction Schema
Messages (enum, `type` tagged, snake_case):
```json
{"type":"send","from":"dyt1...","to":"dyt1...","denom":"DGT","amount":"100"}
```
Canonical Tx JSON (fields order stable through serde struct):
```json
{
  "chain_id": "dyt-localnet",
  "nonce": 1,
  "msgs": [ {"type":"send", ... } ],
  "fee": "1",
  "memo": ""
}
```

## Commands & Examples
### Config
```
$ dcli config show
$ dcli config set --key rpc --value http://127.0.0.1:3030
$ dcli config set --key chain-id --value dyt-localnet
$ dcli --output json config show
```

### Keys
```
$ dcli keys new --name alice
$ dcli keys list
$ dcli keys unlock --name alice
$ dcli keys change-password --name alice
$ dcli keys export --name alice
```
JSON output variant:
```
$ dcli --output json keys list
```

### Transfer
```
$ dcli tx transfer --from alice --to dyt1xyz... --denom DGT --amount 100 --fee 1
# Legacy shortcut supported (still works):
$ dcli transfer --from alice --to dyt1xyz... --denom DGT --amount 100 --fee 1
```
Denom must be `DGT` or `DRT` (case-insensitive input normalized to uppercase). Use `DRT` for reward token transfers.

### Batch Transactions
Batch JSON schema (`cli/src/batch.rs`):
```json
{
  "chain_id": "dytallix-testnet-1",
  "from": "alice",
  "nonce": "auto",
  "fee": "10",
  "memo": "airdrop round 1",
  "messages": [
    { "type":"send","to":"dyt1abc...","denom":"dgt","amount":"5" },
    { "type":"send","to":"dyt1def...","denom":"DRT","amount":"7" }
  ],
  "broadcast": false
}
```
Sign only (no broadcast):
```
$ cat batch.json | dcli tx batch --file - --output json
```
Broadcast variant (`"broadcast": true`):
```
$ dcli tx batch --file batch.json --output json
```

### JSON Output Example (Signed Tx)
```json
[
  {
    "tx": { ... },
    "signature": "<base64>",
    "public_key": "<base64>",
    "hash": "0x..."
  }
]
```

## Testing
```
cargo test -q -p dcli
cargo test -q -p dcli --no-default-features --features pqc-mock
```

## Migration Notes
- Binary renamed from `dyt` to `dcli`.
- Env vars `DYT_*` deprecated; use `DX_*` (`DX_PASSPHRASE_MAX_RETRIES`, etc.).
- Config home moved from `~/.dyt` to `~/.dcli`.
- Denoms restricted to `DGT` and `DRT`.

Optional shell alias for transition:
```
alias dyt=dcli
```
