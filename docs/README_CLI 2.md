# Dytallix Unified CLI (dyt)

Single developer & demo interface to core node RPC flows.

## Install

From workspace root:

```
cargo build -p dytallix-cli --release
cp target/release/dyt /usr/local/bin/dyt # or add to PATH
```

Environment (overridable by flags):
- `DYT_RPC` (default `http://127.0.0.1:3030`)
- `DYT_CHAIN_ID` (default `dyt-localnet`)
- `DYT_HOME` (default `~/.dyt`)

## Commands

### Keys
```
dyt keys gen --name alice
dyt keys list
dyt keys export --name alice
cat alice.json | dyt keys import --name alice --file alice.json
```
Stores key material under `$DYT_HOME/keys/<name>.json`.
(Current implementation uses a placeholder PQC key: random 32 bytes secret, pk = SHA3-256(sk), address = sha3(tag||pk) first 20 bytes -> dyt1...)

### Transfer
```
dyt transfer --from alice --to dyt1abcd... --amount 100 --fee 1
```
Submits via `/submit` RPC. Nonce inference placeholder (assumes 0 until nonce endpoint exists).

### Stake / Unstake
```
dyt stake --from alice --amount 1000
dyt unstake --from alice --amount 500
```
Currently placeholders until staking module RPC is exposed.

### Vote (Governance)
```
dyt vote --from alice --proposal 1 --option yes
```
Placeholder (prints intent).

### WASM Deploy / Exec
```
dyt deploy --from alice --wasm ./contract.wasm
dyt exec --from alice --contract <addr_or_hash> --msg '{"action":"ping"}'
```
Placeholders until runtime exposes endpoints.

### Claim Rewards (Emission Engine)
```
dyt claim-rewards --to dyt1... --pool community --amount 1000
```
Calls `/emission/claim` RPC and prints remaining pool amount.

### Query
```
dyt query balance --address dyt1...
dyt query tx --hash 0x...
dyt query block --id latest
dyt query emission
dyt query stats
```
Validators / proposals currently placeholders.

## Roadmap
- Replace placeholder PQC with real `pqc-crypto` crate and secure keystore (password + encryption).
- Add nonce endpoint usage & signing of transactions.
- Staking & governance RPC integration once modules land.
- WASM deployment / exec wiring when runtime exposes endpoints.
- Batch & scripting helpers (YAML pipeline execution).
- JSON output mode (`--json`) for automation.

## Testing (Smoke)
Example smoke sequence (after starting node):
```
dyt keys gen --name a
ADDR=$(dyt keys list | awk 'NR==1{print $3}')
# fund ADDR externally or via future faucet helper
# transfer to self
dyt transfer --from a --to $ADDR --amount 1 --fee 1
# claim rewards placeholder pool
dyt claim-rewards --to $ADDR --pool community --amount 10
# query stats
dyt query stats
```

Integrate in CI by invoking each command and asserting non-error exit and expected JSON (extend once JSON mode implemented).

## Design Notes
- Minimal dependencies, async reqwest client for HTTP.
- Simple file-based key storage for rapid iteration.
- Extensible subcommand enum; future modules bolt on without breaking UX.
- Consistent global flags for RPC / chain id / home dir.

