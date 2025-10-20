# QuantumVault

**Permissionless, Content-Agnostic, Quantum-Secure Asset Storage**

QuantumVault is a production-quality web application that demonstrates secure, quantum-resistant asset storage and anchoring on the Dytallix blockchain.

## Features

### Client-Side Security
- ✅ **BLAKE3 Hashing** - Fast, cryptographically secure file hashing
- ✅ **XChaCha20-Poly1305 Encryption** - Authenticated encryption for complete privacy
- ✅ **Post-Quantum Signatures** - Dilithium signature support (stub for POC, ready for real implementation)
- ✅ **Client-Side Processing** - All crypto happens in your browser, keys never leave your device

### Storage & Anchoring
- ✅ **10MB Upload Limit** - Optimized for documents, images, and small files
- ✅ **Encrypted Storage** - Only ciphertext is stored on backend
- ✅ **On-Chain Anchoring** - Asset hash registered on blockchain for tamper-proof verification
- ✅ **Proof Certificates** - Downloadable JSON proof with PQ signature

### Verification
- ✅ **Signature Verification** - Verify PQ signature integrity
- ✅ **On-Chain Comparison** - Compare proof hash with blockchain record
- ✅ **File Re-Hash** - Optional local file verification
- ✅ **Complete Audit Trail** - Timestamp, owner, and transaction hash

## Architecture

```
┌─────────────┐
│   Browser   │
│             │
│  ┌───────┐  │
│  │ BLAKE3│  │  1. Hash file
│  └───────┘  │
│  ┌───────┐  │
│  │XChaCha│  │  2. Encrypt
│  └───────┘  │
│  ┌───────┐  │
│  │  PQ   │  │  3. Sign proof
│  │  Sig  │  │
│  └───────┘  │
└──────┬──────┘
       │
       │ 4. Upload encrypted file
       ▼
┌──────────────────┐
│  QuantumVault    │
│      API         │
│                  │
│  - Store cipher  │
│  - Return URI    │
│  - Mock registry │
└──────┬───────────┘
       │
       │ 5. Anchor hash
       ▼
┌──────────────────┐
│   Blockchain     │
│                  │
│  DytallixRegistry│
│  registerAsset() │
└──────────────────┘
```

## Quick Start

### Frontend

```bash
cd dytallix-fast-launch
npm install
npm run dev
```

Then navigate to `http://localhost:5173/#/quantumvault`

### Backend API

```bash
cd services/quantumvault-api
npm install
npm start
```

API will run on `http://localhost:3031`

## Usage

### 1. Upload an Asset

1. Visit `#/quantumvault` route
2. Drag and drop a file (≤10MB) or click to browse
3. Click "Process & Upload"
4. Wait for:
   - BLAKE3 hashing
   - XChaCha20-Poly1305 encryption
   - Upload to backend
   - PQ signature generation

### 2. View Proof Certificate

After upload:
- **File Hash**: BLAKE3 hash of original file
- **Storage URI**: Location of encrypted file
- **Encryption Keys**: Save these to decrypt later!
- **PQ Signature**: Dilithium signature (stub)

Options:
- 📋 Copy JSON to clipboard
- 💾 Download proof.json file

### 3. Anchor On-Chain

1. Click "Register Asset" in Anchor panel
2. Simulated wallet connection
3. On-chain registration via mock smart contract
4. Receive transaction hash and asset ID

### 4. Verify Proof

1. Upload a proof.json file or paste JSON
2. Optionally upload original file for re-hash
3. Click "Verify Proof"
4. Results show:
   - ✓ PQ Signature valid
   - ✓ On-chain hash match
   - ✓ File hash match (if file provided)

## Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **hash-wasm** - BLAKE3 hashing
- **libsodium-wrappers** - XChaCha20-Poly1305 encryption
- **Tailwind CSS** - Styling (via existing setup)

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **Multer** - File upload handling
- **Local filesystem** - Storage (POC; use S3/IPFS in production)

### Crypto
- **BLAKE3** - Fast, secure hashing (via hash-wasm)
- **XChaCha20-Poly1305** - Authenticated encryption
- **Dilithium** - Post-quantum signatures (stub; WASM coming)

## File Structure

```
dytallix-fast-launch/
├── frontend/
│   └── src/
│       ├── routes/
│       │   └── QuantumVault.jsx         # Main route component
│       ├── components/
│       │   └── quantum/
│       │       ├── UploadCard.jsx       # File upload UI
│       │       ├── ProofPanel.jsx       # Proof display
│       │       ├── AnchorPanel.jsx      # On-chain anchoring
│       │       └── VerifyPanel.jsx      # Verification UI
│       └── lib/
│           └── quantum/
│               ├── blake3.js            # BLAKE3 hashing
│               ├── envelope.js          # XChaCha20 encryption
│               ├── pq-signature.js      # PQ signatures (stub)
│               ├── api.js               # Backend API client
│               └── format.js            # Utilities
└── services/
    └── quantumvault-api/
        ├── server.js                    # Express API server
        ├── package.json
        └── README.md
```

## API Endpoints

See [services/quantumvault-api/README.md](services/quantumvault-api/README.md) for full API documentation.

Quick reference:
- `POST /upload` - Upload encrypted file
- `GET /asset/:uri` - Get asset metadata
- `POST /register` - Register hash on-chain (mock)
- `GET /verify/:assetId` - Verify on-chain record
- `GET /health` - Health check

## Security Model

### Client-Side

1. **File never leaves unencrypted** - BLAKE3 hash and XChaCha20 encryption happen before upload
2. **Keys stay local** - Encryption key and nonce generated in browser
3. **Zero-knowledge** - Backend never sees plaintext or keys
4. **PQ-ready** - Dilithium signature infrastructure in place

### Backend

1. **Stateless design** - No user accounts or sessions
2. **Ciphertext only** - Only encrypted blobs stored
3. **Immutable proofs** - Proof JSON is signed and anchored
4. **10MB limit** - Prevents abuse and DoS

### On-Chain

1. **Hash anchoring** - Only BLAKE3 hash goes on-chain
2. **Permanent record** - Blockchain provides tamper-proof audit trail
3. **Owner tracking** - Transaction sender is asset owner
4. **Timestamping** - Block time provides creation timestamp

## Roadmap

### Phase 1: POC (Complete)
- ✅ Client-side hashing with BLAKE3
- ✅ XChaCha20-Poly1305 encryption
- ✅ File upload to backend
- ✅ Proof generation
- ✅ PQ signature stub
- ✅ Mock on-chain registry
- ✅ Verification workflow
- ✅ Responsive UI

### Phase 2: Production-Ready
- [ ] Real Dilithium WASM integration
- [ ] IPFS/Arweave storage backend
- [ ] Real smart contract on Dytallix
- [ ] Wallet integration (MetaMask-like)
- [ ] Rate limiting and abuse prevention
- [ ] E2E tests with Playwright
- [ ] Performance optimization
- [ ] Accessibility audit

### Phase 3: Advanced Features
- [ ] Multi-signature proofs
- [ ] Time-locked decryption
- [ ] Proof delegation
- [ ] Batch uploads
- [ ] Mobile app
- [ ] Desktop app (Tauri)

## Testing

### Unit Tests
```bash
# TODO: Add test suite
npm test
```

### E2E Tests
```bash
# TODO: Add Playwright tests
npm run test:e2e
```

### Manual Testing

1. **Upload flow**: Upload file ≤10MB → verify proof generated
2. **Anchor flow**: Register asset → verify transaction hash
3. **Verify flow**: Upload proof → verify all checks pass
4. **Error handling**: Try >10MB file → verify error message
5. **Mobile**: Test on mobile device for responsive design

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- **Documentation**: [https://dytallix.com/#/docs](https://dytallix.com/#/docs)
- **Issues**: [GitHub Issues](https://github.com/HisMadRealm/dytallix/issues)
- **Community**: [Discord](https://discord.gg/dytallix)

## Acknowledgments

- BLAKE3 team for fast, secure hashing
- libsodium for excellent crypto primitives
- Dilithium team for post-quantum signatures
- Dytallix community for testing and feedback

---

**Built with ❤️ for a quantum-secure future**
