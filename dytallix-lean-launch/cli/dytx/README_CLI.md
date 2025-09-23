# Dytallix CLI (dytx) – Governance & WASM

This doc shows end-to-end usage of governance proposals and WASM contract lifecycle using `dytx`.

Prereqs
- Install: `cd dytallix-lean-launch/cli/dytx && npm install && npm run build`
- RPC URL: set `--rpc` flag or `DYTALLIX_RPC_URL` env (default: https://rpc-testnet.dytallix.com)
- Rust toolchain: ensure `cargo` is available so the CLI can build the Dilithium signer binaries on first use

Global flags
- `--rpc <url>` RPC endpoint URL
- `--output json|text` Output format

PQC keys & transfers
- `dytx keys add --name <label>` generates a Dilithium5 keypair via the Rust `dytallix-pqc` binaries and saves an encrypted keystore (passphrase prompted or provided via `DYTX_PASSPHRASE`).
- `dytx keygen --label <label>` produces the same Dilithium5 keystore, optionally writing to a custom path when `--output` is supplied.
- `dytx transfer --from <addr> --to <addr> --amount <amt> --denom udgt` fetches the current nonce from the RPC, builds the canonical transaction, signs the SHA3-256 hash with Dilithium5, and broadcasts it to the node.
- `dytx sign --address <addr> --payload transfer.json --out signed.json` performs the same Dilithium5 signing flow but writes the signed transaction to disk; combine with `dytx broadcast --file signed.json` for offline signing workflows.
- The CLI defaults to Dilithium5 signing for every transaction path. Set `DYTX_PQC_MANIFEST` if the `dytallix-pqc` crate lives outside the default `../../../../pqc-crypto` location.

Governance
- Submit proposal
  dytx gov submit \
    --title "Raise max gas" \
    --description "Increase max gas per block to 20M" \
    --key max_gas_per_block \
    --value 20000000 \
    --rpc http://127.0.0.1:8545

  Writes `launch-evidence/cli/proposal.json` with `proposal_id` and inputs.

- Vote on proposal
  dytx gov vote \
    --proposal 1 \
    --from dytallix1voter... \
    --option yes \
    --rpc http://127.0.0.1:8545

  Appends to `launch-evidence/cli/votes.json`.

- Tally
  dytx gov tally --proposal 1 --rpc http://127.0.0.1:8545

  Writes `launch-evidence/cli/tally.json`.

WASM Contracts
- Deploy a counter contract
  dytx contract deploy --wasm examples/counter.wasm --rpc http://127.0.0.1:8545

  Output:
  - Address and gas used
  - Appends a line to `launch-evidence/cli/contract_deploy.log`

- Execute increment twice
  dytx contract exec --address <ADDR> --method increment --rpc http://127.0.0.1:8545
  dytx contract exec --address <ADDR> --method increment --rpc http://127.0.0.1:8545

  Each call appends a line to `launch-evidence/cli/contract_exec.log`.

- Query
  dytx contract query --address <ADDR> --rpc http://127.0.0.1:8545

  Returns `{ count: 2 }` after two increments.

Integration Flow (MVP test)
1) Submit → Vote → Tally
   - `proposal.json`, `votes.json`, `tally.json` under `launch-evidence/cli/` confirm on-chain updates.
2) Deploy → Exec x2 → Query
   - `contract_deploy.log`, `contract_exec.log` under `launch-evidence/cli/` plus query result `count = 2`.

Notes
- CLI uses the node’s REST and JSON-RPC endpoints exposed in `node/src/main.rs`.
- All transaction helpers now call the Dilithium5 signer by default; the standalone `pqc-sign` command remains as a low-level bridge for raw message signing or diagnostics.
