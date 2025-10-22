# QuantumVault Backend Integration

This document describes the complete integration between the QuantumVault frontend and the Dytallix blockchain backend.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │ QuantumVault    │    │   Blockchain    │
│   (React)       │◄──►│      API        │◄──►│     Core        │
│                 │    │   (Express)     │    │    (Rust)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
    ┌────▼────┐              ┌────▼────┐              ┌────▼────┐
    │ Upload  │              │ File    │              │ Asset   │
    │ Encrypt │              │ Storage │              │Registry │
    │ Sign    │              │ Upload  │              │ JSON-RPC│
    └─────────┘              └─────────┘              └─────────┘
```

## Integration Components

### 1. Blockchain Core API Extensions

**New endpoints added to `/blockchain-core/src/api/mod.rs`:**

#### JSON-RPC Methods:
- `asset_register` - Register asset hash on-chain
- `asset_verify` - Verify asset against blockchain records  
- `asset_get` - Retrieve asset information

#### REST Endpoints:
- `POST /api/quantum/register` - Register asset via REST
- `GET /api/quantum/verify/{hash}` - Verify asset via REST
- `GET /api/quantum/asset/{id}` - Get asset details via REST

### 2. QuantumVault API Integration

**Updated `/services/quantumvault-api/server.js`:**

- **File Upload**: `POST /upload` - Stores encrypted files
- **Asset Registration**: `POST /register` - Connects to blockchain API
- **Asset Verification**: `GET /verify/{hash}` - Queries blockchain
- **Health Check**: `GET /health` - Service status

### 3. Frontend API Client

**Updated `/frontend/src/lib/quantum/api.js`:**

- `uploadCiphertext()` - Upload encrypted files
- `registerAssetOnChain()` - Register via QuantumVault API
- `verifyAssetOnChain()` - Verify via QuantumVault API

## Setup Instructions

### 1. Environment Configuration

Create `/dytallix-fast-launch/.env`:
```bash
# QuantumVault API Configuration
VITE_QUANTUMVAULT_API_URL=http://localhost:3031
BLOCKCHAIN_API_URL=http://localhost:3030
```

### 2. Install Dependencies

QuantumVault API:
```bash
cd dytallix-fast-launch/services/quantumvault-api
npm install
```

Frontend (if not already done):
```bash
cd dytallix-fast-launch/frontend
npm install
```

### 3. Start Services

#### Terminal 1 - Blockchain Core:
```bash
cd blockchain-core
cargo run --features api
```

#### Terminal 2 - QuantumVault API:
```bash
cd dytallix-fast-launch/services/quantumvault-api  
npm start
```

#### Terminal 3 - Frontend:
```bash
cd dytallix-fast-launch/frontend
npm run dev
```

## Usage Flow

### 1. Upload & Encrypt (Frontend)
```javascript
// User selects file
const file = selectedFile;

// Hash with BLAKE3
const hash = await blake3Hex(fileBytes);

// Encrypt with XChaCha20-Poly1305
const { ciphertext, key, nonce } = await encryptEnvelope(fileBytes);

// Upload to QuantumVault API
const { uri } = await uploadCiphertext(ciphertext, filename, mimeType, hash);
```

### 2. Generate Proof (Frontend)
```javascript
// Create proof structure
const proof = {
  schema: 'https://dytallix.com/proof/v1',
  file_hash_blake3: hash,
  uri: uri,
  meta: { filename, mime, bytes },
  owner_sig_pk: publicKey,
  signature: pqSignature
};
```

### 3. Anchor On-Chain (Frontend → QuantumVault API → Blockchain)
```javascript
// Register asset on blockchain
const result = await registerAssetOnChain(hash, uri, metadata);
// Returns: { txHash, assetId, blockHeight, timestamp }
```

### 4. Verify (Frontend → QuantumVault API → Blockchain)  
```javascript
// Verify asset exists on blockchain
const verification = await verifyAssetOnChain(hash);
// Returns: { verified, txHash, blockHeight, timestamp }
```

## API Reference

### QuantumVault API

#### POST /upload
Upload encrypted file and get URI.
```json
// Form data:
{
  "file": "<encrypted_blob>",
  "original_filename": "document.pdf", 
  "mime": "application/pdf",
  "blake3": "<blake3_hash>"
}

// Response:
{
  "uri": "qv://abc123.enc",
  "blake3": "<blake3_hash>"
}
```

#### POST /register
Register asset on blockchain.
```json
// Request:
{
  "blake3": "<blake3_hash>",
  "uri": "qv://abc123.enc", 
  "metadata": { "filename": "document.pdf" }
}

// Response:
{
  "success": true,
  "txHash": "0xabc123...",
  "assetId": "asset_abc123",
  "blockHeight": 12345,
  "timestamp": 1640995200
}
```

#### GET /verify/{hash}
Verify asset on blockchain.
```json
// Response:
{
  "verified": true,
  "asset_id": "asset_abc123",
  "tx_hash": "0xabc123...",
  "block_height": 12345,
  "timestamp": 1640995200,
  "metadata": { "filename": "document.pdf" }
}
```

### Blockchain Core API

#### JSON-RPC: asset_register
```json
// Request:
{
  "method": "asset_register",
  "params": ["<blake3_hash>", "qv://uri", {"metadata": "value"}]
}

// Response:
{
  "success": true,
  "asset_id": "asset_abc123", 
  "tx_hash": "0xabc123...",
  "block_height": 12345,
  "timestamp": 1640995200
}
```

#### REST: POST /api/quantum/register
```json
// Request:
{
  "assetHash": "<blake3_hash>",
  "uri": "qv://abc123.enc",
  "metadata": {"filename": "document.pdf"}
}

// Response: (same as JSON-RPC)
```

## Testing

Run the integration test:
```bash
node quantumvault-integration-test.js
```

This tests:
- ✅ Blockchain API endpoints (JSON-RPC & REST)
- ✅ QuantumVault API endpoints  
- ✅ Full integration flow (upload → register → verify)

## Security Features

### Client-Side Encryption
- **BLAKE3 Hashing**: Fast, secure file hashing
- **XChaCha20-Poly1305**: Authenticated encryption
- **Post-Quantum Signatures**: Dilithium signature scheme

### Zero-Knowledge Storage
- Only encrypted ciphertext stored on server
- Encryption keys never leave client
- Proof generation happens client-side

### Blockchain Anchoring
- Immutable proof of existence
- Timestamped on-chain records
- Cryptographic verification

## Troubleshooting

### Common Issues

**1. "Registration failed" errors:**
- Check blockchain core is running on port 3030
- Verify QuantumVault API can reach blockchain
- Check environment variables

**2. "Upload failed" errors:**  
- Ensure QuantumVault API is running on port 3031
- Check file size limits (10MB max)
- Verify frontend can reach API

**3. CORS errors:**
- Check CORS configuration in blockchain core
- Verify allowed origins in QuantumVault API

### Debugging

Enable debug logging:
```bash
# Frontend (browser console)
localStorage.debug = 'quantum:*'

# QuantumVault API
DEBUG=quantumvault npm start

# Blockchain Core  
RUST_LOG=debug cargo run --features api
```

## Production Considerations

### Security
- [ ] Use HTTPS for all communications
- [ ] Implement proper authentication
- [ ] Add rate limiting to APIs
- [ ] Use secure key derivation
- [ ] Implement proper access controls

### Scalability
- [ ] Replace in-memory storage with database
- [ ] Add caching layers
- [ ] Implement load balancing
- [ ] Use distributed file storage (IPFS)

### Monitoring
- [ ] Add comprehensive logging
- [ ] Implement health checks
- [ ] Set up alerting
- [ ] Add performance metrics

## Next Steps

1. **Enhanced Security**: Implement proper key management
2. **Real PQ Crypto**: Replace stub implementations
3. **Database Integration**: Persistent storage for metadata
4. **IPFS Integration**: Decentralized file storage
5. **Advanced Verification**: Multi-party verification workflows
