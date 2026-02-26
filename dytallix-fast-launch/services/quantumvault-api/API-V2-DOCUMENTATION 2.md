# QuantumVault API v2 Documentation

## Overview

**QuantumVault v2** is a storage-agnostic cryptographic verification service that provides:

- ✅ **Cryptographic proof generation** without storing files
- ✅ **File integrity verification** from any storage location
- ✅ **Blockchain anchoring** for immutable timestamps
- ✅ **Zero-knowledge architecture** - never see user data
- ✅ **Batch processing** for multiple files
- ✅ **Verification certificates** for compliance

## Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────┐
│   Client    │─────▶│  QuantumVault    │─────▶│ Blockchain  │
│             │      │  API v2          │      │  (Anchoring)│
│  • Files    │      │                  │      └─────────────┘
│  • Hashes   │      │  • Proof Gen     │
│  • Metadata │      │  • Verification  │      ┌─────────────┐
└─────────────┘      │  • Certificates  │─────▶│ User Storage│
                     └──────────────────┘      │ (S3/Local/  │
                                                │  Cloud)     │
                                                └─────────────┘
```

### Key Principles

1. **Storage Agnostic**: Files stored wherever users want (S3, local, IPFS, etc.)
2. **Zero Knowledge**: Server never sees plaintext or passwords
3. **Cryptographic Proofs**: BLAKE3 hashing with blockchain anchoring
4. **User Control**: Users maintain complete control over their data

---

## API Endpoints

### Base URL
```
http://localhost:3031
```

---

## 📋 Proof Generation

### POST /proof/generate

Generate a cryptographic proof for a file without storing it.

**Request Body:**
```json
{
  "blake3": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "filename": "document.pdf",
  "mime": "application/pdf",
  "size": 1024000,
  "storageLocation": "s3://my-bucket/files/document.pdf",
  "metadata": {
    "author": "John Doe",
    "department": "Engineering"
  }
}
```

**Response:**
```json
{
  "success": true,
  "proofId": "proof-1234567890-1",
  "proof": {
    "id": "proof-1234567890-1",
    "version": "2.0",
    "algorithm": "BLAKE3",
    "file": {
      "blake3": "e3b0c442...",
      "filename": "document.pdf",
      "mime": "application/pdf",
      "size": 1024000
    },
    "storage": {
      "location": "s3://my-bucket/files/document.pdf",
      "type": "remote"
    },
    "created": "2025-10-26T19:00:00.000Z",
    "status": "generated",
    "anchored": false
  },
  "certificate": {
    "id": "proof-1234567890-1",
    "fileHash": "e3b0c442...",
    "filename": "document.pdf",
    "timestamp": "2025-10-26T19:00:00.000Z",
    "verificationUrl": "http://localhost:3031/certificate/proof-1234567890-1"
  }
}
```

---

## ✅ Verification

### POST /proof/verify

Verify file integrity against a stored proof.

**Request Body:**
```json
{
  "proofId": "proof-1234567890-1",
  "blake3": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "verified": true,
    "proofId": "proof-1234567890-1",
    "timestamp": "2025-10-26T19:01:00.000Z",
    "originalFile": {
      "filename": "document.pdf",
      "blake3": "e3b0c442...",
      "size": 1024000,
      "created": "2025-10-26T19:00:00.000Z"
    },
    "submittedHash": "e3b0c442...",
    "blockchainAnchored": true,
    "blockchainTx": "0xabc123...",
    "message": "File integrity verified successfully"
  }
}
```

---

## 📦 Batch Processing

### POST /proof/batch

Generate proofs for multiple files at once.

**Request Body:**
```json
{
  "files": [
    {
      "blake3": "hash1...",
      "filename": "document1.pdf",
      "size": 1000
    },
    {
      "blake3": "hash2...",
      "filename": "document2.pdf",
      "size": 2000
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "total": 2,
  "successful": 2,
  "failed": 0,
  "results": [
    {
      "success": true,
      "proofId": "proof-123-1",
      "filename": "document1.pdf",
      "blake3": "hash1..."
    },
    {
      "success": true,
      "proofId": "proof-123-2",
      "filename": "document2.pdf",
      "blake3": "hash2..."
    }
  ],
  "errors": []
}
```

---

## ⚓ Blockchain Anchoring

### POST /anchor

Anchor a proof hash on the blockchain.

**Request Body:**
```json
{
  "proofId": "proof-1234567890-1"
}
```

**Response:**
```json
{
  "success": true,
  "proofId": "proof-1234567890-1",
  "anchored": true,
  "transaction": {
    "hash": "0xb52e10fd27ac064aa4a746575c7e149c...",
    "blockHeight": 1300115,
    "timestamp": "2025-10-26T19:02:00.000Z"
  },
  "message": "Proof hash anchored on blockchain"
}
```

### GET /anchor/:proofId

Get anchoring status for a proof.

**Response:**
```json
{
  "proofId": "proof-1234567890-1",
  "anchored": true,
  "transaction": "0xb52e10fd...",
  "blockHeight": 1300115,
  "timestamp": "2025-10-26T19:02:00.000Z"
}
```

---

## 📜 Verification Certificates

### GET /certificate/:proofId

Get a verification certificate.

**Response:**
```json
{
  "certificate": {
    "title": "QuantumVault Verification Certificate",
    "id": "proof-1234567890-1",
    "issueDate": "2025-10-26T19:00:00.000Z",
    "version": "2.0"
  },
  "file": {
    "name": "document.pdf",
    "hash": "e3b0c442...",
    "algorithm": "BLAKE3",
    "size": 1024000,
    "type": "application/pdf"
  },
  "verification": {
    "status": "Cryptographically Verified",
    "timestamp": "2025-10-26T19:00:00.000Z",
    "blockchainAnchored": true,
    "blockchainTx": "0xb52e10fd..."
  },
  "storage": {
    "location": "s3://my-bucket/files/document.pdf",
    "type": "remote",
    "note": "User maintains full control of file storage"
  },
  "issuer": {
    "service": "QuantumVault Cryptographic Verification Service",
    "api": "v2.0"
  }
}
```

### GET /certificate/:proofId/download

Download certificate as a JSON file.

---

## 🌐 Remote Verification

### POST /verify/remote

Verify a file from a user-provided URL (coming soon).

**Request Body:**
```json
{
  "url": "https://example.com/file.pdf",
  "expectedHash": "e3b0c442..."
}
```

---

## 🏥 System Endpoints

### GET /health

Health check and service status.

**Response:**
```json
{
  "status": "healthy",
  "version": "2.0",
  "service": "QuantumVault Cryptographic Verification Service",
  "mode": "storage-agnostic",
  "timestamp": "2025-10-26T19:00:00.000Z",
  "proofs": 42,
  "legacyAssets": 21
}
```

### GET /

API documentation overview.

---

## 🔄 Workflow Examples

### Example 1: Basic Verification Flow

```javascript
// 1. Compute file hash (client-side)
const hash = await computeBLAKE3(file);

// 2. Generate proof
const proof = await fetch('http://localhost:3031/proof/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    blake3: hash,
    filename: file.name,
    size: file.size,
    storageLocation: 'user-managed'
  })
});

const { proofId } = await proof.json();

// 3. Store file wherever you want
await uploadToS3(file);
// or: save locally
// or: upload to IPFS
// or: any storage solution

// 4. Anchor proof on blockchain
await fetch('http://localhost:3031/anchor', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ proofId })
});

// 5. Later: Verify file integrity
const verification = await fetch('http://localhost:3031/proof/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    proofId,
    blake3: currentFileHash
  })
});

const { result } = await verification.json();
console.log('Verified:', result.verified);
```

### Example 2: Batch Processing

```javascript
const files = [file1, file2, file3];

// Compute hashes for all files
const fileData = await Promise.all(
  files.map(async (file) => ({
    blake3: await computeBLAKE3(file),
    filename: file.name,
    size: file.size
  }))
);

// Generate proofs in batch
const response = await fetch('http://localhost:3031/proof/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ files: fileData })
});

const { results } = await response.json();
console.log(`Generated ${results.length} proofs`);
```

---

## 🔐 Security Features

1. **Zero-Knowledge**: Server never sees file contents or passwords
2. **Client-Side Hashing**: All hashing done in browser
3. **Blockchain Anchoring**: Immutable proof of existence
4. **Storage Agnostic**: Users control where data lives
5. **Cryptographic Verification**: BLAKE3 hash verification

---

## 💼 Use Cases

### Document Verification
- Legal contracts
- Medical records
- Academic transcripts
- Financial statements

### Compliance & Audit
- Regulatory compliance
- Audit trails
- Chain of custody
- Data integrity verification

### Software Distribution
- Release verification
- Binary integrity
- Supply chain security
- Update validation

### Data Archival
- Long-term preservation
- Forensic evidence
- Historical records
- Intellectual property

---

## 🚀 Getting Started

### Installation

```bash
cd services/quantumvault-api
npm install
```

### Start Server

```bash
node server-v2.js
```

### Run Tests

```bash
node test-api-v2.js
```

---

## 📊 Comparison: v1 vs v2

| Feature | v1 (Storage-Based) | v2 (Verification) |
|---------|-------------------|-------------------|
| File Storage | Required | Optional |
| User Control | Limited | Full |
| Storage Costs | Server-side | User-side |
| Scalability | Storage-limited | Unlimited |
| Privacy | Good | Excellent |
| Flexibility | Low | High |
| Primary Value | Storage | Verification |

---

## 🔮 Future Enhancements

- [ ] Remote file verification (fetch from URL)
- [ ] Real blockchain integration
- [ ] API authentication & rate limiting
- [ ] Webhook notifications
- [ ] SDK libraries (JS, Python, Go)
- [ ] Enterprise audit logs
- [ ] Batch verification endpoint
- [ ] Certificate templates

---

## 📞 Support

- **Documentation**: https://docs.dytallix.com/quantumvault
- **API Endpoint**: http://localhost:3031/
- **Health Check**: http://localhost:3031/health

---

## 📄 License

Part of the Dytallix Fast Launch ecosystem.
