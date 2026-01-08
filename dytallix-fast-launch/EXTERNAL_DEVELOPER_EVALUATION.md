# Dytallix Fast-Launch External Developer Evaluation Report

**Date:** January 6, 2026  
**Scope:** `dytallix-fast-launch` directory only  
**Evaluator Role:** External developer with no prior Dytallix knowledge  

---

## Executive Summary

**Verdict: An external developer CANNOT complete onboarding using ONLY `dytallix-fast-launch`.** 

The flow breaks at multiple critical points, with the most significant blocker being missing SDK dependencies. The TypeScript SDK builds but cannot generate wallets without the `pqc-wasm` package. The CLI fails to compile due to a missing `lib/` directory. The Rust SDK depends on external crates outside the scoped folder.

---

## 1. DISCOVERY

### a) Can a developer identify that Dytallix exists?

**YES** - The public GitHub repository at `https://github.com/DytallixHQ/Dytallix` is accessible and contains:
- Overview of Dytallix as a PQC-secure blockchain
- Links to TypeScript and Rust SDKs
- Installation instructions

### b) Can a developer identify `dytallix-fast-launch` as the correct entry point?

**NO - BLOCKER**

The public GitHub repo (`DytallixHQ/Dytallix`) does NOT reference `dytallix-fast-launch`. It contains:
- `DytallixRustSDK/`
- `DytallixTypescriptSDK/`

The `dytallix-fast-launch` folder exists only in the private development workspace (`HisMadRealm/dytallix`), not in the public-facing repository.

### c) Can a developer understand what fast-launch provides?

**PARTIAL**

Within `dytallix-fast-launch`:
- `README.md` provides a directory overview and quick start guide
- `BUILDER_GUIDE.md` provides a developer walkthrough
- Documentation exists but references incorrect paths (`dytallix-lean-launch` instead of `dytallix-fast-launch`)

### d) Can a developer locate SDK-related artifacts?

**PARTIAL**

| Artifact | Location | Status |
|----------|----------|--------|
| TypeScript SDK | `sdk/` | Source present, **missing pqc-wasm** |
| Rust SDK | `sdk/rust/` | Source present, depends on external `pqc-crypto` |
| CLI | `cli/dytx/` | Source present, **missing lib/ directory** |
| Documentation | `docs/` | Present but incomplete |

---

## 2. SDK INSTALLATION

### TypeScript SDK (`dytallix-fast-launch/sdk/`)

**Build attempt:**
```bash
cd dytallix-fast-launch/sdk
npm install    # ✅ Success
npm run build  # ✅ Success - produces dist/
```

**Usage attempt:**
```javascript
const { PQCWallet } = require('./sdk/dist/index.js');
const wallet = await PQCWallet.generate('ML-DSA');
```

**Result: ❌ FAILURE**
```
Error: PQC Provider not found. In Node.js, call PQCWallet.setProvider() 
with a valid IPQCProvider implementation. In Browser, ensure @dytallix/pqc-wasm is loaded.
```

**Root cause:** The SDK requires `@dytallix/pqc-wasm` peer dependency which is:
1. NOT bundled in `dytallix-fast-launch`
2. Located at `/dytallix/DytallixLiteLaunch/crates/pqc-wasm/` (outside scope)
3. Published on npm as `pqc-wasm` but not documented in fast-launch

### External npm SDK (outside scope - for reference only)

```bash
npm install @dytallix/sdk pqc-wasm
```

**Result: ✅ SUCCESS** (when using ESM)
```javascript
import { DytallixClient, PQCWallet, initPQC } from '@dytallix/sdk';
await initPQC();
const wallet = await PQCWallet.generate('dilithium5');
// Address: dyt1xvh8lffm6ujlazac96g4e76gf3n5vkgfwvla2s
```

**Verdict:** SDK installation is **BLOCKED** within `dytallix-fast-launch` scope. The npm-published SDK works but is NOT part of the scoped materials.

### Rust SDK (`dytallix-fast-launch/sdk/rust/`)

**Dependency check:**
```bash
cd dytallix-fast-launch/sdk/rust
cargo check  # ✅ Compiles
```

**Blocker:** `Cargo.toml` references external paths:
```toml
dytallix-node = { path = "../../../blockchain-core" }
dytallix-pqc = { path = "../../../pqc-crypto" }
```

Both paths are **outside** the `dytallix-fast-launch` directory.

### CLI (`dytallix-fast-launch/cli/dytx/`)

**Build attempt:**
```bash
cd dytallix-fast-launch/cli/dytx
npm install    # ✅ Success
npm run build  # ❌ FAILURE - 16 errors
```

**Compilation errors:**
```
Cannot find module '../lib/pqc.js'
Cannot find module '../lib/client.js'
Cannot find module '../lib/tx.js'
Cannot find module '../lib/amount.js'
Cannot find module '../lib/keystore-loader.js'
```

**Root cause:** The CLI references `src/lib/*.ts` files that do NOT exist in `dytallix-fast-launch`. They exist only in `dytallix-lean-launch/cli/dytx/src/lib/`.

---

## 3. WALLET CREATION & KEY MANAGEMENT

### Blockers (within scope)

1. **TypeScript SDK**: Cannot create wallets without `pqc-wasm`
2. **Rust SDK**: Cannot compile without external crate dependencies
3. **CLI**: Cannot build without missing `lib/` directory

### Key generation APIs (documented but not functional)

**TypeScript:**
```typescript
const wallet = await PQCWallet.generate('ML-DSA');
wallet.address;        // D-Address format: dyt1...
wallet.algorithm;      // 'dilithium5'
wallet.getPublicKey();
```

**CLI (from `docs/cli.md`):**
```bash
dytx keygen --label "My Key" --output my-key.json
```

**Address format:** `dyt1` + hex(blake3(pubkey)[0:20] + sha256_checksum[0:4])

### Verdict

**BLOCKED** - No functional wallet creation path within scope.

---

## 4. FUNDING & TOKENS

### Faucet discovery

| Source | Faucet URL |
|--------|-----------|
| `BUILDER_GUIDE.md` | `http://localhost:8787/api/faucet` |
| `.env.example` | `https://api.dytallix.com/api/faucet` |
| `server/index.js` | Implements `/api/faucet` proxy |

### Public faucet test

```bash
curl -X POST "https://dytallix.com/api/faucet" -d '{"address":"dyt1..."}'
# Result: 405 Not Allowed

curl -X POST "https://api.dytallix.com/api/faucet"
# Result: Connection failed (host unreachable)
```

### DGT vs DRT usage

Documented in `genesis.json`:

| Token | Name | Purpose |
|-------|------|---------|
| **DGT** | Dytallix Governance Token | Fixed supply, voting/staking |
| **DRT** | Dytallix Reward Token | Adaptive emission, rewards |

### Verdict

**BLOCKED** - No functional faucet endpoint accessible.

---

## 5. TRANSACTIONS

### RPC endpoints (public testnet - verified working)

```bash
curl https://dytallix.com/rpc/status
# ✅ Returns: {"chain_id":"dytallix-testnet-1","latest_height":813557,...}
```

### Transaction structure (from `sdk/src/client.ts`)

```typescript
const txObj = {
  chain_id: 'dyt-testnet-1',
  fee: '1000',
  nonce: 0,
  memo: '',
  msgs: [{
    type: 'send',
    from: 'dyt1...',
    to: 'dyt1...',
    amount: '1000000',  // micro-units
    denom: 'udrt'
  }]
};
```

### ML-DSA signing

Exposed via `PQCWallet.signTransaction()` in SDK (if functional).

### Verdict

**BLOCKED** - Cannot send transactions without:
1. Functional SDK/CLI
2. Funded wallet
3. Signature generation capability

---

## 6. TOKEN REQUEST / ISSUANCE

### Within scope

- Faucet API implementation exists in `server/index.js`
- Requires `FAUCET_MNEMONIC` environment variable (not provided)
- Falls back to "demo mode" with in-memory balances

### Programmatic issuance

```javascript
const response = await fetch('http://localhost:3001/api/faucet', {
  method: 'POST',
  body: JSON.stringify({ address: 'dyt1...' })
});
```

### Verdict

Local faucet **could work** if server is started, but requires `FAUCET_MNEMONIC` which is not provided in any example configuration.

---

## 7. SIMPLE APPLICATION DEPLOYMENT

### WASM contracts (from `docs/WASM_CONTRACTS.md`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/contract/deploy` | POST | Deploy WASM contract |
| `/contract/call` | POST | Execute contract method |
| `/contract/state/:addr/get` | GET | Query contract state |

### Build tooling

- Reference to `scripts/build_counter_wasm.sh` - **file does not exist in scope**
- References `artifacts/counter.wasm` - **file does not exist in scope**

### Node compilation

```bash
cd dytallix-fast-launch/node
cargo check  # ✅ Compiles (with external dependencies)
```

However, node `Cargo.toml` depends on:
```toml
dytallix-node = { path = "../../blockchain-core" }
dytallix-pqc = { path = "../../pqc-crypto" }
```

Both are **outside** the `dytallix-fast-launch` scope.

### Verdict

**BLOCKED** - No complete contract deployment path within scope.

---

## 8. FINAL EVALUATION

### Can an external developer complete onboarding using ONLY `dytallix-fast-launch`?

# NO

### Flow Breakdown Summary

| Step | Status | Blocker |
|------|--------|---------|
| Discovery | ⚠️ Partial | `dytallix-fast-launch` not referenced in public repo |
| SDK Installation | ❌ Blocked | Missing `pqc-wasm` in scope |
| CLI Build | ❌ Blocked | Missing `lib/` directory |
| Wallet Creation | ❌ Blocked | No functional crypto implementation |
| Funding | ❌ Blocked | No accessible faucet |
| Transactions | ❌ Blocked | Cascading failures from above |
| Deployment | ❌ Blocked | Missing WASM artifacts, external deps |

---

## What is Missing vs Merely Undocumented?

### Missing (must be added)

| Component | What's Missing | Location Needed |
|-----------|----------------|-----------------|
| PQC WASM bindings | `pqc-wasm` package | `sdk/pqc-wasm/` or npm documentation |
| CLI lib files | 5 TypeScript files | `cli/dytx/src/lib/` |
| Contract build script | `build_counter_wasm.sh` | `scripts/` |
| Sample contract | `counter.wasm` | `artifacts/` |
| Faucet endpoint | Working public URL | Documentation |
| Self-contained node | Vendored dependencies | `node/` Cargo.toml |

### Merely Undocumented (exists but not referenced)

| Component | Where It Exists | Issue |
|-----------|-----------------|-------|
| npm SDK | `@dytallix/sdk` + `pqc-wasm` on npm | Not documented in fast-launch |
| Testnet RPC | `https://dytallix.com/rpc` | Works but inconsistently documented |
| Local services | `start-all-services.sh` | Configuration incomplete |

---

## Required Fixes for Self-Sufficiency

### Priority 1: Critical (Blocks All Progress)

1. **Bundle or document `pqc-wasm`**
   - Either copy WASM bindings into `sdk/pqc-wasm/`
   - Or add clear documentation: `npm install pqc-wasm`

2. **Copy missing CLI lib files**
   - Source: `dytallix-lean-launch/cli/dytx/src/lib/`
   - Target: `dytallix-fast-launch/cli/dytx/src/lib/`
   - Files needed:
     - `pqc.ts`
     - `client.ts`
     - `tx.ts`
     - `amount.ts`
     - `keystore-loader.ts`

3. **Provide working faucet**
   - Either: Ensure `https://dytallix.com/api/faucet` accepts POST
   - Or: Include test `FAUCET_MNEMONIC` for local development

### Priority 2: Important (Enables Full Flow)

4. **Vendor Rust dependencies**
   - Publish `dytallix-pqc` to crates.io, or
   - Copy `pqc-crypto/` and `blockchain-core/` into `dytallix-fast-launch/deps/`

5. **Include sample WASM contract**
   - Add `scripts/build_counter_wasm.sh`
   - Add `artifacts/counter.wasm`

6. **Fix documentation paths**
   - Replace all `dytallix-lean-launch` → `dytallix-fast-launch`
   - Update RPC URLs to consistent values

### Priority 3: Polish

7. **Add working quickstart**
   - Single script that works with ONLY in-scope materials
   - End-to-end: install → wallet → fund → send tx

---

## Estimated Effort

| Priority | Scope | Time Estimate |
|----------|-------|---------------|
| Critical fixes | Unblock SDK/CLI | 2-3 days |
| Important fixes | Full flow works | 3-4 days |
| Complete self-sufficiency | Production ready | 1 week |

---

## Appendix: Verified Working Path (Outside Scope)

For reference, the following works but requires external npm packages:

```bash
# Install from npm (NOT in dytallix-fast-launch)
mkdir my-dytallix-app && cd my-dytallix-app
npm init -y
npm install @dytallix/sdk pqc-wasm
```

Create `test.mjs`:
```javascript
import { DytallixClient, PQCWallet, initPQC } from '@dytallix/sdk';

async function main() {
  // Initialize PQC WASM
  await initPQC();
  
  // Connect to testnet
  const client = new DytallixClient({
    rpcUrl: 'https://dytallix.com/rpc',
    chainId: 'dytallix-testnet-1'
  });
  
  // Check status
  const status = await client.getStatus();
  console.log('Block height:', status.latest_height);  // ✅ 813559
  
  // Generate wallet
  const wallet = await PQCWallet.generate('dilithium5');
  console.log('Address:', wallet.address);  // ✅ dyt1...
  
  // Query balance
  const account = await client.getAccount(wallet.address);
  console.log('DGT:', account.balances.DGT);  // 0
  console.log('DRT:', account.balances.DRT);  // 0
}

main();
```

Run:
```bash
node test.mjs
```

**This path works** but relies entirely on npm-published packages, not the `dytallix-fast-launch` folder contents.

---

## Conclusion

The `dytallix-fast-launch` folder contains significant infrastructure but is **not self-contained**. An external developer attempting to use it as a standalone onboarding package will encounter blocking errors within the first 5 minutes of attempting to build the SDK or CLI.

The fastest path to resolution is to:
1. Copy the missing `lib/` directory into the CLI
2. Document the npm `pqc-wasm` dependency
3. Ensure the public faucet is operational

These three fixes would unblock the critical path for external developers.
