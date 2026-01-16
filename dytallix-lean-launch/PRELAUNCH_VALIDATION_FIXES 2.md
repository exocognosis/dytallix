# Prelaunch Validation Script - Issues Fixed

## Summary
Fixed multiple issues preventing the Dytallix testnet prelaunch validation script from running successfully on macOS.

---

## Issues Resolved

### 1. ✅ Cargo Command Error - Missing Binary Specification
**Problem**: `cargo run` failed with "could not determine which binary to run"
**Root Cause**: Workspace has multiple binaries (`dytallix-lean-node`, `txhash`)
**Fix**: Changed from `cargo run -p dytallix-lean-node` to `cargo run --bin dytallix-lean-node` or use `-p` correctly
**File**: `scripts/prelaunch_validation.sh` line 233

### 2. ✅ PulseGuard Health Check Failing - Missing `/health` Endpoint
**Problem**: PulseGuard health checks returned 404 errors
**Root Cause**: FastAPI app didn't have a `/health` endpoint, only `/metrics`
**Fix**: 
- Added `/health` endpoint to `tools/ai-risk-service/app.py`
- Updated health checks to try both `/health` and `/metrics`
**Files**: 
- `tools/ai-risk-service/app.py` (added health endpoint)
- `scripts/prelaunch_validation.sh` (updated health checks)

### 3. ✅ macOS Compatibility - `shuf` Command Not Found
**Problem**: `shuf` command doesn't exist on macOS
**Root Cause**: `shuf` is a Linux-specific command
**Fix**: Created `random_in_range()` function with fallback using `$RANDOM`
**File**: `scripts/prelaunch_validation.sh` lines 102-112

### 4. ✅ Rust Compilation Errors - Missing `Dilithium3` Match Arms
**Problem**: Non-exhaustive pattern matching for `SignatureAlgorithm::Dilithium3`
**Root Cause**: New `Dilithium3` variant added but not handled in all match statements
**Fix**: Added `Dilithium3` cases to match statements in:
- `pqc-crypto/src/bridge.rs` line 558 (security level = 3)
- `pqc-crypto/src/performance.rs` line 228 (gas cost = 1000)
**Files**: 
- `pqc-crypto/src/bridge.rs`
- `pqc-crypto/src/performance.rs`

### 5. ✅ Bash Portability - `cd -` Requires OLDPWD
**Problem**: `cd -` failed with "OLDPWD not set"
**Root Cause**: Subshell contexts don't preserve `OLDPWD`
**Fix**: Wrapped `cd` commands in subshells `(cd dir && command) &` instead of `cd dir && command & cd -`
**File**: `scripts/prelaunch_validation.sh` multiple locations

### 6. ⚠️  Node Chain ID Mismatch - Process Exits on Startup
**Problem**: Node exits immediately with "Chain ID mismatch stored=dyt-local-1 env=dytallix-testnet-1"
**Root Cause**: Existing node database has different chain ID than environment variable
**Current Status**: Node compiles and starts but exits due to chain ID validation
**Workaround Options**:
  a) Clear data directory: `rm -rf ./data`
  b) Set `DYT_CHAIN_ID=dyt-local-1` to match stored chain
  c) Run in mock mode: `./scripts/prelaunch_validation.sh --mock`

### 7. ✅ Node Port Configuration
**Problem**: Initial script used `--rpc` flag which wasn't properly configured
**Root Cause**: Node uses environment variable `DYT_RPC_PORT` not command-line arg
**Fix**: Script now correctly sets `DYT_RPC_PORT=$NODE_PORT` before running node
**File**: `scripts/prelaunch_validation.sh` line 244

---

## Current Status

### ✅ Working
- Script executes without errors
- PulseGuard AI service starts and responds
- API/Faucet service starts and responds  
- All evidence files are generated correctly
- Mock mode works perfectly for validation testing
- All 8 validation checks pass

### ⚠️ Needs Attention
- **Node startup**: Exits due to chain ID mismatch
  - **Quick Fix**: Run `rm -rf dytallix-lean-launch/data` or set `DYT_CHAIN_ID=dyt-local-1`
  - **Alternative**: Use mock mode for validation testing

---

## Testing Results

### Last Run (2025-10-05 15:04:24 UTC)
```
✅ Final prelaunch validation complete
   8/8 checks passed
   Evidence path: launch-evidence/prelaunch-final/SUMMARY.md
```

### Evidence Generated
- ✅ Port configuration (`ports.env`)
- ✅ Wallet addresses (redacted)
- ✅ Mock transaction receipts (DGT + DRT)
- ✅ Governance proposal execution logs
- ✅ WASM contract deployment records
- ✅ AI risk scoring results
- ✅ Balance snapshots (before/after)
- ✅ Complete summary report

---

## Recommendations

1. **For development**: Use mock mode to validate the script structure
   ```bash
   ./scripts/prelaunch_validation.sh --mock
   ```

2. **For integration testing**: Clear node data directory first
   ```bash
   rm -rf dytallix-lean-launch/data
   ./scripts/prelaunch_validation.sh
   ```

3. **For production**: Set environment variables consistently
   ```bash
   export DYT_CHAIN_ID="dytallix-testnet-1"
   export DYT_DATA_DIR="./data-testnet"
   ./scripts/prelaunch_validation.sh
   ```

---

## Files Modified

1. `dytallix-lean-launch/scripts/prelaunch_validation.sh`
   - Fixed cargo command
   - Added random_in_range function
   - Fixed cd - issues
   - Updated health check endpoints
   - Added node port environment variable

2. `dytallix-lean-launch/tools/ai-risk-service/app.py`
   - Added `/health` endpoint

3. `pqc-crypto/src/bridge.rs`
   - Added Dilithium3 security level case

4. `pqc-crypto/src/performance.rs`
   - Added Dilithium3 gas cost case

---

## Next Steps

1. **Resolve chain ID issue** - Choose approach:
   - Clear data directory for fresh start
   - Update DYT_CHAIN_ID to match existing data
   - Keep existing chain ID in environment

2. **Add node health check** - Node may need explicit `/health` endpoint for better monitoring

3. **Test on Linux** - Verify all fixes work on target deployment environment

4. **Add pre-flight checks** - Script could check for chain ID conflicts before starting
