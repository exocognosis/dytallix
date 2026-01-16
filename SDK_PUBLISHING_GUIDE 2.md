# 📦 Dytallix SDK Publishing Guide

## Overview
This guide will walk you through publishing the `@dytallix/sdk` package to NPM for the first time.

---

## Prerequisites

### 1. Create an NPM Account
- Visit: https://www.npmjs.com/signup
- Choose a username (you'll need this!)
- Verify your email address

### 2. Configure Two-Factor Authentication (Recommended)
- Go to https://www.npmjs.com/settings/[your-username]/profile
- Enable 2FA for better security
- Choose "Authorization and Publishing" mode

---

## Publishing Steps

### Step 1: Login to NPM

```bash
cd /Users/rickglenn/dytallix/dytallix-fast-launch/sdk
npm login
```

You'll be prompted for:
- Username
- Password
- Email
- 2FA code (if enabled)

### Step 2: Configure Package Scope (IMPORTANT!)

The package name is `@dytallix/sdk` which uses a "scoped" package name. You have two options:

**Option A: Use a Different Scope (Recommended for now)**
Change the package name to use your personal username:

```bash
# In package.json, change:
"name": "@dytallix/sdk"
# To:
"name": "@YOUR-NPM-USERNAME/dytallix-sdk"
```

**Option B: Create @dytallix Organization**
- Go to https://www.npmjs.com/org/create
- Create organization named "dytallix" (requires team features or you'll need to pay)
- Add team members if needed

### Step 3: Build the SDK

```bash
cd /Users/rickglenn/dytallix/dytallix-fast-launch/sdk
npm install
npm run build
```

This will:
- Install all dependencies
- Compile TypeScript to JavaScript
- Generate type definitions
- Create `dist/` folder with the bundle

### Step 4: Test the Build Locally

Before publishing, verify everything works:

```bash
# Check what will be published
npm pack --dry-run

# This shows you exactly which files will be included
```

### Step 5: Verify package.json

Make sure these fields are correct:
- ✅ `name`: Package name (with or without scope)
- ✅ `version`: Start with `0.1.0` or `1.0.0`
- ✅ `description`: Clear description
- ✅ `main`, `module`, `types`: Entry points
- ✅ `files`: Should include `["dist"]`
- ✅ `repository`: GitHub URL
- ✅ `license`: Apache-2.0
- ✅ `keywords`: For searchability

### Step 6: Publish to NPM!

```bash
# For first time publishing a scoped package as PUBLIC
npm publish --access public

# Or if using regular package name
npm publish
```

**Note**: Scoped packages (@scope/name) are private by default on NPM. You MUST use `--access public` to make it publicly available for free.

### Step 7: Verify Publication

After publishing:
1. Visit: https://www.npmjs.com/package/@dytallix/sdk (or your package name)
2. Check that documentation appears correctly
3. Test installation: `npm install @dytallix/sdk`

---

## Version Updates (Future Releases)

When you make changes and want to release a new version:

### Update Version Number

```bash
# For bug fixes (0.1.0 -> 0.1.1)
npm version patch

# For new features (0.1.0 -> 0.2.0)
npm version minor

# For breaking changes (0.1.0 -> 1.0.0)
npm version major
```

This automatically:
- Updates `package.json`
- Creates a git commit
- Creates a git tag

### Publish the Update

```bash
npm run build
npm publish --access public
```

---

## Best Practices

### 1. Use Semantic Versioning
- **Major** (1.0.0 → 2.0.0): Breaking changes
- **Minor** (1.0.0 → 1.1.0): New features, backward compatible
- **Patch** (1.0.0 → 1.0.1): Bug fixes

### 2. Maintain a CHANGELOG.md
Document changes in each release:

```markdown
# Changelog

## [0.1.0] - 2025-10-11
### Added
- Initial release
- PQC wallet support (ML-DSA, SLH-DSA)
- Transaction signing and broadcasting
- Account queries
```

### 3. Add .npmignore (if needed)
Exclude files from NPM package:

```
src/
examples/
*.test.ts
*.spec.ts
.git/
node_modules/
```

Note: Your `package.json` already has `"files": ["dist"]` which is better!

### 4. Test Before Publishing
```bash
# Install locally in another project to test
cd ../test-project
npm install ../dytallix-fast-launch/sdk
```

---

## Troubleshooting

### Error: "You do not have permission to publish"
- Make sure you're logged in: `npm whoami`
- Check if organization exists or use your username scope
- Use `--access public` for scoped packages

### Error: "Package name taken"
- Choose a different name
- Add a scope: `@yourname/package-name`

### Error: "No README data"
- Ensure README.md is in the root of your SDK folder
- NPM uses it for package documentation

### Build Fails
```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

---

## After Publishing

### 1. Update Your Documentation
Add installation instructions to your main repo README:

```markdown
## Installation
npm install @dytallix/sdk
```

### 2. Create a GitHub Release
- Tag the version in git: `git tag v0.1.0`
- Push tags: `git push --tags`
- Create release on GitHub with changelog

### 3. Announce It!
- Tweet about it
- Post in Discord/community channels
- Update your website

---

## Quick Reference Commands

```bash
# Login to NPM
npm login

# Build SDK
npm run build

# Check what will be published
npm pack --dry-run

# Publish (first time)
npm publish --access public

# Update version
npm version patch|minor|major

# Publish update
npm publish --access public
```

---

## Support

If you run into issues:
- NPM Documentation: https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry
- Check package status: https://www.npmjs.com/package/@dytallix/sdk
- NPM Support: https://www.npmjs.com/support

---

**Ready to publish?** Start with Step 1! 🚀
