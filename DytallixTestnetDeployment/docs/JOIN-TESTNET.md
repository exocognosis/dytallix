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

Generate a PQC address (encrypted keystore; dilithium label, mock signer under the hood for now)
```
node ./dist/index.js keys add --name mykey --algo dilithium
# You will be prompted for a passphrase; keystore is saved under ~/.dytx/keystore/mykey.json
```

Fund via faucet
- Open Explorer faucet UI or call server `/api/faucet` with your address.
- After a few seconds, query balance:
```
node ./dist/index.js query bank balance <your-address> --rpc https://rpc.dytallix.dev
```

Submit a self‑transfer (nonce fetched from RPC; keystore decrypted at runtime)
- The CLI fetches the account nonce from `/account/:addr` before signing.
- Provide `--keystore mykey` to select a stored key (or omit to auto-match by address).
```
node ./dist/index.js transfer \
  --from <addr> --to <addr> \
  --amount 0.123 --denom udgt \
  --keystore mykey \
  --rpc https://rpc.dytallix.dev
```
- Inspect in explorer once included.

Governance params (always exposed)
```
node ./dist/index.js query gov params --rpc https://rpc.dytallix.dev
```

Notes
- Keystore files are AES-256-GCM encrypted with PBKDF2-HMAC-SHA256 (210k iters).
- Production nodes use Dilithium signatures (`pqc-real`). The CLI currently signs using the SDK mock signer compatible with dev/test clusters; Dilithium signing will be added via native/WASM in a follow‑up.
- Nonces: the CLI queries `/account/:addr` to obtain the correct nonce before signing.
- Amount units: CLI uses base micro‑denoms (udgt/udrt) and converts from decimal to micro.
