# PQC Signing Test Plan

Purpose: Validate that the Rust `dcli` and TypeScript `dytx` CLIs default to Dilithium signing, fetch nonce from RPC, and produce accepted transactions.

## Prerequisites
- Running devnet / testnet RPC endpoint (export RPC_URL if different).
- At least one funded account key in each CLI keystore.

## Environment
```bash
export RPC_URL=${RPC_URL:-"https://rpc-testnet.dytallix.com"}
export CHAIN_ID=${CHAIN_ID:-"dytallix-testnet-1"}
```

## Rust CLI (dcli) Tests
1. List keys to ensure signer is present:
   ```bash
   dcli keys list
   ```
2. Unlock key if required:
   ```bash
   dcli keys unlock --name <keyname>
   ```
3. Send transfer WITHOUT specifying any algo flag:
   ```bash
   dcli tx transfer \
     --from <keyname> \
     --to <recipient_addr> \
     --denom DGT \
     --amount 10 \
     --fee 1000 \
     --gas-price 1000
   ```
4. Expected output contains `algorithm=dilithium5`.
5. Query transaction status / account nonce increment via RPC or a query command:
   ```bash
   dcli query tx --hash <txhash>
   ```
6. Negative test: Temporarily break network (set wrong RPC) and confirm error: `failed to fetch nonce from RPC`.

## TypeScript CLI (dytx) Tests
1. Build (if not built): `npm run build` inside `cli/dytx`.
2. Execute transfer (no algo flag):
   ```bash
   dytx transfer \
     --from <address> \
     --to <recipient_addr> \
     --amount 1 \
     --denom udgt \
     --keystore <keystore.json>
   ```
3. Inspect signed transaction JSON (if using sign + broadcast) to ensure `algorithm` field is `dilithium` or `dilithium5` depending on TS implementation label consistency.
4. Confirm nonce/sequence in successive transactions increments strictly by 1.

## Cross-Validation
- Capture two consecutive transactions, verify second nonce = first nonce + 1.
- Verify signature base64 length aligns with Dilithium5 expected size (~ > 2KB when base64 encoded). Any tiny (e.g. 44-byte) signature implies a mock leftover.

## Artifact Cleanup Verification
- Ensure no `mock.rs` compiled: `grep -R "mock-blake3" target/ || echo 'OK'`.
- Ensure no `pqcMock` usage in runtime code: `grep -R "pqcMock" dytallix-lean-launch/cli/dytx/dist || echo 'OK'`.

## Acceptance Criteria
- All transfers succeed with Dilithium signatures.
- No mock artifacts referenced in source or distribution bundles.
- Nonce always fetched; failure to reach RPC aborts signing.
