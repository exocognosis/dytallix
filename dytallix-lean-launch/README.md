# Dytallix Lean Launch Frontend

A React-based frontend application for the Dytallix post-quantum blockchain lean launch. This developer-focused website showcases the platform's capabilities, provides access to testnet resources, and demonstrates AI-enhanced security features.

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/HisMadRealm/dytallix.git
cd dytallix/dytallix-lean-launch
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

## 📦 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint to check code quality

## 🏗️ Project Structure

```
dytallix-lean-launch/
├── public/
│   ├── index.html          # Main HTML template
│   └── favicon.ico         # Site favicon
├── src/
│   ├── pages/              # Main application pages
│   │   ├── Home.jsx        # Landing page
│   │   ├── Faucet.jsx      # Testnet faucet
│   │   ├── TechStack.jsx   # Technical stack overview
│   │   ├── Modules.jsx     # AI module demos
│   │   ├── Roadmap.jsx     # Development roadmap
│   │   └── DevResources.jsx # Developer resources
│   ├── components/         # Reusable UI components
│   │   ├── Navbar.jsx      # Navigation bar
│   │   ├── Footer.jsx      # Page footer
│   │   ├── FaucetForm.jsx  # Token request form
│   │   ├── AnomalyDemo.jsx # Transaction anomaly detection demo
│   │   └── ContractScannerDemo.jsx # Smart contract security scanner
│   ├── styles/             # CSS modules for styling
│   │   ├── global.css      # Global styles and utilities
│   │   ├── Home.module.css # Home page specific styles
│   │   ├── Navbar.module.css # Navigation styles
│   │   ├── Footer.module.css # Footer styles
│   │   └── FaucetForm.module.css # Faucet form styles
│   ├── lib/                # Utility libraries
│   │   └── api.js          # API helper functions
│   ├── data/               # Mock data and examples
│   │   ├── mockTxLogs.json # Sample transaction logs
│   │   └── exampleContract.sol # Example smart contract
│   ├── assets/             # Static assets
│   │   └── logo.png        # Platform logo
│   ├── App.jsx             # Main application component
│   └── main.jsx            # React application entry point
├── package.json            # Project dependencies and scripts
├── vite.config.js          # Vite build configuration
└── README.md              # This file
```

## 🎯 Features

### Pages & Functionality

- **Home Page**: Platform overview with key features and statistics
- **Faucet**: Request testnet DYTX tokens for development
- **Tech Stack**: Detailed technical stack and architecture
- **AI Modules**: Interactive demos of AI-powered security features
- **Roadmap**: Development timeline and future plans
- **Developer Resources**: Links to tools, documentation, and community

### AI Demonstrations

- **Transaction Anomaly Detection**: Analyze transactions for suspicious patterns
- **Smart Contract Scanner**: Automated security vulnerability scanning
- **Real-time Analysis**: Interactive demos with mock AI processing

### Technical Features

- **React + JavaScript**: Modern React application without TypeScript
- **CSS Modules**: Scoped styling for maintainable CSS
- **React Router**: Client-side routing for single-page application
- **Vite**: Fast development server and optimized builds
- **Responsive Design**: Mobile-friendly responsive layout
- **Mock APIs**: Simulated backend responses for development

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory for custom configuration:

```env
# API Base URL (optional, defaults to proxy /api)
VITE_API_URL=http://localhost:8787/api
VITE_WS_URL=ws://localhost:8787/ws

# Enable development features
VITE_DEV_MODE=true

# API server security headers (server/index.js)
ENABLE_SEC_HEADERS=1
ENABLE_CSP=1

# Optional PQC manifest signature enforcement
# window.__PQC_MANIFEST_PUBKEY__ should be set in index.html for signature verification
```

### Build Configuration

The Vite configuration includes:
- CSS Modules with automatic class name generation
- Development server on port 5173
- Production build optimization
- Source maps for debugging

## 🎨 Styling

This project uses CSS Modules for component-specific styling and a global stylesheet for shared utilities. The design system includes:

- **Color Palette**: Blue (#3b82f6) and purple (#8b5cf6) gradients
- **Typography**: System font stack with proper sizing scales
- **Layout**: Flexbox and CSS Grid for responsive layouts
- **Components**: Card-based design with hover effects and shadows

### CSS Module Usage

```jsx
import styles from './Component.module.css'

function Component() {
  return <div className={styles.container}>Content</div>
}
```

## 🔌 API Integration

The application includes a mock API layer (`src/lib/api.js`) that simulates:

- Faucet token requests
- Transaction analysis
- Smart contract scanning
- Network statistics

Replace mock implementations with actual API calls when backend services are available.

## 🚀 Deployment

### Production Build

```bash
npm run build
```

The build output will be in the `dist/` directory, ready for deployment to any static hosting service.

### Deployment Options

- **Vercel**: Zero-config deployment with Git integration
- **Netlify**: Drag-and-drop deployment with continuous deployment
- **GitHub Pages**: Free hosting for open-source projects
- **AWS S3**: Scalable static website hosting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and commit: `git commit -m "Add new feature"`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📝 Development Guidelines

- Use functional components with React hooks
- Follow CSS Modules naming conventions
- Keep components small and focused
- Add proper error handling for user interactions
- Ensure responsive design across device sizes

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**: Change the port in `vite.config.js`
2. **Build failures**: Ensure all dependencies are installed
3. **Styling issues**: Check CSS Module import paths
4. **API errors**: Verify mock API implementations

### Getting Help

- Check the [GitHub Issues](https://github.com/HisMadRealm/dytallix/issues)
- Join our [Discord community](https://discord.gg/dytallix)
- Read the [documentation](https://docs.dytallix.com)

## 🔐 Wallet (PQC) Module

The Wallet page is fully wired with a client-side, security-first implementation:

- Post-quantum keypairs generated client-side (no keys ever leave the device)
- Encrypted keystore in localStorage using Argon2id + AES-GCM
- Address derivation from public key and algorithm
- Create, watch-only connect, import private key/keystore, export, change password, forget
- Real-time balances (native/DGT/DRT), send/receive, history, and faucet shortcut

### Source layout

- `src/lib/crypto/pqc.js` — lightweight PQC adapters: generateKeypair, sign, pubkeyFromSecret (placeholder adapters)
- `src/lib/crypto/address.js` — address derivation
- `src/lib/keystore.js` — encrypt/decrypt, save/load keystore and metadata
- `src/lib/api.js` — proxied API wrapper; `requestFaucet()` and `api()` helper
- `src/lib/ws.js` — minimal WebSocket connector
- `src/hooks/useWallet.js` — wallet lifecycle and secret management
- `src/hooks/useBalances.js` — balances fetch + live updates
- `src/hooks/useTx.js` — estimate, sign, submit, and track
- `src/components/wallet/*` — Send, Receive, History, Settings UI
- `src/pages/Wallet.jsx` — full page wiring

### Algorithms

Currently supported algorithms in the UI:
- Dilithium (default)
- Falcon
- SPHINCS+

Note: `src/lib/crypto/pqc.js` provides placeholder adapters for development. Replace with real PQC libraries (WASM) when available.

### Address format

`deriveAddress(pubKeyB64, algo)` computes:
- `hex = sha256("${algo}|${pubKeyB64}")`
- Address: `dytallix1` + first 38 hex chars

Example: `dytallix1b2f3...`

### Keystore format

Encrypted JSON stored locally (localStorage):

- `version`: 1
- `algo`: e.g., `dilithium`
- `address`: derived address
- `publicKey`: base64
- `cipher`: `AES-GCM`
- `kdf`: `argon2id`
- `kdfParams`: `{ saltB64, memory, iterations, parallelism }`
- `ivB64`: AES-GCM IV
- `ciphertextB64`: encrypted secret key (base64)
- `createdAt`: ISO timestamp

Local keys:
- Keystore: `wallet_keystore_v1`
- Metadata: `wallet_meta_v1`

No plaintext secret is persisted; secrets are held only in memory after unlock and wiped on lock/unload.

### API and WebSocket endpoints

The frontend expects these proxied routes (defaults work in dev):
- `GET /api/balances/:address`
- `GET /api/txs/:address` (pagination with `?cursor=`)
- `POST /api/tx/estimate`
- `POST /api/tx/submit`
- `GET /api/tx/:hash`
- `WS /ws/balances?address=...`
- `WS /ws/transactions?address=...`
- `WS /ws/tx?hash=...`
- Faucet: `POST /api/faucet` (see `server/index.js`)

### Environment variables (Vite)

- `VITE_API_URL` — base for HTTP API (default: `/api`)
- `VITE_WS_URL` — base for WebSocket (default: same host via `/ws`)

See `src/lib/config.js` for defaults and local persistence of dashboard settings.

### Security notes

- Private keys are generated and remain on-device; only encrypted keystore is stored.
- Password strength is enforced (min 8 chars, upper/lower/digit). Argon2id KDF is used for key derivation.
- Exported keystore JSON should be backed up securely offline. Anyone with the file and password can access funds.

### Using the Wallet

1. Create a new wallet and set a strong password.
2. Copy your address or open Receive to get it.
3. Use the Faucet to request DGT/DRT test tokens.
4. Send tokens via the Send form (Estimate first, then Send).
5. View live transaction history and balances.
6. Use Settings to export keystore, change password, or forget the wallet from this device.

## 🔐 Post-Quantum (PQC) Integration

A unified PQC facade wraps Dilithium, Falcon, and SPHINCS+ (placeholder WASM currently). Integrity of each WASM blob is enforced via a manifest of SHA-256 hashes before initialization.

Directory layout:
- `public/wasm/pqc/*.wasm` — WASM artifacts
- `public/wasm/pqc/manifest.json` — served manifest (also copied to `src/crypto/pqc/manifest.json` for tests)
- `public/wasm/pqc/build_meta.json` — build metadata (emcc version, git commit, timestamp)
- `src/crypto/pqc/manifest.json` — source copy (kept in sync by build script)
- `src/crypto/pqc/integrity.ts` — runtime fetch + hash + optional Ed25519 signature verify
- `src/crypto/pqc/pqc.ts` — facade selecting algorithm
- `src/config/flags.ts` — feature flags & algo resolver

Production enforcement:
- In `NODE_ENV=production` the adapter (`src/lib/crypto/pqc.js`) refuses to operate without the real WASM facade (no insecure fallback).

Manifest signature (optional):
- Set `window.__PQC_MANIFEST_PUBKEY__` (hex Ed25519 public key) early (e.g. in `index.html`).
- When building, export `MANIFEST_SIGN_KEY=<32-byte-seed-hex>` before running the build script to embed `_sig` in manifest.
- Runtime verifies `_sig` over canonical JSON (sorted keys, excluding `_sig`).

Deterministic build:
1. Ensure emscripten & (optionally) binaryen (wasm-opt) available: `emsdk/emsdk:3.1.57` container recommended.
2. Vendor PQClean sources under `vendor/pqclean` (see `README.VENDOR.md`).
3. Run `bash scripts/build_pqc_wasm.sh`.
4. Script outputs: WASM files, hashed manifest, optional signed manifest, build metadata.
5. Commit: `public/wasm/pqc/*.wasm`, `public/wasm/pqc/manifest.json`, `src/crypto/pqc/manifest.json`, and `public/wasm/pqc/build_meta.json`.

Verification steps:
```sh
shasum -a 256 public/wasm/pqc/*.wasm  # or sha256sum
jq -r '."dilithium.wasm"' public/wasm/pqc/manifest.json  # spot-check
```
If signed:
```sh
# Use external Ed25519 verifier: canonicalize manifest without _sig then verify base64 signature.
```

Switching algorithm (dev only):
```
// src/config/flags.ts (example)
export const DEFAULT_PQC_ALGO = 'dilithium' // set to 'falcon' or 'sphincs'
```
At runtime you can also expose a UI toggle (dev) that calls the facade initializer with a different algo; persist choice in localStorage (never in production unless audited multi-algo policy approved).

Vendoring real PQClean sources:
1. Choose upstream commit/tag (e.g. git tag v0.10.0). Note commit hash.
2. Download tarball & verify hash:
   ```sh
   export PQCLEAN_TAG=v0.10.0
   curl -L -o pqclean.tar.gz https://github.com/PQClean/PQClean/archive/refs/tags/${PQCLEAN_TAG}.tar.gz
   shasum -a 256 pqclean.tar.gz
   ```
3. Extract only needed scheme dirs into `vendor/pqclean/crypto_sign/.../clean/`:
   - `dilithium3/clean`
   - `falcon-512/clean`
   - `sphincs-sha2-128s-simple/clean`
4. Copy upstream `LICENSE` into `vendor/pqclean/` and update `README.VENDOR.md` fields (commit, date, tarball SHA256).
5. Remove any benchmark/test folders not required (minimize surface).
6. Commit vendor additions separately before building WASM.

Deterministic container build example:
```sh
docker run --rm -v "$PWD":/w -w /w emscripten/emsdk:3.1.57 \
  bash scripts/build_pqc_wasm.sh
```
(Install `binaryen` inside image if you require `wasm-opt`; some emsdk images already include it.)

Environment variables:
- `MANIFEST_SIGN_KEY` (build time): 32-byte Ed25519 seed hex to sign manifest (kept secret in CI).
- `PQC_STRICT_KAT=1` (test time): Fail tests if KAT vectors missing for implemented algorithms.
- `VITE_PQC_ALGO` (optional dev): Default algorithm override via Vite env (wire into flags resolver if desired).

KAT vectors:
Place per-algorithm JSON files in `src/crypto/pqc/vectors/<algo>/` with structure:
```json
{
  "msg": "hex-encoded-message-bytes",
  "pk": "hex-encoded-public-key",
  "sk": "hex-encoded-secret-key", // optional if not needed for verify-only
  "sig": "hex-encoded-signature"
}
```
Multiple files allowed; all loaded. Use official NIST/PQClean KAT formats converted to concise JSON (omit meta not needed).

To generate JSON from PQClean KAT (example pseudo):
```sh
# Parse PQClean .rsp -> JSON (custom script)
python scripts/convert_kat.py pqclean/PQCLEAN_<SCHEME>/PQCgenKAT_sign.rsp > vectors/dilithium/kat_0001.json
```
Ensure: All signatures verify under facade; add at least one negative tamper test per algo.

Production readiness checklist:
- [ ] Real PQClean sources vendored & LICENSE updated
- [ ] WASM built in pinned emsdk version; hashes recorded
- [ ] Manifest (and signature if enabled) committed atomically with WASM
- [ ] KAT vectors present and `PQC_STRICT_KAT` tests pass
- [ ] Integrity failure path surfaces clear UI error & blocks wallet
- [ ] No fallback HMAC mode reachable in production build
- [ ] Build metadata archived for provenance (store `build_meta.json` artifact)
- [ ] Dependency/license review completed

Security recommendations:
- Pin emscripten version in CI (fail if drift)
- Run `wasm-objdump -x` or `wasm-tools validate` in CI to ensure no unexpected exports/imports
- Consider reproducible build attestation (SLSA provenance) attaching manifest + metadata
- Rotate `MANIFEST_SIGN_KEY` via CI secret management; store public key in site HTML

Upgrade procedure:
1. Vendor new upstream version (new commit/tag).
2. Rebuild inside container; commit WASM + manifests.
3. Run full test suite with `PQC_STRICT_KAT=1`.
4. Deploy; monitor integrity load logs.

Rollback: Revert commit containing new WASM + manifest; redeploy (hash mismatch automatically blocks tampered combinations).

## PQC Productionization

This project now integrates real PQClean-based WASM implementations for Dilithium3, Falcon-512, and SPHINCS+-128s-simple.

Key components:
- `vendor/pqclean/` vendored minimal scheme sources (read-only) plus upstream LICENSE and README.VENDOR.md with commit + SHA.
- Deterministic build script: `scripts/build_pqc_wasm.sh` (wrapper: `scripts/pqc_build_wasm.sh`). Requires emscripten 3.1.57.
- Output artifacts: `public/wasm/pqc/{dilithium.wasm,falcon.wasm,sphincs.wasm}`
- Integrity manifest: `public/wasm/pqc/manifest.json` (copied to `src/crypto/pqc/manifest.json`). Optional Ed25519 signature `_sig` when MANIFEST_SIGN_KEY provided.
- Runtime integrity loader: `src/crypto/pqc/integrity.ts` (hash+signature verification before module init).
- Unified facade: `src/crypto/pqc/pqc.ts` with keygen/sign/verify/size APIs.
- KAT structure placeholder: `src/crypto/pqc/vectors/<algo>/*.json` for official known-answer tests (add before production flag `PQC_STRICT_KAT=1`).
- Tests: `src/crypto/pqc/__tests__/*` cover integrity, serialization, KATs, tamper detection.
- CI workflow: `.github/workflows/pqc.yml` builds WASM deterministically, verifies manifest hashes, runs tests with `PQC_STRICT_KAT=1`.

### Deterministic Build Steps (Host)
```bash
# Install emsdk (pinned)
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk && ./emsdk install 3.1.57 && ./emsdk activate 3.1.57 && source ./emsdk_env.sh
cd /path/to/dytallix-lean-launch
bash scripts/build_pqc_wasm.sh
```
If you want a manifest signature:
```bash
export MANIFEST_SIGN_KEY=<32-byte-seed-hex>
bash scripts/build_pqc_wasm.sh
# Public key (hex) from signing seed should be embedded at runtime as window.__PQC_MANIFEST_PUBKEY__ in index.html
```

### Integrity Enforcement
1. App loads manifest from `/wasm/pqc/manifest.json`.
2. Optional signature `_sig` is verified (Ed25519) over canonical sorted JSON sans `_sig`.
3. Each WASM is fetched and SHA-256 hashed; mismatch blocks PQC enablement.
4. Wallet UI disables PQC actions and surfaces an error banner on failure.

### Address Derivation (Current Spec)
Address = `dytallix1` + first 38 hex chars of SHA-256(`${algo}|${publicKeyBase64}`).
Future upgrade path: introduce version byte + Bech32m encoding (document separately) while maintaining backward compatibility via prefix detection.

### Security Hardening
- No production fallback: in `NODE_ENV=production` placeholder logic is refused.
- Zeroization: ephemeral key material and derived AES keys in keystore encryption are overwritten after use.
- PBKDF2 (strong params) simulates Argon2id interface pending WASM Argon2 integration.
- Deterministic builds: pinned emscripten version; optional manifest signing.
- Supply-chain: vendored minimal PQClean subsets only (dilithium3, falcon-512, sphincs-sha2-128s-simple).
- CI hash verification prevents silent WASM drift.
- Recommend CSP: `script-src 'self'; connect-src 'self' wss:` plus hash/nonce for inline manifest pubkey injection.

### Adding KAT Vectors
Convert official PQClean / NIST KAT `.rsp` files to concise JSON:
```json
{ "msg":"hex", "pk":"hex", "sk":"hex", "sig":"hex" }
```
Place under `src/crypto/pqc/vectors/<algo>/kat_XXXX.json`. Run with `PQC_STRICT_KAT=1` to enforce presence.

### CI / Release Gate
- Build & hash verification must pass.
- KAT tests must succeed (positive + negative tamper).
- Manifest + WASM committed atomically.

### Upgrade Procedure (Recap)
1. Update vendored sources (record new commit in README.VENDOR.md).
2. Rebuild via script (optionally sign manifest).
3. Run tests with `PQC_STRICT_KAT=1`.
4. Commit WASM + manifest + metadata.
5. Deploy & monitor integrity logs.

### Rollback
Revert commit containing updated WASM/manifest; redeploy. Integrity layer blocks mixed versions.

See CHANGELOG.md for the PQC Productionization entry.
