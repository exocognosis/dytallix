# 🔍 Quick Search Examples for Explorer

## ⚠️ Important: Real Data Only!

The Explorer now shows **only real blockchain data** - no mock or hardcoded transactions.

## How to Generate Real Transactions

### Option 1: Use the Wallet UI (Easiest)
1. Go to http://localhost:5173/#/wallet
2. Click "Create New Wallet" or import existing
3. Go to Faucet page and request tokens
4. Send tokens to another address
5. Search for your address in Explorer to see real transactions!

### Option 2: Use the CLI Tool
```bash
cd cli/dytx

# Create a keypair
npm run dytx -- keygen --label mykey

# Send tokens
npm run dytx -- transfer \
  --from dytallix125074e67f966c5c9a0538381c2398a8966cda568 \
  --to dyt1recipient000000000001 \
  --amount 100000000 \
  --denom udrt \
  --rpc http://localhost:3030
```

---

## Copy & Paste These Into Explorer Search

### ✅ Working Address (Pre-funded)
```
dytallix125074e67f966c5c9a0538381c2398a8966cda568
```
**Expected Result**: Shows ~14,851 DGT and ~14,935 DRT balance
**Note**: Will show "No transactions found" until you send/receive tokens

### 📦 Recent Block Height
```
6200
```
**Expected Result**: Block details with hash, timestamp, transactions

### 🔗 Block Hash
Get a recent hash first:
```bash
curl -s http://localhost:3030/blocks?limit=1 | jq -r '.blocks[0].hash'
```
Then paste that hash into Explorer

### 🎯 Test the Search

1. **Open Explorer**: http://localhost:5173/#/explorer
2. **Paste any address/block** from above
3. **Press Enter or click Search**
4. **View Real Data!** ✨

---

## API Endpoints You Can Call

```bash
# Current network height
curl http://localhost:3030/stats | jq .height

# Latest 5 blocks
curl http://localhost:3030/blocks?limit=5 | jq

# Specific account
curl http://localhost:3030/balance/dytallix125074e67f966c5c9a0538381c2398a8966cda568 | jq

# Emission pools
curl http://localhost:3030/stats | jq .emission_pools

# Genesis configuration (NEW!)
curl http://localhost:3030/genesis | jq .

# Genesis hash and metadata (NEW!)
curl http://localhost:3030/genesis/hash | jq .

# Token supply from genesis (NEW!)
curl http://localhost:3030/genesis | jq '.token_supply'

# Validator set from genesis (NEW!)
curl http://localhost:3030/genesis | jq '.validators'
```

## Watch Live Block Production

```bash
# In terminal - updates every 2 seconds
watch -n 2 'curl -s http://localhost:3030/stats | jq "{height: .height, mempool: .mempool_size, tps: .rolling_tps}"'
```

---

**The Explorer is now fully functional with searchable real blockchain data!** 🎉
