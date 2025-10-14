# Files to Modify for @dytallix/pqc-wasm Integration

## 📋 Complete Modification Checklist

This document lists all files that need to be updated to integrate the published `@dytallix/pqc-wasm` package into the `@dytallix/sdk`.

---

## 🎯 Repository: github.com/DytallixHQ/Dytallix

**Branch**: `main`  
**SDK Location**: Root directory (appears to be a single SDK package)

---

## 📦 Files to Modify

### 1. **package.json** ⭐ CRITICAL
**Location**: `/package.json`

**Current State**:
```json
{
  "peerDependencies": {
    "@dytallix/pqc-wasm": "^0.1.0"
  },
  "peerDependenciesMeta": {
    "@dytallix/pqc-wasm": {
      "optional": true
    }
  }
}
```

**Changes Needed**:
```json
{
  "dependencies": {
    "@dytallix/pqc-wasm": "^0.1.0"
  }
}
```

**Why**: Move from `peerDependencies` (optional) to `dependencies` (required) so users get the crypto package automatically.

**Alternative**: Keep as peer dependency but update documentation to show users need to install both packages.

---

### 2. **src/wallet.ts** ⭐ CRITICAL
**Location**: `/src/wallet.ts`

**Current Issues**:
- Lines 5-6: Comment says "In production, this should import from @dytallix/pqc-wasm"
- Lines 37-47: Uses `window.PQCWallet` global (browser-only hack)
- Lines 54-64: Same issue with keystore import
- Lines 79-88: Same issue with signing

**Changes Needed**:
```typescript
// Add proper import at top of file
import init, * as pqc from '@dytallix/pqc-wasm';

// Add initialization flag
let wasmInitialized = false;

// Add init helper
async function ensureWasmInit() {
  if (!wasmInitialized) {
    await init();
    wasmInitialized = true;
  }
}

// Update generate method
static async generate(algorithm: PQCAlgorithm = 'ML-DSA'): Promise<PQCWallet> {
  await ensureWasmInit();
  
  // Use pqc.generate_keypair()
  const { publicKey, privateKey } = pqc.generate_keypair();
  const address = pqc.public_key_to_address(publicKey);
  
  return new PQCWallet({
    publicKey: Buffer.from(publicKey).toString('base64'),
    secretKey: Buffer.from(privateKey).toString('base64'),
    address,
    algorithm
  });
}

// Update signTransaction
async signTransaction(txObj: any): Promise<any> {
  await ensureWasmInit();
  
  const message = JSON.stringify(txObj); // Or proper serialization
  const privateKeyBytes = Buffer.from(this.secretKey, 'base64');
  const messageBytes = new TextEncoder().encode(message);
  
  const signature = pqc.sign(privateKeyBytes, messageBytes);
  
  return {
    ...txObj,
    signature: Buffer.from(signature).toString('base64'),
    publicKey: this.publicKey
  };
}
```

**Full Rewrite Required**: Yes - replace global window access with proper WASM imports.

---

### 3. **src/index.ts**
**Location**: `/src/index.ts`

**Changes Needed**:
```typescript
// Add export for WASM initialization
export { default as initPQC } from '@dytallix/pqc-wasm';

// Update exports
export { PQCWallet, type PQCAlgorithm, type KeyPair } from './wallet';
export { DytallixClient } from './client';
export * from './errors';
```

**Why**: Allow users to manually initialize WASM if needed.

---

### 4. **README.md** ⭐ IMPORTANT
**Location**: `/README.md`

**Sections to Update**:

#### Installation Section
```markdown
## Installation

npm install @dytallix/sdk

# The SDK automatically includes @dytallix/pqc-wasm for quantum-resistant cryptography
```

#### Add WASM Initialization Section
```markdown
## WASM Initialization

The SDK uses WebAssembly for Post-Quantum Cryptography. In most cases, initialization is automatic, but you can manually initialize if needed:

### Node.js
```typescript
import { initPQC } from '@dytallix/sdk';

// Initialize before creating wallets
await initPQC();

// Now create wallets
const wallet = await PQCWallet.generate('ML-DSA');
```

### Browser (via CDN)
```html
<script type="module">
  import { initPQC, PQCWallet } from 'https://unpkg.com/@dytallix/sdk';
  
  await initPQC();
  const wallet = await PQCWallet.generate('ML-DSA');
</script>
```

### Browser (bundled)
```typescript
import { initPQC, PQCWallet } from '@dytallix/sdk';

async function setup() {
  // WASM auto-initializes on first use
  const wallet = await PQCWallet.generate('ML-DSA');
}
```
```

#### Update Quick Start Examples
Add `await` to wallet generation:
```typescript
// OLD
const wallet = await PQCWallet.generate('ML-DSA');

// Keep as-is, but ensure it works!
```

---

### 5. **examples/** (All example files)
**Location**: `/examples/`

**Files to Update**:
- Any example showing wallet creation
- Any example showing transaction signing

**Changes**:
```typescript
// Add proper imports
import { PQCWallet, DytallixClient, initPQC } from '@dytallix/sdk';

// Initialize WASM (optional, but good practice in examples)
await initPQC();

// Rest of example...
```

---

### 6. **tsconfig.json** (Possibly)
**Location**: `/tsconfig.json`

**Check if needed**:
```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "resolveJsonModule": true,
    // Ensure WASM types are recognized
    "types": ["node", "vite/client"]
  }
}
```

---

### 7. **CONTRIBUTING.md**
**Location**: `/CONTRIBUTING.md`

**Add Section**:
```markdown
## Building with PQC WASM

The SDK depends on `@dytallix/pqc-wasm` for quantum-resistant cryptography. 

### Development Setup
```bash
# Install dependencies (includes @dytallix/pqc-wasm)
npm install

# Build SDK
npm run build

# Run tests
npm test
```

### Working with Local PQC WASM

If you're developing the PQC WASM package:

```bash
# In pqc-wasm directory
npm link

# In SDK directory
npm link @dytallix/pqc-wasm
npm run dev
```
```

---

### 8. **CHANGELOG.md**
**Location**: `/CHANGELOG.md`

**Add Entry**:
```markdown
## [0.2.0] - 2025-10-14

### Added
- Integrated `@dytallix/pqc-wasm` package for quantum-resistant cryptography
- Proper WebAssembly initialization handling
- Support for ML-DSA-65 (FIPS 204) signatures

### Changed
- **BREAKING**: Wallet generation now properly uses WASM crypto instead of mock implementation
- Removed browser-only `window.PQCWallet` hack
- Improved error messages for WASM-related issues

### Fixed
- PQC signatures now actually quantum-resistant (not placeholders)
- Proper key serialization and address generation
- WASM initialization race conditions

### Migration Guide
If upgrading from 0.1.x:
- Ensure you have Node.js 18+ (for WASM support)
- No code changes required for basic usage
- If manually managing WASM, import `initPQC` from SDK
```

---

## 🔧 Optional/Nice-to-Have Files

### 9. **tests/** (Create if missing)
**Location**: `/tests/` or `/src/__tests__/`

**Files to Create**:

#### `wallet.test.ts`
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { PQCWallet, initPQC } from '../src';

describe('PQCWallet', () => {
  beforeAll(async () => {
    await initPQC();
  });

  it('should generate ML-DSA wallet', async () => {
    const wallet = await PQCWallet.generate('ML-DSA');
    expect(wallet.address).toMatch(/^dyt1/);
    expect(wallet.algorithm).toBe('ML-DSA');
  });

  it('should sign transactions', async () => {
    const wallet = await PQCWallet.generate('ML-DSA');
    const tx = { from: wallet.address, to: 'dyt1...', amount: 10 };
    const signed = await wallet.signTransaction(tx);
    expect(signed.signature).toBeDefined();
  });

  it('should export and import keystore', async () => {
    const wallet = await PQCWallet.generate('ML-DSA');
    const keystore = await wallet.exportKeystore('password123');
    const imported = await PQCWallet.fromKeystore(keystore, 'password123');
    expect(imported.address).toBe(wallet.address);
  });
});
```

---

### 10. **.npmignore** (Create if missing)
**Location**: `/.npmignore`

```
# Development files
src/
tests/
examples/
*.test.ts
*.spec.ts

# Config files
tsconfig.json
vitest.config.ts
.eslintrc.js

# CI/CD
.github/
.vscode/

# Docs
docs/
*.md
!README.md
!CHANGELOG.md
!LICENSE
```

---

### 11. **package-lock.json**
**Action**: Delete and regenerate
```bash
rm package-lock.json
npm install
```

This ensures `@dytallix/pqc-wasm` is properly locked.

---

## 🚀 Local Workspace Files to Modify

### In Your Local `/Users/rickglenn/dytallix/dytallix-fast-launch/sdk/`

These files mirror the GitHub repo structure:

#### 1. **package.json**
Update dependencies as described above.

#### 2. **src/wallet.ts**
Rewrite to use published `@dytallix/pqc-wasm`.

#### 3. **src/index.ts**
Export `initPQC` helper.

#### 4. **README.md**
Update installation and usage instructions.

#### 5. **CHANGELOG.md**
Document the integration.

---

## 📝 Summary: Critical vs Optional Changes

### 🔴 MUST CHANGE (Critical)
1. ✅ `package.json` - Add dependency
2. ✅ `src/wallet.ts` - Replace window hacks with real imports
3. ✅ `README.md` - Update installation instructions

### 🟡 SHOULD CHANGE (Important)
4. ✅ `src/index.ts` - Export init function
5. ✅ `CHANGELOG.md` - Document changes
6. ✅ `examples/` - Update all examples

### 🟢 NICE TO HAVE (Optional)
7. ✅ `CONTRIBUTING.md` - Development workflow
8. ✅ `tests/` - Add proper tests
9. ✅ `.npmignore` - Clean publish
10. ✅ `tsconfig.json` - WASM support

---

## 🔄 Migration Workflow

### Step 1: Publish PQC WASM
```bash
cd dytallix-fast-launch/pqc-wasm
./build.sh
./publish.sh
```

### Step 2: Update Local SDK
```bash
cd ../sdk
npm install @dytallix/pqc-wasm@latest
```

### Step 3: Modify SDK Files
Follow checklist above, starting with critical files.

### Step 4: Test Locally
```bash
npm run build
npm test
```

### Step 5: Push to GitHub
```bash
git add .
git commit -m "feat: integrate @dytallix/pqc-wasm package"
git push origin main
```

### Step 6: Publish Updated SDK
```bash
npm version minor  # 0.1.0 → 0.2.0 (breaking/feature change)
npm publish
```

---

## 🎯 Testing Checklist

After modifications, verify:

- [ ] SDK installs without errors: `npm install @dytallix/sdk`
- [ ] Can import wallet: `import { PQCWallet } from '@dytallix/sdk'`
- [ ] WASM initializes: No errors on first wallet generation
- [ ] Wallet generation works: `await PQCWallet.generate('ML-DSA')`
- [ ] Signatures are valid: Verify with blockchain node
- [ ] Works in Node.js: `node example.js`
- [ ] Works in browser: Bundle and test in HTML
- [ ] TypeScript types work: No TS errors in IDE
- [ ] Examples run: All example files execute
- [ ] Tests pass: `npm test`

---

## 📞 Questions to Answer

Before modifying:

1. **Dependency Strategy**: 
   - ❓ Make `@dytallix/pqc-wasm` a regular dependency?
   - ❓ Or keep as peer dependency (users install manually)?

2. **Breaking Change**:
   - ❓ Is this SDK version 0.1.0 already published and used?
   - ❓ If yes, this is breaking → version 0.2.0
   - ❓ If no, can stay 0.1.0

3. **Initialization**:
   - ❓ Auto-initialize WASM on first use?
   - ❓ Or require manual `await initPQC()`?

4. **SLH-DSA Support**:
   - ❓ Does `@dytallix/pqc-wasm` support SLH-DSA yet?
   - ❓ Or only ML-DSA for now?

---

## 📚 Related Files

Also check these related files in the repo:

- `/.github/workflows/*.yml` - CI/CD may need Node 18+
- `/docs/**/*.md` - Update any developer documentation
- `/.vscode/settings.json` - Update editor settings
- `/jest.config.js` or `/vitest.config.ts` - Test configuration

---

## ✅ Ready to Proceed?

1. Review this checklist
2. Answer the questions above
3. Publish `@dytallix/pqc-wasm` first
4. Then start modifying SDK files in order of priority
5. Test thoroughly before publishing

---

**Next Step**: Shall I create the modified versions of these files for you?
