# Publishing Checklist for @dytallix/pqc-wasm and @dytallix/sdk

## Status: Ready to Publish ✅

### Phase 1: Publish @dytallix/pqc-wasm to npm

**Package Location:** `/Users/rickglenn/dytallix/dytallix-fast-launch/pqc-wasm/pkg/`

#### Steps:

1. **Login to npm** (if not already logged in):
   ```bash
   npm login
   ```

2. **Publish the package**:
   ```bash
   cd /Users/rickglenn/dytallix/dytallix-fast-launch/pqc-wasm/pkg
   npm publish --access public
   ```

3. **Verify publication**:
   - Check: https://www.npmjs.com/package/@dytallix/pqc-wasm
   - Test install: `npm install @dytallix/pqc-wasm`

### Phase 2: Update SDK to use published package

**Location:** `/Users/rickglenn/dytallix/dytallix-fast-launch/sdk/`

#### Steps:

1. **Update package.json dependency**:
   ```bash
   cd /Users/rickglenn/dytallix/dytallix-fast-launch/sdk
   ```
   
   Change in `package.json`:
   ```json
   "@dytallix/pqc-wasm": "^0.1.0"
   ```
   (currently: `"file:../pqc-wasm/pkg"`)

2. **Install from npm**:
   ```bash
   npm install
   ```

3. **Build SDK**:
   ```bash
   npm run build
   ```

4. **Test SDK**:
   ```bash
   npm test
   ```

5. **Publish SDK**:
   ```bash
   npm publish --access public
   ```

6. **Verify publication**:
   - Check: https://www.npmjs.com/package/@dytallix/sdk
   - Test install: `npm install @dytallix/sdk`

### Phase 3: Push to GitHub Repository

**Repository:** https://github.com/DytallixHQ/Dytallix (or HisMadRealm/dytallix)

#### Files to commit:

```bash
cd /Users/rickglenn/dytallix/dytallix-fast-launch

git add pqc-wasm/
git add sdk/
git add Cargo.toml
git add .github/workflows/publish-pqc-wasm.yml

git commit -m "feat: Add @dytallix/pqc-wasm package and integrate with SDK

- Create standalone WASM package for ML-DSA-65 cryptography
- Update SDK to use @dytallix/pqc-wasm dependency
- Add GitHub Actions workflow for automated publishing
- Update SDK wallet implementation with proper WASM integration"

git push origin main
```

#### Create GitHub Release:

1. Go to: https://github.com/DytallixHQ/Dytallix/releases/new
2. Tag: `pqc-wasm-v0.1.0`
3. Title: `@dytallix/pqc-wasm v0.1.0`
4. Description:
   ```markdown
   ## @dytallix/pqc-wasm v0.1.0
   
   Initial release of the Dytallix Post-Quantum Cryptography WASM package.
   
   ### Features
   - ML-DSA-65 (FIPS 204) quantum-resistant signatures
   - WebAssembly for browser and Node.js
   - Bech32 address encoding (dyt prefix)
   - TypeScript definitions included
   
   ### Installation
   \`\`\`bash
   npm install @dytallix/pqc-wasm
   \`\`\`
   
   ### Usage
   \`\`\`typescript
   import init, * as pqc from '@dytallix/pqc-wasm';
   
   await init();
   const { publicKey, privateKey } = pqc.generate_keypair();
   \`\`\`
   
   See [README](https://github.com/DytallixHQ/Dytallix/tree/main/dytallix-fast-launch/pqc-wasm) for full documentation.
   ```

## Quick Commands

### Publish Everything:

```bash
# 1. Publish pqc-wasm
cd /Users/rickglenn/dytallix/dytallix-fast-launch/pqc-wasm/pkg
npm publish --access public

# 2. Update SDK dependency
cd /Users/rickglenn/dytallix/dytallix-fast-launch/sdk
# Edit package.json: "@dytallix/pqc-wasm": "^0.1.0"
npm install
npm run build
npm publish --access public

# 3. Push to GitHub
cd /Users/rickglenn/dytallix/dytallix-fast-launch
git add .
git commit -m "feat: Add pqc-wasm package and update SDK"
git push origin main
```

## Verification Checklist

### @dytallix/pqc-wasm
- [ ] Published to npm (v0.1.0)
- [ ] Visible on https://www.npmjs.com/package/@dytallix/pqc-wasm
- [ ] Can install: `npm install @dytallix/pqc-wasm`
- [ ] TypeScript types work
- [ ] WASM loads correctly
- [ ] Functions execute (generate_keypair, sign, verify, etc.)

### @dytallix/sdk
- [ ] Updated to reference published @dytallix/pqc-wasm
- [ ] Builds successfully
- [ ] Tests pass
- [ ] Published to npm (v0.1.1 or v0.2.0)
- [ ] Visible on https://www.npmjs.com/package/@dytallix/sdk
- [ ] Can install: `npm install @dytallix/sdk`
- [ ] PQCWallet works with real cryptography

### GitHub
- [ ] Code pushed to repository
- [ ] Release created for pqc-wasm v0.1.0
- [ ] README updated
- [ ] Documentation accurate

## Files Modified

### Created:
- `pqc-wasm/` (entire directory)
  - `src/lib.rs`
  - `Cargo.toml`
  - `package.json`
  - `README.md`
  - `CHANGELOG.md`
  - `PUBLISHING.md`
  - `QUICKSTART.md`
  - `build.sh`
  - `publish.sh`
  - `.gitignore`
  - `.npmignore`
  - `LICENSE`

- `.github/workflows/publish-pqc-wasm.yml`

### Modified:
- `sdk/package.json` (added @dytallix/pqc-wasm dependency)
- `sdk/src/wallet.ts` (integrated with pqc-wasm)
- `sdk/src/index.ts` (exported initPQC function)
- `sdk/README.md` (added initialization instructions)
- `Cargo.toml` (added pqc-wasm to workspace)

## Post-Publication Tasks

1. **Update documentation website** (if exists)
2. **Announce on Discord/Twitter**
3. **Update example projects** to use new packages
4. **Monitor for issues** on GitHub
5. **Consider adding to awesome-pqc** list

## Notes

- Current package.json uses `"file:../pqc-wasm/pkg"` for local development
- Change to `"^0.1.0"` before publishing SDK
- SDK version should bump to 0.1.1 (patch) or 0.2.0 (minor feature)
- Consider adding CI/CD tests before auto-publishing
