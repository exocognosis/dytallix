# Dytallix CLI (dytx) – Governance & WASM

This doc shows end-to-end usage of governance proposals and WASM contract lifecycle using `dytx`.

Prereqs
- Install: `cd dytallix-lean-launch/cli/dytx && npm install && npm run build`
- RPC URL: set `--rpc` flag or `DYTALLIX_RPC_URL` env (default: https://rpc-testnet.dytallix.com)

Global flags
- `--rpc <url>` RPC endpoint URL
- `--output json|text` Output format

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
- For production PQC signing of transactions, use the `pqc-sign` subcommand and native binaries. Governance and contract flows here use direct RPC calls and JSON-RPC contract facade designed for MVP.

