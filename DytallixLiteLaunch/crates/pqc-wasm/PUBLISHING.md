# Publishing @dytallix/pqc-wasm

This guide explains how to publish the `@dytallix/pqc-wasm` package to npm registries.

## Prerequisites

### For NPM Registry (npmjs.org)

1. Create an account at [npmjs.com](https://www.npmjs.com/signup)
2. Enable 2FA for your account (required for publishing)
3. Generate an access token:
   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Click "Generate New Token" → "Classic Token"
   - Select "Automation" type
   - Copy the token (starts with `npm_`)
4. Add token to GitHub secrets:
   - Go to your repo → Settings → Secrets → Actions
   - Create new secret: `NPM_TOKEN` = your token

### For GitHub Packages

No setup needed! GitHub Packages uses the built-in `GITHUB_TOKEN` automatically.

## Publishing Methods

### Method 1: GitHub Actions (Recommended)

1. Go to your repository on GitHub
2. Click "Actions" tab
3. Select "Publish @dytallix/pqc-wasm" workflow
4. Click "Run workflow"
5. Choose options:
   - **Version bump**: patch (0.1.0 → 0.1.1), minor (0.1.0 → 0.2.0), or major (0.1.0 → 1.0.0)
   - **Registry**: npm, github, or both

The workflow will:
- Build the WASM package from Rust source
- Bump the version
- Publish to selected registry/registries
- Create a GitHub release
- Commit version changes back to main

### Method 2: Manual Publishing

#### Build the Package

```bash
cd DytallixLiteLaunch/crates/pqc-wasm
wasm-pack build --target web --out-dir pkg
cd pkg
```

#### Publish to NPM

```bash
# Login to npm (first time only)
npm login

# Bump version (choose one)
npm version patch  # 0.1.0 → 0.1.1
npm version minor  # 0.1.0 → 0.2.0
npm version major  # 0.1.0 → 1.0.0

# Publish
npm publish --access public
```

#### Publish to GitHub Packages

```bash
# Create .npmrc in the pkg directory
echo "@dytallix:registry=https://npm.pkg.github.com" > .npmrc

# Login (use GitHub Personal Access Token with `write:packages` scope)
npm login --registry=https://npm.pkg.github.com

# Publish
npm publish
```

## Using the Published Package

### From NPM Registry

```bash
npm install @dytallix/pqc-wasm
```

```typescript
import init, * as pqc from '@dytallix/pqc-wasm';

await init();
const keys = pqc.generate_keypair();
```

### From GitHub Packages

Create `.npmrc` in your project root:

```
@dytallix:registry=https://npm.pkg.github.com
```

Then install:

```bash
npm install @dytallix/pqc-wasm
```

## Updating the SDK Dependency

After publishing, update the `@dytallix/sdk` to use the published package:

### Option A: Use Published Package (Recommended)

```bash
cd sdk
npm install @dytallix/pqc-wasm@latest
```

### Option B: Keep Local Development Setup

Keep using the local build during development, switch to published package for production:

```json
// package.json
{
  "dependencies": {
    "@dytallix/pqc-wasm": "workspace:*"  // Development
  }
}
```

Or use npm/yarn workspaces to manage both packages together.

## Version Strategy

Follow [Semantic Versioning](https://semver.org/):

- **PATCH** (0.1.0 → 0.1.1): Bug fixes, performance improvements
- **MINOR** (0.1.0 → 0.2.0): New features, backward compatible
- **MAJOR** (0.1.0 → 1.0.0): Breaking changes

### Examples

- Fixed a bug in signature verification → PATCH
- Added new key derivation function → MINOR
- Changed public API or key format → MAJOR

## Continuous Publishing

For automated publishing on every commit/tag, create additional workflows:

### On Version Tag

```yaml
on:
  push:
    tags:
      - 'pqc-wasm-v*'
```

### On Main Branch (Canary Releases)

```yaml
on:
  push:
    branches:
      - main
    paths:
      - 'DytallixLiteLaunch/crates/pqc-wasm/**'
```

## Troubleshooting

### "402 Payment Required" Error

You need to enable 2FA on your npm account. Follow https://docs.npmjs.com/configuring-two-factor-authentication

### "403 Forbidden" Error

- NPM: Check your `NPM_TOKEN` secret is valid
- GitHub: Ensure workflow has `packages: write` permission

### "404 Not Found" When Installing

- For npm: Package hasn't been published yet, or name is taken
- For GitHub Packages: Need `.npmrc` config pointing to GitHub registry

### Build Fails

Ensure you have:
- Rust 1.70+ installed
- `wasm32-unknown-unknown` target: `rustup target add wasm32-unknown-unknown`
- wasm-pack installed: `cargo install wasm-pack`

## Best Practices

1. **Test Before Publishing**: Always test the built package locally first
2. **Changelog**: Update CHANGELOG.md before each release
3. **Git Tags**: Tag releases in git: `git tag pqc-wasm-v0.1.1`
4. **Security**: Never commit npm tokens or GitHub PATs
5. **Provenance**: GitHub Actions automatically adds provenance metadata

## Resources

- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [GitHub Packages Docs](https://docs.github.com/packages)
- [wasm-pack Documentation](https://rustwasm.github.io/docs/wasm-pack/)
- [Semantic Versioning](https://semver.org/)
