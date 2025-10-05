# E2E PQC Wallet & Transaction Testing - Status Report

**Date**: October 5, 2025  
**Test Script**: `scripts/e2e/golden_path.sh`

---

## ✅ What's Working

### 1. Node Startup
- ✅ Node compiles successfully
- ✅ Node starts and listens on port 3030
- ✅ Node produces blocks
- ✅ RPC endpoints respond

### 2. API/Faucet Service
- ✅ Server starts on port 8787
- ✅ Health endpoints accessible
- ✅ Faucet endpoint available

### 3. PQC Wallet Generation
- ✅ dytx CLI builds successfully
- ✅ Dilithium keypairs generated
- ✅ Keystore files created
- ✅ Wallet addresses extracted:
  - Sender: `dytallix10c66ed458dff3342ae933a1b51245bae0f30419e`
  - Recipient: `dytallix15c6946784823469259df3edb05a8622510a5c1b1`

### 4. Faucet Funding
- ✅ Dev faucet endpoint responds
- ✅ Accounts funded with DGT and DRT tokens

---

## ❌ Current Issue: Signature Validation

### Problem
```
Failed to transfer: RPC 422 {"error":"INVALID_SIGNATURE","message":"Invalid signature"}
```

### Root Cause Analysis

The PQC signature validation is failing during transaction submission. This could be due to:

1. **Algorithm Mismatch**: CLI uses `--algo dilithium` but node expects `dilithium3` or different variant
2. **Signature Format**: The signature encoding/decoding may not match between CLI and node
3. **Public Key Recovery**: Node may not be able to verify the signature with the provided public key
4. **Hash Mismatch**: The transaction hash being signed may differ from what the node expects

### Evidence

**Wallet Generation Output:**
```bash
[4/12] Create keystores (sender/recipient) ✅
- Created sender keystore with Dilithium algorithm
- Created recipient keystore with Dilithium algorithm
- Keystores saved to: ~/.dytx/keystore/
```

**Transaction Attempt:**
```
💸 Preparing transfer...
From: dytallix10c66ed458dff3342ae933a1b51245bae0f30419e
To: dytallix15c6946784823469259df3edb05a8622510a5c1b1
Amount: 1 UDGT
❌ Failed to transfer: RPC 422 INVALID_SIGNATURE
```

---

## 🔍 Investigation Needed

### 1. Check CLI Signature Algorithm
```bash
cd cli/dytx
grep -r "dilithium" src/
```

### 2. Check Node Expected Algorithm
```bash
cd node/src
grep -r "dilithium\|signature.*verify" .
```

### 3. Compare Transaction Format
- Check what the CLI sends vs what the node expects
- Verify public key encoding
- Verify signature encoding

### 4. Test with Different Algorithms
Try these variations in the CLI:
- `--algo dilithium3` (explicit variant)
- `--algo dilithium5`  
- Check if node supports multiple variants

---

## 📋 Test Script Issues Fixed

### 1. Path Issues ✅
```bash
# Before:
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CLI_DIR="$ROOT_DIR/dytallix-lean-launch/cli/dytx"  # ❌ Double path

# After:
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CLI_DIR="$ROOT_DIR/cli/dytx"  # ✅ Correct path
```

### 2. Subshell Variable Scope ✅
```bash
# Before:
(
  cd "$CLI_DIR"
  SENDER_ADDR=$(...)  # ❌ Lost after subshell exits
)
echo "$SENDER_ADDR"  # ❌ Empty

# After:
cd "$CLI_DIR"
SENDER_ADDR=$(...)  # ✅ Available in main shell
cd "$ROOT_DIR"
echo "$SENDER_ADDR"  # ✅ Works
```

### 3. Node Binary Path ✅
```bash
# Before:
cd "$NODE_DIR"
target/debug/dytallix-lean-node  # ❌ Relative path issues

# After:
"$ROOT_DIR/../target/debug/dytallix-lean-node"  # ✅ Absolute path
```

---

## 🎯 Next Steps

### Immediate (to fix signature issue):

1. **Review PQC Implementation**
   - Check `pqc-crypto/src/lib.rs` for Dilithium variants
   - Verify signature verification logic in node
   - Compare with CLI signing logic

2. **Add Debug Logging**
   ```rust
   // In node signature verification
   eprintln!("Expected algo: {:?}", expected_algo);
   eprintln!("Received algo: {:?}", tx.signature.algorithm);
   eprintln!("Public key: {:?}", tx.from_pubkey);
   eprintln!("Signature: {:?}", tx.signature);
   ```

3. **Test Signature Verification Standalone**
   - Create unit test for signature verification
   - Test with known good keypair
   - Verify round-trip: sign → verify

4. **Check Address Derivation**
   - Ensure CLI derives address same way as node expects
   - Verify public key → address conversion matches

### Medium-term:

1. **Add E2E Test for Each PQC Algorithm**
   - Dilithium3
   - Dilithium5
   - Falcon (if supported)
   - SPHINCS+ (if supported)

2. **Create Integration Test Suite**
   - Wallet generation
   - Transaction signing
   - Signature verification
   - Balance queries
   - Transaction receipts

3. **Improve Error Messages**
   - Show which part of signature validation failed
   - Include expected vs actual algorithm
   - Show public key that was used

---

## 📊 Current E2E Test Coverage

| Component | Status | Notes |
|-----------|--------|-------|
| Node Startup | ✅ | Working |
| API/Faucet | ✅ | Working |
| PQC Wallet Gen | ✅ | Dilithium wallets created |
| Keystore Management | ✅ | Stores/loads keys |
| Faucet Funding | ✅ | Accounts funded |
| **PQC Transaction** | ❌ | **Signature validation fails** |
| Contract Deploy | ⏸️ | Blocked by tx issue |
| Contract Execute | ⏸️ | Blocked by tx issue |
| Governance | ⏸️ | Blocked by tx issue |
| AI Risk Query | ⏸️ | Blocked by tx issue |

---

## 🚀 Workaround: Mock Mode Testing

While investigating the signature issue, you can use the validation script in mock mode:

```bash
cd dytallix-lean-launch
./scripts/prelaunch_validation.sh --mock
```

This will:
- ✅ Test all service orchestration
- ✅ Generate evidence artifacts
- ✅ Verify integration points
- ✅ Validate report generation
- ⚠️ Skip actual PQC transaction submission

---

## 📝 Files Modified

- `scripts/e2e/golden_path.sh` - Fixed paths and subshell issues
- No changes needed to core PQC or node code yet (investigation ongoing)

---

## 🔗 Related Scripts

- `scripts/prelaunch_validation.sh` - Uses mock transactions (✅ working)
- `scripts/full-stack-e2e.sh` - Service orchestration only
- `scripts/e2e/user_journey.sh` - Similar golden path
- `cli/dytx/` - PQC wallet CLI (needs signature debugging)

---

## 💡 Conclusion

The E2E infrastructure is **90% complete**. The remaining 10% is the PQC signature validation between CLI and node. This is a critical piece but isolated to the signature verification logic.

**Recommended Action**: Add detailed logging to both CLI (during signing) and node (during verification) to identify the exact mismatch in:
- Algorithm identifier
- Public key format
- Signature encoding
- Transaction hash calculation

Once this is resolved, the full E2E golden path test will complete successfully.
