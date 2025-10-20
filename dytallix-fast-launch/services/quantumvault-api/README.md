# QuantumVault API

Backend service for QuantumVault - permissionless, quantum-secure asset storage.

## Features

- **Upload encrypted assets** (≤10MB)
- **Generate storage URIs** (mock IPFS/S3)
- **Register assets on-chain** (mock smart contract)
- **Verify asset integrity**

## Endpoints

### POST /upload
Upload an encrypted file and receive a storage URI.

**Request:**
- `multipart/form-data`
- `file`: Encrypted file (≤10MB)
- `mime`: Original MIME type
- `original_filename`: Original filename
- `blake3`: BLAKE3 hash of original file (hex)

**Response:**
```json
{
  "uri": "qv://abc123.enc",
  "blake3": "0x..."
}
```

### GET /asset/:uri
Get metadata for an uploaded asset.

**Response:**
```json
{
  "uri": "qv://abc123.enc",
  "blake3": "0x...",
  "original_filename": "example.pdf",
  "mime": "application/pdf",
  "size": 1024000,
  "uploaded": "2024-01-01T00:00:00.000Z"
}
```

### POST /register
Register an asset hash on-chain (mock).

**Request:**
```json
{
  "blake3": "0x...",
  "uri": "qv://abc123.enc"
}
```

**Response:**
```json
{
  "txHash": "0x...",
  "assetId": 1
}
```

### GET /verify/:assetId
Verify an asset against on-chain record.

**Response:**
```json
{
  "assetId": 1,
  "blake3": "0x...",
  "uri": "qv://abc123.enc",
  "owner": "0x...",
  "timestamp": 1234567890,
  "txHash": "0x..."
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "quantumvault-api",
  "assets": 5,
  "onChainAssets": 3
}
```

## Running

```bash
# Install dependencies
npm install

# Start server
npm start

# Development mode with auto-reload
npm run dev
```

Server runs on port 3031 by default (configurable via `PORT` env var).

## Storage

- **Local storage**: `./storage/` directory (for POC)
- **Metadata**: `./metadata.json` file
- **Production**: Replace with S3, IPFS, or Arweave

## Security Notes

This is a POC implementation. For production:

1. Use proper distributed storage (IPFS, Arweave, S3 with encryption)
2. Implement authentication and rate limiting
3. Add request validation and sanitization
4. Use a real blockchain for on-chain anchoring
5. Add monitoring and logging
6. Implement backup and disaster recovery
7. Add HTTPS/TLS termination
8. Use environment-based configuration
