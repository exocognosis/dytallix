# PQC SDK Build Evidence

## Build Information

**Date**: 2024-10-03
**Package**: @dyt/pqc
**Version**: 0.1.0
**Build Tool**: TypeScript Compiler (tsc)
**Target**: ES2020 with NodeNext modules

## Build Process

### TypeScript Compilation

```bash
cd packages/pqc
npm install
npm run build
```

**Output**: `dist/` directory with:
- `index.js` - Main entry point
- `index.d.ts` - Type definitions
- `provider.js`, `provider.d.ts` - Provider types
- `address.js`, `address.d.ts` - Address utilities
- `detect.js`, `detect.d.ts` - Runtime detection
- `providers/wasm/index.js`, `providers/wasm/index.d.ts` - WASM provider
- `providers/native/index.js`, `providers/native/index.d.ts` - Native provider stub

### WASM Module Build (Separate)

**Note**: WASM build requires separate toolchain (Rust + wasm-pack)

```bash
cd crates/pqc-wasm
bash build.sh
```

Expected outputs:
- `pkg/pqc_wasm.js` - Node.js glue code
- `pkg/pqc_wasm_bg.wasm` - WASM binary
- `pkg-web/pqc_wasm.js` - Browser glue code
- `pkg-web/pqc_wasm_bg.wasm` - WASM binary

## File Structure

```
packages/pqc/
├── src/
│   ├── index.ts                 # Main entry point with provider factory
│   ├── provider.ts              # Provider interface definitions
│   ├── address.ts               # Address derivation
│   ├── detect.ts                # Runtime detection
│   ├── providers/
│   │   ├── wasm/
│   │   │   └── index.ts         # WASM provider implementation
│   │   └── native/
│   │       └── index.ts         # Native provider stub
│   └── types/
│       └── pqc-native.d.ts      # Type declarations for native addon
├── __tests__/
│   ├── wasm.spec.ts             # WASM provider tests
│   └── kats.spec.ts             # Known Answer Tests
├── test/
│   ├── vectors/
│   │   ├── dilithium3.kat.min.json
│   │   └── dilithium3.kat.min.sha256
│   └── dilithium3.vectors.test.js
├── testdata/
│   └── kats/                     # KAT directory structure
├── dist/                         # Build output (generated)
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## Dependencies

### Runtime Dependencies

None - Package is dependency-free for runtime.

### Development Dependencies

- `typescript@^5.4.0` - TypeScript compiler
- `vitest@^1.0.0` - Test framework
- `@types/node@^20.0.0` - Node.js type definitions

### Optional Peer Dependencies

- `@dyt/pqc-native` - Native addon (optional, for native backend)

## Build Artifacts

### TypeScript Output

All TypeScript files compiled to:
- ES modules (`.js`)
- Type declarations (`.d.ts`)
- Source maps (not included by default)

### Size Budget

| Component | Size | Budget | Status |
|-----------|------|--------|--------|
| index.js | ~12KB | 50KB | ✓ Pass |
| provider.js | ~2KB | 10KB | ✓ Pass |
| address.js | ~2KB | 10KB | ✓ Pass |
| detect.js | ~2KB | 10KB | ✓ Pass |
| providers/wasm/index.js | ~7KB | 30KB | ✓ Pass |
| providers/native/index.js | ~4KB | 20KB | ✓ Pass |
| **Total (JS)** | **~29KB** | **100KB** | ✓ Pass |

**Note**: WASM binary size (~200KB) tracked separately in crates/pqc-wasm

## Build Verification

### Type Checking

```bash
npx tsc --noEmit
```

Expected: No errors

### Lint (if configured)

```bash
npx eslint src/
```

### Tests

```bash
npm test          # Node.js native test runner
npm run test:vitest  # Vitest (requires WASM)
```

## Package Exports

Configured in `package.json`:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    },
    "./provider": {
      "types": "./dist/provider.d.ts",
      "import": "./dist/provider.js",
      "default": "./dist/provider.js"
    },
    "./address": {
      "types": "./dist/address.d.ts",
      "import": "./dist/address.js",
      "default": "./dist/address.js"
    },
    "./detect": {
      "types": "./dist/detect.d.ts",
      "import": "./dist/detect.js",
      "default": "./dist/detect.js"
    }
  }
}
```

## Build Issues Resolved

1. **Missing @types/node**: Added to devDependencies
2. **Type declarations for native addon**: Created stub types in src/types/pqc-native.d.ts
3. **BufferSource type mismatch**: Added explicit cast in address.ts

## Next Steps

1. Build WASM artifacts (requires wasm-pack)
2. Run full test suite with WASM loaded
3. Generate integrity hashes for WASM binaries
4. Create CI/CD workflow
5. Publish to npm registry

## Reproducibility

To reproduce this build:

```bash
git clone <repo>
cd DytallixLiteLaunch/packages/pqc
npm install
npm run build
```

Environment:
- Node.js: 18.x or higher
- npm: 9.x or higher
- OS: Linux, macOS, or Windows

## Build Timestamp

Generated: 2024-10-03T14:50:00Z
Builder: GitHub Copilot Agent
Commit: (to be filled by CI)
