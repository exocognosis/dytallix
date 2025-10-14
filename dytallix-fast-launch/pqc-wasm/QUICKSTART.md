# Quick Start: Publishing @dytallix/pqc-wasm

## 🚀 Fastest Path to Publishing (5 minutes)

### Step 1: Build the Package

```bash
cd dytallix-fast-launch/pqc-wasm
./build.sh
```

This will:
- Compile Rust to WASM
- Generate JavaScript bindings
- Create TypeScript definitions
- Output to `pkg/` directory

### Step 2: Test Locally (Optional but Recommended)

```bash
cd pkg
npm link

# In another terminal, test with your SDK
cd ../../sdk
npm link @dytallix/pqc-wasm
npm run test
```

### Step 3: Publish to npm

#### Option A: Interactive Script (Easiest)

```bash
cd dytallix-fast-launch/pqc-wasm
./publish.sh
```

This will guide you through:
1. Building the package
2. Choosing version bump (patch/minor/major)
3. Confirming publication
4. Publishing to npm

#### Option B: Manual

```bash
cd dytallix-fast-launch/pqc-wasm/pkg

# Login to npm (first time only)
npm login

# Bump version
npm version patch  # or minor, or major

# Publish
npm publish --access public
```

### Step 4: Use in Your SDK

```bash
cd dytallix-fast-launch/sdk
npm install @dytallix/pqc-wasm@latest
```

Update your SDK code:

```typescript
// Import the published package
import init, * as pqc from '@dytallix/pqc-wasm';

// Initialize WASM
await init();

// Use it!
const { publicKey, privateKey } = pqc.generate_keypair();
```

---

## 📋 Prerequisites Checklist

### Required Tools

- [ ] **Rust** (1.70+)
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  rustup target add wasm32-unknown-unknown
  ```

- [ ] **wasm-pack**
  ```bash
  cargo install wasm-pack
  ```

- [ ] **Node.js** (18+)
  ```bash
  node --version  # Should be 18+
  ```

- [ ] **npm Account**
  - Sign up at [npmjs.com](https://www.npmjs.com/signup)
  - Enable 2FA
  - Login: `npm login`

---

## 🔄 Common Workflows

### First-Time Setup

```bash
# 1. Install dependencies
rustup target add wasm32-unknown-unknown
cargo install wasm-pack

# 2. Build
cd dytallix-fast-launch/pqc-wasm
./build.sh

# 3. Login to npm
npm login

# 4. Publish
./publish.sh
```

### Updating After Changes

```bash
# 1. Make your Rust code changes in src/lib.rs

# 2. Rebuild and publish
cd dytallix-fast-launch/pqc-wasm
./build.sh && ./publish.sh
```

### Testing Before Publishing

```bash
# Build
cd dytallix-fast-launch/pqc-wasm
./build.sh

# Link locally
cd pkg
npm link

# Test in SDK
cd ../../sdk
npm link @dytallix/pqc-wasm
npm run test

# If tests pass, publish
cd ../pqc-wasm
./publish.sh
```

---

## 🤖 GitHub Actions Publishing (Advanced)

### Setup (One-Time)

1. **Create npm Token**
   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Create new "Automation" token
   - Copy the token

2. **Add to GitHub Secrets**
   - Go to your repo → Settings → Secrets → Actions
   - New secret: `NPM_TOKEN` = (paste your token)

3. **Commit the workflow**
   ```bash
   git add dytallix-fast-launch/.github/workflows/publish-pqc-wasm.yml
   git commit -m "Add pqc-wasm publishing workflow"
   git push
   ```

### Publishing via GitHub Actions

1. Go to your repo on GitHub
2. Click "Actions" tab
3. Select "Publish @dytallix/pqc-wasm"
4. Click "Run workflow"
5. Choose:
   - Version bump (patch/minor/major)
   - Registry (npm/github/both)
6. Click "Run workflow"

The automation will:
- ✅ Build WASM from Rust
- ✅ Bump version
- ✅ Publish to npm
- ✅ Create GitHub release
- ✅ Commit version changes

---

## 📦 What Gets Published

The npm package includes:

```
@dytallix/pqc-wasm/
├── pqc_wasm.js          # JavaScript bindings
├── pqc_wasm.d.ts        # TypeScript definitions
├── pqc_wasm_bg.wasm     # Compiled WebAssembly
├── package.json          # Package metadata
├── README.md            # Documentation
└── LICENSE              # Apache-2.0
```

**Total size**: ~200KB (gzipped)

---

## 🐛 Troubleshooting

### Build Fails

**Error**: `cargo: command not found`
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

**Error**: `wasm-pack: command not found`
```bash
cargo install wasm-pack
```

**Error**: `error: can't find crate for 'core'`
```bash
rustup target add wasm32-unknown-unknown
```

### Publish Fails

**Error**: `403 Forbidden`
- Check you're logged in: `npm whoami`
- Enable 2FA on npm account
- Generate new token if using CI

**Error**: `402 Payment Required`
- Enable 2FA on your npm account
- Use an automation token (not a read-only token)

**Error**: `404 Not Found` (when installing)
- Package hasn't been published yet
- Name might be taken (check npmjs.com)

### Runtime Errors

**Error**: `WebAssembly module is not initialized`
```typescript
// Always call init() first!
import init, * as pqc from '@dytallix/pqc-wasm';
await init();  // ← Don't forget this!
```

**Error**: `Import not found`
```bash
# Make sure package is installed
npm install @dytallix/pqc-wasm@latest
```

---

## 📚 Additional Resources

### Documentation
- [Full Publishing Guide](./PUBLISHING.md)
- [Package README](./README.md)
- [Changelog](./CHANGELOG.md)

### External Links
- [wasm-pack Documentation](https://rustwasm.github.io/docs/wasm-pack/)
- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [FIPS 204 Standard](https://csrc.nist.gov/pubs/fips/204/final)

### Get Help
- GitHub Issues: https://github.com/HisMadRealm/dytallix/issues
- Discord: https://discord.gg/dytallix

---

## ✅ Success Checklist

After publishing, verify:

- [ ] Package visible on npmjs.com: https://www.npmjs.com/package/@dytallix/pqc-wasm
- [ ] Can install: `npm install @dytallix/pqc-wasm`
- [ ] Can import: `import * as pqc from '@dytallix/pqc-wasm'`
- [ ] WASM initializes: `await init()`
- [ ] Functions work: `pqc.generate_keypair()`
- [ ] TypeScript types present
- [ ] README displays correctly on npm

---

## 🎯 Next Steps

1. **Update SDK**: Install the published package in your SDK
2. **Update Docs**: Update SDK README with usage examples
3. **Tag Release**: Create a git tag for this version
4. **Announce**: Share on Discord/Twitter/Blog

---

## 💡 Tips

- **Always test locally** before publishing
- **Use semantic versioning** (patch for fixes, minor for features, major for breaking changes)
- **Update CHANGELOG.md** before each release
- **Git tag** each release: `git tag pqc-wasm-v0.1.0`
- **Keep README updated** with accurate examples
- **Monitor npm downloads** to track adoption

---

Need help? Open an issue or ask in Discord!
