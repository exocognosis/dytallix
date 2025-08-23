# WASM End-to-End Demo

This document demonstrates deploying and executing a WASM smart contract (counter) using the CLI and explorer.

## Build Counter Contract
```bash
cd smart-contracts/examples/counter
cargo build --target wasm32-unknown-unknown --release
cp target/wasm32-unknown-unknown/release/counter.wasm ../../../artifacts/counter.wasm
```

## Deploy
```bash
dcli contract wasm deploy artifacts/counter.wasm --gas 500000
```
Response (example):
```json
{ "address": "0x...", "code_hash": "0x...", "gas_used": 1234 }
```

## Execute Increment
```bash
dcli contract wasm exec 0xADDRESS increment --gas 20000
```

## Query Value
```bash
dcli contract wasm exec 0xADDRESS get --gas 20000
```
Returns:
```json
{ "result": 1, "gas_used": 345 }
```

## API Endpoints

The WASM runtime provides the following REST API endpoints:

### Deploy Contract
```
POST /wasm/deploy
{
  "code_base64": "base64-encoded-wasm-bytecode",
  "gas_limit": 500000
}
```

Response:
```json
{
  "success": true,
  "data": {
    "address": "0x000000000000000000000000000000000000000001",
    "code_hash": "0x123...",
    "gas_used": 1234
  }
}
```

### Execute Contract Method
```
POST /wasm/execute
{
  "address": "0x000000000000000000000000000000000000000001",
  "method": "increment",
  "args_json": {},
  "gas_limit": 20000
}
```

Response:
```json
{
  "success": true,
  "data": {
    "result_json": { "success": true },
    "gas_used": 2000,
    "height": 1234567890
  }
}
```

### Get Contract Metadata
```
GET /wasm/contract/{address}
```

Response:
```json
{
  "success": true,
  "data": {
    "address": "0x000000000000000000000000000000000000000001",
    "code_hash": "0x123...",
    "creator": "dyt1mock_deployer",
    "deployed_at_height": 1234567890,
    "last_gas_used": 2000,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### Get Contract State (Stub)
```
GET /wasm/contract/{address}/state?key=counter
```

Response:
```json
{
  "success": true,
  "data": {
    "counter": 1,
    "initialized": true
  }
}
```

## Explorer
- New Contracts page lists deployed contracts.
- Detail page allows invoking methods and shows last gas used.

## Gas Model
Currently 1 Wasmtime fuel == 1 gas. This will evolve into a mapped schedule.

## Demo Script
Run the complete end-to-end demo:
```bash
./scripts/demo_wasm_counter.sh
```

## Future Work
- Persistent key-value storage host functions.
- Rich gas schedule.
- Contract upgrade mechanisms.
- Security hardening (import whitelist, memory caps).