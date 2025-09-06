WASM Smart Contracts (MVP)

Endpoints (served by server/index.js):

- POST `/contract/deploy`
  - Body: `{ code_base64?: string, gas_limit?: number, from?: string, initial_state?: any }`
  - Uses the built-in JSON-RPC method `contract_deploy` on the Rust node.
  - If `code_base64` is omitted, uses `artifacts/counter.wasm`.
  - Evidence written to `launch-evidence/wasm/deploy_tx.json` + `contract.wasm`.

- POST `/contract/call`
  - Body: `{ address: string, method: string, params?: object, gas_limit?: number }`
  - Bridges to `contract_execute` on the Rust node.
  - Appends to `launch-evidence/wasm/calls.json` and updates `gas_report.json`.

- GET `/contract/state/:addr/get`
  - Calls the contract `get` method and writes `final_state.json`.

Build the sample contract:

```
./dytallix-lean-launch/scripts/build_counter_wasm.sh
```

This produces `dytallix-lean-launch/artifacts/counter.wasm`.

Notes
- Gas metering: Wasmtime consume_fuel is configured in Rust; coarse safety via epoch deadlines + manual charges in host fns.
- Host functions available: storage_get/set/delete, crypto_hash, crypto_verify_signature, get_block_height/time, get_caller_address, debug_log.
- PQC verification: bridges to `PQCManager` in the Rust runtime.

