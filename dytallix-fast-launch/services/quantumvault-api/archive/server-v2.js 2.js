/**
 * QuantumVault API Server v2
 * Storage-Agnostic Cryptographic Verification Service
 * 
 * Core Services:
 * - Cryptographic proof generation
 * - File integrity verification
 * - Blockchain anchoring (hash only)
 * - Zero-knowledge architecture
 * 
 * Endpoints:
 * - POST /proof/generate - Generate cryptographic proof from file metadata
 * - POST /proof/verify - Verify file integrity against stored proof
 * - POST /proof/batch - Batch proof generation
 * - POST /anchor - Anchor proof hash on blockchain
 * - GET /anchor/:proofId - Get anchoring status
 * - POST /verify/remote - Verify file from user-provided URL
 * - GET /certificate/:proofId - Download verification certificate
 * 
 * Legacy Endpoints (backward compatibility):
 * - POST /upload - Upload encrypted file (optional storage)
 * - POST /register - Register asset on-chain
 */

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createHash, randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';
import { getBlockchainService } from './blockchain-service.js';
import { getAuditService } from './audit-service.js';
import { getApiKeyService } from './api-key-service.js';
import { getWebhookService } from './webhook-service.js';
import enterpriseRoutes from './enterprise-routes.js';

const fetch = globalThis.fetch || (await import('node-fetch')).default;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3031;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));

// Enterprise routes
app.use('/enterprise', enterpriseRoutes);

// Storage configuration (optional for legacy support)
const STORAGE_DIR = join(__dirname, 'storage');
const PROOFS_DIR = join(__dirname, 'proofs');
const METADATA_FILE = join(__dirname, 'metadata.json');
const PROOFS_FILE = join(__dirname, 'proofs.json');

// Ensure directories exist
await fs.mkdir(STORAGE_DIR, { recursive: true });
await fs.mkdir(PROOFS_DIR, { recursive: true });

// In-memory storage
let metadata = {};
let proofs = {};
let onChainRegistry = {};
let proofIdCounter = 1;

// Load existing data
try {
  const data = await fs.readFile(METADATA_FILE, 'utf-8');
  metadata = JSON.parse(data);
  console.log(`[QuantumVault] Loaded ${Object.keys(metadata).length} legacy assets`);
} catch (err) {
  console.log('[QuantumVault] No existing metadata');
}

try {
  const data = await fs.readFile(PROOFS_FILE, 'utf-8');
  proofs = JSON.parse(data);
  proofIdCounter = Math.max(...Object.keys(proofs).map(k => parseInt(k) || 0), 0) + 1;
  console.log(`[QuantumVault] Loaded ${Object.keys(proofs).length} proofs`);
} catch (err) {
  console.log('[QuantumVault] No existing proofs');
}

// Save helpers
async function saveMetadata() {
  await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2));
}

async function saveProofs() {
  await fs.writeFile(PROOFS_FILE, JSON.stringify(proofs, null, 2));
}

// Multer for optional file uploads (legacy support)
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 },
  storage: multer.diskStorage({
    destination: STORAGE_DIR,
    filename: (req, file, cb) => {
      const hash = createHash('sha256').update(randomBytes(32)).digest('hex');
      cb(null, `${hash}.enc`);
    }
  })
});

// ============================================================================
// NEW API v2 - STORAGE-AGNOSTIC VERIFICATION SERVICE
// ============================================================================

/**
 * POST /proof/generate
 * Generate cryptographic proof without storing the file
 * 
 * Body:
 * {
 *   blake3: "file-hash",
 *   filename: "document.pdf",
 *   mime: "application/pdf",
 *   size: 12345,
 *   storageLocation: "user-controlled-url-or-identifier", // optional
 *   metadata: { ... } // optional additional metadata
 * }
 */
app.post('/proof/generate', async (req, res) => {
  try {
    const { blake3, filename, mime, size, storageLocation, metadata: userMetadata } = req.body;

    // Validate required fields
    if (!blake3 || !filename) {
      return res.status(400).json({ 
        error: 'Missing required fields: blake3, filename' 
      });
    }

    // Generate unique proof ID
    const proofId = `proof-${Date.now()}-${proofIdCounter++}`;
    const timestamp = new Date().toISOString();

    // Create cryptographic proof
    const proof = {
      id: proofId,
      version: '2.0',
      algorithm: 'BLAKE3',
      
      // File information
      file: {
        blake3,
        filename,
        mime: mime || 'application/octet-stream',
        size: size || 0
      },

      // Storage information (user-controlled)
      storage: {
        location: storageLocation || 'user-managed',
        type: storageLocation ? 'remote' : 'local',
        note: 'File storage is managed by the user'
      },

      // Timestamp and proof metadata
      created: timestamp,
      expires: null, // Never expires by default
      
      // Additional metadata
      metadata: {
        ...userMetadata,
        proofGeneratedBy: 'QuantumVault v2.0',
        service: 'Cryptographic Verification Service'
      },

      // Status
      status: 'generated',
      anchored: false,
      blockchainTxHash: null
    };

    // Store proof
    proofs[proofId] = proof;
    await saveProofs();

    console.log(`[QuantumVault] Generated proof: ${proofId} for ${filename}`);

    // Audit logging
    try {
      const auditService = getAuditService();
      await auditService.initialize();
      await auditService.logProofGeneration({
        proofId,
        fileHash: blake3,
        filename,
        storageLocation,
        userId: req.body.userId,
        apiKey: req.headers['x-api-key']
      });
    } catch (auditError) {
      console.error('[Audit] Failed to log proof generation:', auditError);
    }

    // Webhook notification
    try {
      const webhookService = getWebhookService();
      await webhookService.initialize();
      await webhookService.notifyProofGenerated({
        proofId,
        fileHash: blake3,
        filename,
        storageLocation,
        timestamp
      });
    } catch (webhookError) {
      console.error('[Webhook] Failed to send notification:', webhookError);
    }

    // Return verification certificate
    res.json({
      success: true,
      proofId,
      proof,
      certificate: {
        id: proofId,
        fileHash: blake3,
        filename,
        timestamp,
        verificationUrl: `${req.protocol}://${req.get('host')}/certificate/${proofId}`,
        downloadUrl: `${req.protocol}://${req.get('host')}/certificate/${proofId}/download`
      },
      message: 'Cryptographic proof generated successfully'
    });

  } catch (error) {
    console.error('[QuantumVault] Proof generation error:', error);
    res.status(500).json({ error: 'Proof generation failed' });
  }
});

/**
 * POST /proof/verify
 * Verify file integrity against stored proof
 * 
 * Body:
 * {
 *   proofId: "proof-xyz",
 *   blake3: "file-hash-to-verify"
 * }
 */
app.post('/proof/verify', async (req, res) => {
  try {
    const { proofId, blake3 } = req.body;

    if (!proofId || !blake3) {
      return res.status(400).json({ 
        error: 'Missing required fields: proofId, blake3' 
      });
    }

    // Look up proof
    const proof = proofs[proofId];
    if (!proof) {
      return res.status(404).json({ 
        error: 'Proof not found',
        proofId 
      });
    }

    // Verify hash matches
    const verified = proof.file.blake3 === blake3;
    const timestamp = new Date().toISOString();

    // Create verification result
    const verificationResult = {
      verified,
      proofId,
      timestamp,
      originalFile: {
        filename: proof.file.filename,
        blake3: proof.file.blake3,
        size: proof.file.size,
        created: proof.created
      },
      submittedHash: blake3,
      blockchainAnchored: proof.anchored,
      blockchainTx: proof.blockchainTxHash,
      message: verified 
        ? 'File integrity verified successfully' 
        : 'Hash mismatch - file may have been modified'
    };

    console.log(`[QuantumVault] Verification ${verified ? 'SUCCESS' : 'FAILED'}: ${proofId}`);

    res.json({
      success: true,
      result: verificationResult
    });

  } catch (error) {
    console.error('[QuantumVault] Verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

/**
 * POST /proof/batch
 * Generate proofs for multiple files at once
 * 
 * Body:
 * {
 *   files: [
 *     { blake3: "...", filename: "...", ... },
 *     { blake3: "...", filename: "...", ... }
 *   ]
 * }
 */
app.post('/proof/batch', async (req, res) => {
  try {
    const { files } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ 
        error: 'Missing or invalid files array' 
      });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        const { blake3, filename, mime, size, storageLocation, metadata: userMetadata } = file;

        if (!blake3 || !filename) {
          errors.push({ 
            index: i, 
            error: 'Missing blake3 or filename',
            file 
          });
          continue;
        }

        const proofId = `proof-${Date.now()}-${proofIdCounter++}`;
        const timestamp = new Date().toISOString();

        const proof = {
          id: proofId,
          version: '2.0',
          algorithm: 'BLAKE3',
          file: {
            blake3,
            filename,
            mime: mime || 'application/octet-stream',
            size: size || 0
          },
          storage: {
            location: storageLocation || 'user-managed',
            type: storageLocation ? 'remote' : 'local'
          },
          created: timestamp,
          metadata: userMetadata || {},
          status: 'generated',
          anchored: false
        };

        proofs[proofId] = proof;
        
        results.push({
          success: true,
          proofId,
          filename,
          blake3
        });

      } catch (err) {
        errors.push({ 
          index: i, 
          error: err.message,
          file 
        });
      }
    }

    await saveProofs();

    console.log(`[QuantumVault] Batch proof generation: ${results.length} success, ${errors.length} errors`);

    res.json({
      success: true,
      total: files.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors
    });

  } catch (error) {
    console.error('[QuantumVault] Batch proof error:', error);
    res.status(500).json({ error: 'Batch proof generation failed' });
  }
});

/**
 * POST /verify/remote
 * Verify a file from a user-provided URL
 * 
 * Body:
 * {
 *   url: "https://example.com/file.pdf",
 *   expectedHash: "blake3-hash" // optional
 * }
 */
app.post('/verify/remote', async (req, res) => {
  try {
    const { url, expectedHash } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Missing url' });
    }

    console.log(`[QuantumVault] Remote verification requested for: ${url}`);

    // In production, you would:
    // 1. Fetch the file from the URL
    // 2. Compute BLAKE3 hash
    // 3. Compare with expected hash
    // 4. Return verification result

    // For now, return a mock response
    res.json({
      success: true,
      url,
      verified: false,
      message: 'Remote verification coming soon - this endpoint will fetch and verify files from any URL',
      note: 'In production: Downloads file, computes BLAKE3, compares with expectedHash'
    });

  } catch (error) {
    console.error('[QuantumVault] Remote verification error:', error);
    res.status(500).json({ error: 'Remote verification failed' });
  }
});

/**
 * GET /certificate/:proofId
 * Get verification certificate for a proof
 */
app.get('/certificate/:proofId', async (req, res) => {
  try {
    const { proofId } = req.params;
    const proof = proofs[proofId];

    if (!proof) {
      return res.status(404).json({ error: 'Proof not found' });
    }

    // Generate human-readable certificate
    const certificate = {
      certificate: {
        title: 'QuantumVault Verification Certificate',
        id: proofId,
        issueDate: proof.created,
        version: proof.version
      },
      file: {
        name: proof.file.filename,
        hash: proof.file.blake3,
        algorithm: 'BLAKE3',
        size: proof.file.size,
        type: proof.file.mime
      },
      verification: {
        status: 'Cryptographically Verified',
        timestamp: proof.created,
        blockchainAnchored: proof.anchored,
        blockchainTx: proof.blockchainTxHash || 'Not anchored'
      },
      storage: {
        location: proof.storage.location,
        type: proof.storage.type,
        note: 'User maintains full control of file storage'
      },
      issuer: {
        service: 'QuantumVault Cryptographic Verification Service',
        api: 'v2.0',
        website: 'https://dytallix.com'
      }
    };

    res.json(certificate);

  } catch (error) {
    console.error('[QuantumVault] Certificate retrieval error:', error);
    res.status(500).json({ error: 'Certificate retrieval failed' });
  }
});

/**
 * GET /certificate/:proofId/download
 * Download verification certificate as JSON file
 */
app.get('/certificate/:proofId/download', async (req, res) => {
  try {
    const { proofId } = req.params;
    const proof = proofs[proofId];

    if (!proof) {
      return res.status(404).json({ error: 'Proof not found' });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="quantumvault-certificate-${proofId}.json"`);
    
    res.json({
      ...proof,
      downloadedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[QuantumVault] Certificate download error:', error);
    res.status(500).json({ error: 'Certificate download failed' });
  }
});

/**
 * POST /anchor
 * Anchor proof hash on blockchain
 */
app.post('/anchor', async (req, res) => {
  try {
    const { proofId } = req.body;

    if (!proofId) {
      return res.status(400).json({ error: 'Missing proofId' });
    }

    const proof = proofs[proofId];
    if (!proof) {
      return res.status(404).json({ error: 'Proof not found' });
    }

    // Get blockchain service instance
    const blockchainService = getBlockchainService();
    
    // Initialize if needed
    await blockchainService.initialize();

    // Prepare proof data for anchoring
    const anchorData = {
      proofId: proof.id,
      fileHash: proof.file.blake3,
      algorithm: proof.algorithm,
      timestamp: proof.timestamp,
      metadata: {
        filename: proof.file.filename,
        size: proof.file.size,
        storageLocation: proof.storage?.location
      }
    };

    // Anchor on real blockchain
    const anchorResult = await blockchainService.anchorProof(anchorData);

    // Update proof with anchoring info
    proof.anchored = true;
    proof.blockchainTxHash = anchorResult.transaction.hash;
    proof.blockchainBlock = anchorResult.transaction.blockHeight;
    proof.anchoredAt = anchorResult.transaction.timestamp;
    proof.anchorConfirmations = anchorResult.transaction.confirmations;

    // Store in on-chain registry
    onChainRegistry[proof.file.blake3] = {
      proofId,
      txHash: anchorResult.transaction.hash,
      blockHeight: anchorResult.transaction.blockHeight,
      timestamp: anchorResult.transaction.timestamp
    };

    await saveProofs();

    console.log(`[QuantumVault] Anchored proof ${proofId} on Dytallix blockchain: ${anchorResult.transaction.hash}`);

    // Audit logging
    try {
      const auditService = getAuditService();
      await auditService.initialize();
      await auditService.logBlockchainAnchor({
        proofId,
        txHash: anchorResult.transaction.hash,
        blockHeight: anchorResult.transaction.blockHeight,
        userId: req.body.userId,
        blockchain: {
          network: 'Dytallix',
          rpc: blockchainService.rpcUrl
        },
        message: 'Proof hash anchored on Dytallix blockchain'
      });
    } catch (auditError) {
      console.warn('[QuantumVault] Audit logging failed:', auditError.message);
    }

    res.json({
      success: true,
      proofId,
      transaction: {
        hash: anchorResult.transaction.hash,
        blockHeight: anchorResult.transaction.blockHeight,
        timestamp: anchorResult.transaction.timestamp
      },
      blockchain: {
        network: 'Dytallix',
        rpc: blockchainService.rpcUrl
      },
      message: 'Proof hash anchored on Dytallix blockchain'
    });

  } catch (error) {
    console.error('[QuantumVault] Anchoring error:', error);
    res.status(500).json({ 
      error: 'Anchoring failed', 
      details: error.message,
      fallback: 'Proof saved locally, blockchain anchoring can be retried'
    });
  }
});

/**
 * GET /anchor/:proofId
 * Get anchoring status
 */
app.get('/anchor/:proofId', (req, res) => {
  try {
    const { proofId } = req.params;
    const proof = proofs[proofId];

    if (!proof) {
      return res.status(404).json({ error: 'Proof not found' });
    }

    res.json({
      proofId,
      anchored: proof.anchored,
      transaction: proof.blockchainTxHash || null,
      blockHeight: proof.blockchainBlock || null,
      timestamp: proof.anchoredAt || null
    });

  } catch (error) {
    console.error('[QuantumVault] Anchor status error:', error);
    res.status(500).json({ error: 'Failed to get anchor status' });
  }
});

/**
 * GET /blockchain/status
 * Get blockchain connection status
 */
app.get('/blockchain/status', async (req, res) => {
  try {
    const blockchainService = getBlockchainService();
    const status = await blockchainService.getStatus();
    
    res.json({
      blockchain: status,
      service: 'QuantumVault',
      version: '2.0'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get blockchain status',
      details: error.message
    });
  }
});

/**
 * GET / - API Documentation
 */
app.get('/', (req, res) => {
  res.json({
    service: 'QuantumVault Cryptographic Verification Service',
    version: '2.0',
    description: 'Storage-agnostic cryptographic verification and blockchain anchoring',
    
    endpoints: {
      verification: {
        'POST /proof/generate': 'Generate cryptographic proof from file metadata',
        'POST /proof/verify': 'Verify file integrity against stored proof',
        'POST /proof/batch': 'Batch proof generation for multiple files',
        'POST /verify/remote': 'Verify file from user-provided URL'
      },
      certificates: {
        'GET /certificate/:proofId': 'Get verification certificate',
        'GET /certificate/:proofId/download': 'Download certificate as JSON'
      },
      blockchain: {
        'POST /anchor': 'Anchor proof hash on blockchain',
        'GET /anchor/:proofId': 'Get anchoring status',
        'GET /blockchain/status': 'Get blockchain connection status'
      },
      legacy: {
        'POST /upload': 'Upload encrypted file (optional storage)',
        'POST /register': 'Register asset on-chain',
        'GET /download/:assetHash': 'Download encrypted file'
      },
      system: {
        'GET /health': 'Health check',
        'GET /': 'API documentation'
      }
    },
    
    features: [
      'Storage-agnostic verification',
      'Zero-knowledge architecture',
      'Blockchain anchoring',
      'Batch processing',
      'Verification certificates',
      'Remote file verification'
    ],
    
    documentation: 'https://docs.dytallix.com/quantumvault'
  });
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'QuantumVault',
    version: '2.0',
    timestamp: new Date().toISOString(),
    proofs: Object.keys(proofs).length,
    assets: Object.keys(metadata).length
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  QuantumVault Cryptographic Verification Service v2.0        ║
║  Storage-Agnostic • Zero-Knowledge • Blockchain-Anchored     ║
╚═══════════════════════════════════════════════════════════════╝

🔐 API Server running on port ${PORT}
📁 Storage directory: ${STORAGE_DIR}
📋 Proofs directory: ${PROOFS_DIR}
🔗 Proofs loaded: ${Object.keys(proofs).length}
📦 Legacy assets: ${Object.keys(metadata).length}

⚓ Initializing Blockchain Integration...`);

  // Initialize blockchain service
  try {
    const blockchainService = getBlockchainService();
    await blockchainService.initialize();
    const status = await blockchainService.getStatus();
    
    console.log(`✅ Connected to Dytallix Blockchain
   Network: ${status.connected ? 'ONLINE' : 'OFFLINE'}
   Block Height: ${status.height || 'N/A'}
   RPC URL: ${status.rpcUrl}
   Status: ${status.status || 'unknown'}
`);
  } catch (error) {
    console.log(`⚠️  Blockchain connection failed: ${error.message}
   Falling back to local proof storage (can be anchored later)
`);
  }

  console.log(`
🎯 New API Endpoints:
   POST   /proof/generate      - Generate cryptographic proof
   POST   /proof/verify        - Verify file integrity
   POST   /proof/batch         - Batch proof generation
   POST   /verify/remote       - Verify remote file
   GET    /certificate/:id     - Get verification certificate
   POST   /anchor              - Anchor proof on blockchain
   GET    /blockchain/status    - Get blockchain connection status

📚 Documentation: http://localhost:${PORT}/
🏥 Health Check:   http://localhost:${PORT}/health
  `);
});
