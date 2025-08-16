# Dytallix Lean Launch RPC

Status: MV(T) + Persistent Storage + Background Block Producer
Default Port: 3030
Base URL: http://localhost:3030

Environment Flags:
- DYT_DATA_DIR (default: ./data) – Root directory for RocksDB (`node.db`).
- DYT_CHAIN_ID (default: dyt-local-1) – Enforced across restarts (chain ID mismatch aborts).
- DYT_GENESIS_FILE (default: genesisBlock.json) – Used to seed initial balances for any `dyt1...` addresses found in `dgt_allocations` on first boot (height=0 only).
- RUNTIME_MOCKS (default: false) – When true, periodic synthetic events; signature checks relaxed.
- FRONTEND_ORIGIN (optional) – If set, CORS will only allow this origin; otherwise * is allowed.
- MAX_TX_BODY (default: 8192) – Max bytes accepted for POST /submit content length limit.
- DYT_BLOCK_INTERVAL_MS (default 2000) – Interval for background block production.
- DYT_EMPTY_BLOCKS (default true) – If true produce empty blocks when no txs.
- BLOCK_MAX_TX (default 100) – Max txs per block.
- DYT_WS_ENABLED (default true) – Enable /ws websocket.

## Amount / Numeric Types
All large numeric values (balances, amounts, fees) are serialized as strings for JSON safety (u128 friendly).

## Nonce Rules
- Omitted `nonce` on /submit -> server auto uses current sender nonce.
- Provided nonce MUST equal current account nonce or request is rejected 422 with `{ error: "InvalidNonce", expected, got }`.
- On inclusion: sender nonce increments by 1.

## Data Model (RocksDB)
Key prefixes:
- acct:{address} -> bincode(AccountState { balance, nonce })
- blk_hash:{hash} -> bincode(Block)
- blk_num:{u64_be_hex} -> block hash (ascii)
- tx:{hash} -> bincode(Transaction)
- rcpt:{hash} -> bincode(TransactionReceipt)
- meta:chain_id -> chain id string
- meta:height -> u64 (BE bytes)
- meta:best_hash -> latest block hash

## Transaction Receipt
```
{
  hash, status: "success"|"failed"|"pending", block_height, index, fee,
  from, to, amount, nonce, error (optional)
}
```

## State Rules
- Nonce stored per account; must match exactly for inclusion.
- On inclusion of transfer: sender balance -= (amount + fee); sender nonce++ ; recipient balance += amount; fee currently burned (no credit).
- Pending tx stored immediately (status pending until receipt exists).

## Response Envelope (legacy note)
New endpoints return raw JSON objects without a success wrapper (moving toward lean schema). Older docs referenced `{ success, data }`.

## Endpoints
1. POST /submit – submit transfer
2. GET /tx/{hash} – pending or confirmed receipt
3. GET /balance/{address}
4. GET /block/{height|hash|latest}
5. GET /blocks?offset=&limit= – descending from `offset` (or latest)
6. GET /stats – { height, mempool_size, rolling_tps?, chain_id }
7. GET /peers – [] placeholder
8. WS /ws – events `new_transaction`, `new_block`

## Errors (JSON)
`{ "error": "Code", ... }`
- InvalidNonce (422)
- Duplicate (409)
- MempoolFull (429)
- InsufficientBalance (422 inclusion or immediate reject if detectable)
- NotFound (404)

Example error:
```
HTTP 422
{"error":"InvalidNonce","expected":0,"got":2}
```

## Chain ID Persistence
On first startup the node records the `DYT_CHAIN_ID` into RocksDB under `meta:chain_id`. On subsequent boots the provided env value must match stored value or the node aborts to prevent accidental fork / data corruption.

## Example cURL
Submit (auto nonce):
```
curl -X POST http://localhost:3030/submit \
  -H 'Content-Type: application/json' \
  -d '{"from":"dyt1senderdev000000","to":"dyt1receiverdev000","amount":"10","fee":"1"}'
```
Submit (explicit nonce=0):
```
curl -X POST http://localhost:3030/submit \
  -H 'Content-Type: application/json' \
  -d '{"from":"dyt1senderdev000000","to":"dyt1receiverdev000","amount":"10","fee":"1","nonce":0}'
```
Get Tx:
```
curl http://localhost:3030/tx/0xHASH
```
List Blocks:
```
curl 'http://localhost:3030/blocks?limit=5'
```
Get Block:
```
curl http://localhost:3030/block/latest
```
Balance:
```
curl http://localhost:3030/balance/dyt1senderdev000000
```
Stats:
```
curl http://localhost:3030/stats
```

## WebSocket Usage
```
wscat -c ws://localhost:3030/ws
# Example server pushes:
# {"type":"new_transaction","hash":"0x..."}
# {"type":"new_block","height":2,"hash":"0x...","txs":["0x..."]}
```

## Devnet Script
See `scripts/devnet.sh` for an automated E2E proving:
- Block production every DYT_BLOCK_INTERVAL_MS
- Tx lifecycle pending -> success
- Balance / nonce mutation
- Persistence across restart

## Future
- Real signature verification
- Gas accounting / fee distribution
- State root + proofs
- Contract execution layer
- Indexed queries (address tx history)

