# Dytallix PQC End-to-End Quickstart Guide

**One-page guide to create wallets, send PQC-signed transactions, and verify receipts**

---

## Prerequisites

- Node.js 18+ and npm/pnpm
- Rust 1.70+ and Cargo
- Git

## 1. Clone and Build

```bash
# Clone repository
git clone https://github.com/HisMadRealm/dytallix.git
cd dytallix/dytallix-lean-launch

# Build node
cd node
cargo build --release --features pqc-real
cd ..

# Build CLI
cd cli/dytx
npm install
npm run build
cd ../..
```

## 2. Start Services

### Terminal 1: Start Node

```bash
cd node
DYT_PQC_ALGO_DEFAULT=dilithium3 \
DYT_PQC_ALGO_ALLOWLIST=dilithium3,dilithium5 \
DYT_CHAIN_ID=dyt-local-1 \
cargo run --release --features pqc-real
```

**Verify node is running:**
```bash
curl http://localhost:3030/status
# Should return: {"status":"healthy", ...}

curl http://localhost:3030/api/pqc/status
# Should return: {"pqc_enabled":true,"algo_default":"dilithium3",...}
```

### Terminal 2: Start API/Faucet (Optional)

```bash
# If using the API server
cd backend
PORT=8787 DYT_NODE_URL=http://localhost:3030 npm run dev
```

## 3. Create Wallets

```bash
cd cli/dytx

# Create sender wallet
npx ts-node src/index.ts keygen \
  --name sender \
  --passphrase "test1234567890"

# Create recipient wallet
npx ts-node src/index.ts keygen \
  --name recipient \
  --passphrase "test1234567890"

# List wallets and get addresses
npx ts-node src/index.ts list-keys
```

**Expected Output:**
```
Saved keystores:
- sender: dytallix1abc...
- recipient: dytallix1xyz...
```

## 4. Fund Wallets (Dev Faucet)

```bash
# Get sender address
SENDER=$(npx ts-node src/index.ts list-keys --output json | jq -r '.keys[0].address')

# Fund with DGT tokens
curl -X POST http://localhost:3030/dev/faucet \
  -H "Content-Type: application/json" \
  -d "{\"address\":\"$SENDER\",\"denom\":\"udgt\",\"amount\":\"1000000000\"}"

# Fund with DRT tokens
curl -X POST http://localhost:3030/dev/faucet \
  -H "Content-Type: application/json" \
  -d "{\"address\":\"$SENDER\",\"denom\":\"udrt\",\"amount\":\"50000000\"}"

# Verify balance
curl "http://localhost:3030/balance/$SENDER?denom=udgt"
curl "http://localhost:3030/balance/$SENDER?denom=udrt"
```

## 5. Send PQC-Signed Transactions

### 5a. Send DGT Transaction

```bash
RECIPIENT=$(npx ts-node src/index.ts list-keys --output json | jq -r '.keys[1].address')

npx ts-node src/index.ts tx \
  --from sender \
  --to "$RECIPIENT" \
  --amount 100 \
  --denom DGT \
  --memo "First PQC transfer" \
  --passphrase "test1234567890" \
  --rpc http://localhost:3030 \
  --chain-id dyt-local-1
```

**Expected Output:**
```
✅ Transaction submitted successfully!
Transaction Hash: 0xabc123...
Algorithm: dilithium3
Status: pending
```

### 5b. Send DRT Transaction

```bash
npx ts-node src/index.ts tx \
  --from sender \
  --to "$RECIPIENT" \
  --amount 50 \
  --denom DRT \
  --memo "Second PQC transfer" \
  --passphrase "test1234567890" \
  --rpc http://localhost:3030 \
  --chain-id dyt-local-1
```

### 5c. Send Combined Multi-Denom Transaction

```bash
# Create payload file
cat > /tmp/multi-tx.json <<EOF
{
  "to": "$RECIPIENT",
  "amount": 25,
  "denom": "DGT",
  "memo": "Multi-denom transfer",
  "fee": "2000"
}
EOF

npx ts-node src/index.ts sign \
  --address "$SENDER" \
  --payload /tmp/multi-tx.json \
  --keystore sender \
  --passphrase "test1234567890" \
  --out /tmp/signed-tx.json

# Submit signed transaction
curl -X POST http://localhost:3030/submit \
  -H "Content-Type: application/json" \
  -d @/tmp/signed-tx.json
```

## 6. Verify Receipts

### Get Transaction Receipt

```bash
# Save transaction hash from step 5
TX_HASH="0xabc123..."

# Get receipt
curl http://localhost:3030/transactions/$TX_HASH | jq

# Check receipt fields
curl http://localhost:3030/transactions/$TX_HASH | jq '{
  status: .status,
  algorithm: .algorithm,
  gas_used: .gas_used,
  height: .height,
  from: .from,
  to: .to
}'
```

**Expected Receipt:**
```json
{
  "status": "success",
  "algorithm": "dilithium3",
  "gas_used": 21000,
  "height": 42,
  "from": "dytallix1abc...",
  "to": "dytallix1xyz..."
}
```

### Verify Balances

```bash
# Check sender balance
curl "http://localhost:3030/balance/$SENDER?denom=udgt" | jq

# Check recipient balance
curl "http://localhost:3030/balance/$RECIPIENT?denom=udgt" | jq

# Verify conservation: sender_before = sender_after + recipient_increase + fees
```

## 7. View in Explorer (Optional)

If the explorer frontend is running:

```bash
# Start frontend (Terminal 3)
cd frontend
npm install
npm run dev

# Open browser to http://localhost:5173
# Navigate to Transactions page to see your transfers
```

## 8. Run Automated E2E Test

```bash
# Run triplet transfer evidence script
cd scripts/evidence
bash pqc_triplet_run.sh \
  --rpc http://localhost:3030 \
  --chain-id dyt-local-1 \
  --algo dilithium3

# Check generated evidence
ls -la ../../launch-evidence/pqc-triplet/
cat ../../launch-evidence/pqc-triplet/SUMMARY.md
```

**Expected Evidence Files:**
- `receipt_dgt.json` - DGT transfer receipt
- `receipt_drt.json` - DRT transfer receipt
- `receipt_combined.json` - Combined transfer receipt
- `balance_sender_before.json`, `balance_sender_after.json`
- `balance_alice_before.json`, `balance_alice_after.json`
- `balance_bob_before.json`, `balance_bob_after.json`
- `balance_carol_before.json`, `balance_carol_after.json`
- `receipt_table.txt` - Human-readable receipt summary
- `conservation_summary.md` - Value conservation proof
- `SUMMARY.md` - Complete test report

## Troubleshooting

### Issue: `INVALID_SIGNATURE` Error

**Cause:** Algorithm mismatch between CLI and node.

**Fix:**
1. Check CLI algorithm: `grep DILITHIUM_ALGO cli/dytx/src/lib/pqc.ts`
2. Check node config: `curl http://localhost:3030/api/pqc/status`
3. Ensure both use `dilithium3`

### Issue: `INVALID_CHAIN_ID` Error

**Cause:** Chain ID mismatch.

**Fix:**
- Set `--chain-id dyt-local-1` in CLI commands
- Set `DYT_CHAIN_ID=dyt-local-1` when starting node

### Issue: `INSUFFICIENT_FUNDS` Error

**Cause:** Wallet not funded or insufficient balance.

**Fix:**
```bash
# Re-fund wallet
curl -X POST http://localhost:3030/dev/faucet \
  -H "Content-Type: application/json" \
  -d "{\"address\":\"$SENDER\",\"denom\":\"udgt\",\"amount\":\"1000000000\"}"
```

### Issue: Node Compilation Fails

**Cause:** Missing PQC dependencies.

**Fix:**
```bash
# Update Rust
rustup update

# Clean and rebuild
cd node
cargo clean
cargo build --release --features pqc-real
```

### Issue: CLI Commands Fail

**Cause:** PQC binaries not built.

**Fix:**
```bash
cd ../../pqc-crypto
cargo build --release --bin keygen_raw --bin pqc-sign
```

## Next Steps

- Read the [PQC Algorithm Compatibility Matrix](../pqc/ALGO_COMPAT_MATRIX.md)
- Explore the [API Documentation](../api/README.md)
- Test with different algorithms using `--algo dilithium5`
- Set up monitoring with `/metrics` endpoint
- Deploy to testnet using [Testnet Deployment Guide](../operators/testnet-deployment.md)

## Support

- GitHub Issues: https://github.com/HisMadRealm/dytallix/issues
- Documentation: https://docs.dytallix.com
- Community: Discord or Telegram (links in README)

---

**Note:** This guide uses `dev/faucet` which is for local development only. For testnet/mainnet, use proper faucet services with rate limiting and CAPTCHA.
