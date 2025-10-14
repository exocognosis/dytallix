# 🗺️ @dytallix/pqc-wasm → @dytallix/sdk Integration Roadmap

## 📊 Current Status

```
┌─────────────────────────────────────────────────────────────┐
│  ✅ COMPLETED: @dytallix/pqc-wasm Package                   │
│                                                              │
│  📦 Location: dytallix-fast-launch/pqc-wasm/                │
│  📄 Documentation: Complete                                  │
│  🔨 Build System: Ready                                      │
│  🚀 Publishing: Ready                                        │
│  📋 Status: READY TO PUBLISH                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ⏳ PENDING: @dytallix/sdk Integration                      │
│                                                              │
│  📦 Location: github.com/DytallixHQ/Dytallix                │
│  📄 Files to Modify: 11 files                               │
│  🔧 Status: NEEDS MODIFICATION                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Files to Modify in GitHub Repo

### Repository: **github.com/DytallixHQ/Dytallix**

```
github.com/DytallixHQ/Dytallix/
│
├─ 🔴 CRITICAL (Must Change)
│  ├─ package.json              ← Add @dytallix/pqc-wasm dependency
│  ├─ src/wallet.ts             ← Replace window hacks with imports
│  └─ README.md                 ← Update installation instructions
│
├─ 🟡 IMPORTANT (Should Change)
│  ├─ src/index.ts              ← Export initPQC function
│  ├─ CHANGELOG.md              ← Document integration (v0.2.0)
│  └─ examples/                 ← Update all example files
│
└─ 🟢 OPTIONAL (Nice to Have)
   ├─ CONTRIBUTING.md           ← Add development workflow
   ├─ tests/wallet.test.ts      ← Add comprehensive tests
   ├─ .npmignore                ← Clean publish artifacts
   └─ tsconfig.json             ← Ensure WASM support
```

---

## 🚀 Step-by-Step Integration Plan

### Phase 1: Publish PQC WASM Package ⏱️ 5 minutes

```bash
# Step 1.1: Build the package
cd dytallix-fast-launch/pqc-wasm
./build.sh

# Step 1.2: Test locally
cd pkg
npm link

# Step 1.3: Publish to npm
cd ..
./publish.sh
# ➜ Choose: patch (0.1.0 → 0.1.1) or keep 0.1.0
# ➜ Confirm publication

# Step 1.4: Verify published
npm view @dytallix/pqc-wasm
```

**Result**: ✅ `@dytallix/pqc-wasm@0.1.0` available on npm

---

### Phase 2: Modify Local SDK ⏱️ 30 minutes

```bash
# Step 2.1: Install published package
cd dytallix-fast-launch/sdk
npm install @dytallix/pqc-wasm@latest

# Step 2.2: Modify files (see detailed checklist)
# ➜ Edit package.json
# ➜ Rewrite src/wallet.ts
# ➜ Update src/index.ts
# ➜ Update README.md
# ➜ Update CHANGELOG.md

# Step 2.3: Build and test
npm run build
npm test

# Step 2.4: Test examples
node examples/create-wallet.js
```

**Result**: ✅ Local SDK working with published pqc-wasm

---

### Phase 3: Update GitHub Repository ⏱️ 10 minutes

```bash
# Step 3.1: Clone/pull latest
git clone https://github.com/DytallixHQ/Dytallix.git
cd Dytallix

# Or if already cloned:
git pull origin main

# Step 3.2: Create feature branch
git checkout -b feat/integrate-pqc-wasm

# Step 3.3: Copy modified files from local SDK
# (Or manually edit on GitHub)

# Step 3.4: Commit changes
git add .
git commit -m "feat: integrate @dytallix/pqc-wasm for quantum-resistant crypto"

# Step 3.5: Push to GitHub
git push origin feat/integrate-pqc-wasm

# Step 3.6: Create Pull Request
# ➜ Go to GitHub
# ➜ Create PR: feat/integrate-pqc-wasm → main
# ➜ Review and merge
```

**Result**: ✅ GitHub repo updated

---

### Phase 4: Publish Updated SDK ⏱️ 5 minutes

```bash
# Step 4.1: Ensure on main branch
git checkout main
git pull origin main

# Step 4.2: Run tests
npm test

# Step 4.3: Bump version
npm version minor  # 0.1.0 → 0.2.0 (breaking change)

# Step 4.4: Publish to npm
npm publish

# Step 4.5: Create GitHub release
git push --tags
# ➜ Go to GitHub Releases
# ➜ Draft new release for v0.2.0
```

**Result**: ✅ `@dytallix/sdk@0.2.0` published with PQC integration

---

## 📝 Detailed File Modifications

### File 1: `package.json`

**Change Type**: Dependency Update  
**Difficulty**: ⭐ Easy  
**Time**: 1 minute

```diff
{
  "dependencies": {
    "axios": "^1.6.0",
-   "base64-js": "^1.5.1"
+   "base64-js": "^1.5.1",
+   "@dytallix/pqc-wasm": "^0.1.0"
  },
- "peerDependencies": {
-   "@dytallix/pqc-wasm": "^0.1.0"
- },
- "peerDependenciesMeta": {
-   "@dytallix/pqc-wasm": {
-     "optional": true
-   }
- }
}
```

---

### File 2: `src/wallet.ts`

**Change Type**: Complete Rewrite  
**Difficulty**: ⭐⭐⭐ Medium  
**Time**: 20 minutes

**Before** (using window hacks):
```typescript
if (typeof window !== 'undefined' && (window as any).PQCWallet) {
  const keypair = await (window as any).PQCWallet.generateKeypair(algorithm);
  return new PQCWallet(keypair);
}
```

**After** (using published package):
```typescript
import init, * as pqc from '@dytallix/pqc-wasm';

let wasmInitialized = false;

async function ensureWasmInit() {
  if (!wasmInitialized) {
    await init();
    wasmInitialized = true;
  }
}

static async generate(algorithm: PQCAlgorithm = 'ML-DSA'): Promise<PQCWallet> {
  await ensureWasmInit();
  
  const { publicKey, privateKey } = pqc.generate_keypair();
  const address = pqc.public_key_to_address(publicKey);
  
  return new PQCWallet({
    publicKey: Buffer.from(publicKey).toString('base64'),
    secretKey: Buffer.from(privateKey).toString('base64'),
    address,
    algorithm
  });
}
```

**Full rewrite available in**: `SDK_INTEGRATION_CHECKLIST.md`

---

### File 3: `README.md`

**Change Type**: Documentation Update  
**Difficulty**: ⭐ Easy  
**Time**: 5 minutes

**Sections to Add**:

1. **Installation** - Mention automatic pqc-wasm install
2. **WASM Initialization** - Show how to manually init if needed
3. **Browser Support** - Note WebAssembly requirements

**Example Addition**:
```markdown
## Installation

npm install @dytallix/sdk

The SDK automatically includes `@dytallix/pqc-wasm` for quantum-resistant cryptography.

## Requirements

- Node.js 18+ (for WebAssembly support)
- Modern browser with WebAssembly (Chrome 91+, Firefox 89+, Safari 15+)

## Quick Start

```typescript
import { PQCWallet } from '@dytallix/sdk';

// WASM auto-initializes on first use
const wallet = await PQCWallet.generate('ML-DSA');
console.log('Address:', wallet.address);
```
```

---

### File 4: `src/index.ts`

**Change Type**: Export Addition  
**Difficulty**: ⭐ Easy  
**Time**: 2 minutes

```diff
// Export main classes
export { DytallixClient } from './client';
export { PQCWallet, type PQCAlgorithm, type KeyPair } from './wallet';
export * from './errors';

+// Export WASM initialization (optional, for manual control)
+export { default as initPQC } from '@dytallix/pqc-wasm';
```

---

### File 5: `CHANGELOG.md`

**Change Type**: Version Documentation  
**Difficulty**: ⭐ Easy  
**Time**: 3 minutes

```markdown
## [0.2.0] - 2025-10-14

### Added
- Integrated `@dytallix/pqc-wasm` package for quantum-resistant cryptography
- Proper WebAssembly initialization handling
- Export `initPQC` for manual WASM initialization

### Changed
- **BREAKING**: Wallet generation now uses real ML-DSA-65 signatures (FIPS 204)
- Removed browser-only `window.PQCWallet` workaround
- Improved error messages for crypto operations

### Fixed
- PQC signatures are now actually quantum-resistant
- Proper key serialization and address generation
- WASM initialization race conditions

### Migration from 0.1.x
- No code changes required for basic usage
- Ensure Node.js 18+ for WebAssembly support
- If using browser, ensure WebAssembly is enabled
```

---

## 🎯 Priority Order

### Day 1: Publish PQC WASM
1. ✅ Build: `./build.sh`
2. ✅ Test: Link and verify
3. ✅ Publish: `./publish.sh`

### Day 2: Modify SDK Files
1. ✅ `package.json` - Add dependency
2. ✅ `src/wallet.ts` - Rewrite with imports
3. ✅ `src/index.ts` - Export initPQC
4. ✅ `README.md` - Update docs
5. ✅ `CHANGELOG.md` - Document changes

### Day 3: Test & Publish
1. ✅ Local testing
2. ✅ Push to GitHub
3. ✅ Publish SDK v0.2.0

---

## 🧪 Testing Checklist

After each modification, verify:

### Local Testing
- [ ] `npm install` works
- [ ] `npm run build` succeeds
- [ ] `npm test` passes
- [ ] TypeScript compiles without errors
- [ ] Examples run successfully

### Integration Testing
- [ ] Create new wallet: `PQCWallet.generate('ML-DSA')`
- [ ] Sign transaction works
- [ ] Export/import keystore works
- [ ] Address format correct (`dyt1...`)

### Browser Testing
- [ ] Bundle with webpack/vite
- [ ] WASM loads in browser
- [ ] No console errors
- [ ] Wallet generation works

### Node.js Testing
- [ ] ESM import works
- [ ] CommonJS require works
- [ ] TypeScript types recognized

---

## 📞 Decision Points

Before proceeding, decide:

### 1. Dependency Strategy
- ✅ **Option A**: Regular dependency (recommended)
  - Pro: Users get crypto automatically
  - Con: Increases SDK size by ~200KB
  
- ⚠️ **Option B**: Peer dependency
  - Pro: Users can skip if not using PQC
  - Con: Extra install step for users

**Recommendation**: Option A (regular dependency)

### 2. Version Bump
- ✅ **0.1.0 → 0.2.0** (minor)
  - Reason: Adding real crypto is a significant feature
  - Breaking: Window hack removal breaks edge cases
  
- ⚠️ **0.1.0 → 1.0.0** (major)
  - If considering this production-ready

**Recommendation**: v0.2.0

### 3. SLH-DSA Support
- ✅ Add placeholder for SLH-DSA
- ⚠️ Only ML-DSA for now

**Recommendation**: Placeholder, implement SLH-DSA later

---

## 📚 Reference Documents

All created in `dytallix-fast-launch/pqc-wasm/`:

1. **QUICKSTART.md** - 5-minute publishing guide
2. **PUBLISHING.md** - Comprehensive publishing docs
3. **SDK_INTEGRATION_CHECKLIST.md** - This detailed checklist
4. **VISUAL_SUMMARY.txt** - ASCII overview
5. **SETUP_COMPLETE.md** - What was built

---

## ✅ Success Criteria

Integration is complete when:

- [ ] `@dytallix/pqc-wasm` published on npm
- [ ] `@dytallix/sdk` updated on GitHub
- [ ] All tests passing
- [ ] Documentation updated
- [ ] SDK v0.2.0 published on npm
- [ ] Users can install and use with one command

---

## 🎉 Final Command Summary

```bash
# 1. Publish PQC WASM
cd dytallix-fast-launch/pqc-wasm
./publish.sh

# 2. Update SDK
cd ../sdk
npm install @dytallix/pqc-wasm@latest
# ... modify files ...
npm run build && npm test

# 3. Push to GitHub
git push origin feat/integrate-pqc-wasm

# 4. Publish SDK
npm version minor
npm publish
```

**Estimated Total Time**: 1-2 hours

---

**Ready to start?** Follow Phase 1 to publish the PQC WASM package!
