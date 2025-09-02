# Join Dytallix Testnet (MVP)

This guide shows how to generate a PQC wallet, query balances, submit a self-transfer, and query governance params using the CLI and SDK.

Prereqs
- Node.js 18+
- `dytx` CLI sources under `cli/dytx`
- RPC endpoint reachable (e.g., `https://rpc.dytallix.dev`)

Install CLI deps
```
cd dytallix-lean-launch/cli/dytx
npm i
```

Generate a PQC address (dilithium default, mock supported for dev)
```
node ./dist/index.js keys add --algo dilithium
# or for dev signing: --algo mock
```

Fund via faucet
- Open Explorer faucet UI or call server `/api/faucet` with your address.
- After a few seconds, query balance:
```
node ./dist/index.js query bank balance <your-address> --rpc https://rpc.dytallix.dev
```

Submit a self‑transfer (dev mode, mock signing)
- For MVP, transaction signing is provided via a mock signer compatible with nodes built with `pqc-mock`.
- Build the node with `--features pqc-mock` for local/dev clusters.
```
node ./dist/index.js transfer --from <addr> --to <addr> --amount 0.123 --denom udgt --rpc https://rpc.dytallix.dev
```
- Inspect in explorer once included.

Governance params (always exposed)
```
node ./dist/index.js query gov params --rpc https://rpc.dytallix.dev
```

Notes
- Production nodes use Dilithium signatures (`pqc-real`). The SDK includes a mock signer for developer networks. A Dilithium signer will be added via native module/WASM in a follow‑up.
- Nonces: first transaction from a fresh address uses nonce=0.
- Amount units: CLI uses base micro‑denoms (udgt/udrt) and converts from decimal to micro.
