# SDK Publishing Checklist ✅

Use this checklist before publishing:

## Pre-Publishing Checks

- [ ] **NPM Account Created** - https://www.npmjs.com/signup
- [ ] **Logged into NPM** - Run `npm whoami` to verify
- [ ] **Package name decided** - Using `@dytallix/sdk` or `@yourname/dytallix-sdk`?
- [ ] **Organization created** (if using @dytallix scope) - https://www.npmjs.com/org/create

## Code Quality Checks

- [ ] **README.md is complete** - Installation, usage examples, API docs
- [ ] **package.json is correct** - Name, version, description, repository, license
- [ ] **All dependencies installed** - Run `npm install`
- [ ] **TypeScript compiles** - Run `npm run build` successfully
- [ ] **Tests pass** (if any) - Run `npm test`
- [ ] **Linting passes** (if configured) - Run `npm run lint`

## Build Verification

- [ ] **Build creates dist/ folder** - Check that `dist/` exists with compiled code
- [ ] **Type definitions generated** - Check for `.d.ts` files
- [ ] **Dry run successful** - Run `npm pack --dry-run`
- [ ] **Package size reasonable** - Check output of dry-run (should be < 1MB typically)

## Documentation

- [ ] **README has installation instructions** - `npm install @dytallix/sdk`
- [ ] **Usage examples work** - Copy/paste and test examples
- [ ] **API documentation present** - All main functions documented
- [ ] **License file exists** - LICENSE or LICENSE.md

## First Publish

- [ ] **Version is 0.1.0 or 1.0.0** - Check `package.json`
- [ ] **Git is clean** - Commit all changes first
- [ ] **Run build** - `npm run build`
- [ ] **Publish with access flag** - `npm publish --access public`

## Post-Publishing

- [ ] **Verify on npmjs.com** - Visit https://www.npmjs.com/package/@dytallix/sdk
- [ ] **Test installation** - Try `npm install @dytallix/sdk` in a test project
- [ ] **Create git tag** - `git tag v0.1.0 && git push --tags`
- [ ] **Create GitHub release** - Add changelog and release notes
- [ ] **Update main README** - Add SDK installation instructions
- [ ] **Announce release** - Social media, Discord, etc.

---

## Quick Commands

```bash
# 1. Build
npm run build

# 2. Dry run (see what will be published)
npm pack --dry-run

# 3. Publish
npm publish --access public

# 4. Tag release
git tag v0.1.0
git push --tags
```

---

## For Future Updates

When releasing a new version:

```bash
# 1. Make your changes and test
npm run build
npm test

# 2. Update version (choose one)
npm version patch    # 0.1.0 -> 0.1.1 (bug fixes)
npm version minor    # 0.1.0 -> 0.2.0 (new features)
npm version major    # 0.1.0 -> 1.0.0 (breaking changes)

# 3. Build and publish
npm run build
npm publish --access public

# 4. Push with tags
git push --follow-tags
```
