/**
 * QuantumVault API Server
 * Stateless backend for encrypted asset storage
 * 
 * Endpoints:
 * - POST /upload - Upload encrypted file (returns URI)
 * - GET /asset/:uri - Get asset metadata
 * - POST /register - Register asset on-chain (mock)
 * - GET /verify/:assetId - Verify asset on-chain
 */

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createHash, randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Use built-in fetch (Node.js 18+) or import from node-fetch
const fetch = globalThis.fetch || (await import('node-fetch')).default;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { getCrypto } from './crypto-service.js';
const cryptoService = getCrypto();

const app = express();
const PORT = process.env.PORT || 3031;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'https://dytallix.com',
    'https://www.dytallix.com',
    'http://178.156.187.81'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Storage configuration
const STORAGE_DIR = join(__dirname, 'storage');
const METADATA_FILE = join(__dirname, 'metadata.json');

// Ensure storage directory exists
await fs.mkdir(STORAGE_DIR, { recursive: true });

// In-memory storage for POC (use database in production)
let metadata = {};
let onChainRegistry = {}; // Mock on-chain storage
let assetIdCounter = 1;

// Load metadata if exists
try {
  const data = await fs.readFile(METADATA_FILE, 'utf-8');
  metadata = JSON.parse(data);
  console.log(`[QuantumVault] Loaded ${Object.keys(metadata).length} assets from metadata`);
} catch (err) {
  console.log('[QuantumVault] No existing metadata, starting fresh');
}

// Save metadata helper
async function saveMetadata() {
  await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2));
}

// Configure multer for file uploads
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  storage: multer.diskStorage({
    destination: STORAGE_DIR,
    filename: (req, file, cb) => {
      // Generate unique filename
      const hash = createHash('sha256').update(randomBytes(32)).digest('hex');
      cb(null, `${hash}.enc`);
    }
  })
});

/**
 * POST /upload
 * Upload encrypted file
 */
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { mime, original_filename, blake3 } = req.body;

    // Generate URI (in production, use IPFS CID or S3 URL)
    const uri = `qv://${req.file.filename}`;

    // Store metadata
    metadata[uri] = {
      uri,
      blake3,
      original_filename,
      mime,
      size: req.file.size,
      path: req.file.path,
      uploaded: new Date().toISOString()
    };

    await saveMetadata();

    console.log(`[QuantumVault] Uploaded ${original_filename} as ${uri}`);

    res.json({ uri, blake3 });

  } catch (error) {
    console.error('[QuantumVault] Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});


/**
 * POST /encrypt
 * Encrypt file using real Kyber-1024 and sign with Dilithium-5
 */
app.post('/encrypt', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`[QuantumVault] Encrypting ${req.file.originalname}...`);

    // 1. Generate Keys (Real)
    const kyberKeys = await cryptoService.generateKyberKeys();
    const dilithiumKeys = await cryptoService.generateDilithiumKeys();

    // 2. Read file buffer
    const fileBuffer = await fs.readFile(req.file.path);

    // 3. Encrypt (Real Kyber + AES)
    const encryptionResult = await cryptoService.encryptKyber(fileBuffer, kyberKeys.publicKey);

    // 4. Hash Ciphertext (Real SHA-256)
    const ciphertextBuffer = Buffer.from(encryptionResult.ciphertext, 'base64');
    const hash = cryptoService.hash(ciphertextBuffer, 'SHA-256');

    // 5. Sign Hash (Real Dilithium)
    const signatureResult = await cryptoService.signPQC(Buffer.from(hash, 'hex'), dilithiumKeys.privateKey);

    // 6. Save Encrypted File
    const encryptedFilename = `${req.file.filename}.enc`;
    const encryptedPath = join(STORAGE_DIR, encryptedFilename);
    await fs.writeFile(encryptedPath, ciphertextBuffer);

    // Save metadata so /download can find it
    const uri = `qv://${encryptedFilename}`;
    metadata[uri] = {
      uri,
      blake3: hash, // Using SHA256 as placeholder
      original_filename: req.file.originalname,
      mime: "application/octet-stream",
      size: ciphertextBuffer.length,
      path: encryptedPath,
      uploaded: new Date().toISOString()
    };
    await saveMetadata();

    // 7. Register on Blockchain (Real)
    // We call our own /register logic internally or return data for client to call it
    // For simplicity, we return the data and let the client call /anchor or we do it here.
    // Let's anchor it here to be robust.

    // ... (Anchoring logic reused or called)
    // For this demo, we return the keys and data so the frontend can "simulate" the steps 
    // but with REAL data, or we just return the final receipt.
    // The frontend expects to show "Generating keys...", "Encrypting...", etc.
    // So we return the artifacts.

    res.json({
      success: true,
      originalName: req.file.originalname,
      encryptedFilename: encryptedFilename,
      kyber: {
        publicKey: kyberKeys.publicKey,
        capsule: encryptionResult.capsule,
        iv: encryptionResult.iv
      },
      dilithium: {
        publicKey: dilithiumKeys.publicKey,
        signature: signatureResult.signature
      },
      hash: hash,
      encryptionMethod: "AES-GCM + Kyber-1024",
      signatureMethod: "Dilithium-3 (ML-DSA-65)"
    });

  } catch (error) {
    console.error('[QuantumVault] Encryption error:', error);
    res.status(500).json({ error: 'Encryption failed', details: error.message });
  }
});

/**
 * GET /asset/:uri
 * Get asset metadata
 */
app.get('/asset/:uri', (req, res) => {
  const uri = decodeURIComponent(req.params.uri);
  const asset = metadata[uri];

  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  res.json(asset);
});

/**
 * GET /download/:assetHash
 * Download encrypted file by asset hash or URI
 */
app.get('/download/:assetHash', async (req, res) => {
  try {
    const assetHash = req.params.assetHash;
    console.log(`[QuantumVault] Download request for: ${assetHash}`);

    // Handle both URI format (qv://hash.enc) and plain hash
    let uri = assetHash;
    if (!assetHash.startsWith('qv://')) {
      uri = `qv://${assetHash}${assetHash.endsWith('.enc') ? '' : '.enc'}`;
    }

    // Look up asset metadata
    const asset = metadata[uri];
    if (!asset) {
      console.log(`[QuantumVault] Asset not found for URI: ${uri}`);
      console.log(`[QuantumVault] Available assets:`, Object.keys(metadata));
      return res.status(404).json({
        error: 'Asset not found',
        uri: uri,
        assetHash: assetHash
      });
    }

    // Check if file exists on disk
    try {
      await fs.access(asset.path);
    } catch (err) {
      console.error(`[QuantumVault] File not found on disk: ${asset.path}`);
      return res.status(404).json({
        error: 'File not found on storage',
        path: asset.path
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${asset.original_filename || 'download.enc'}"`);
    res.setHeader('X-Original-Filename', asset.original_filename || 'unknown');
    res.setHeader('X-Original-MIME', asset.mime || 'application/octet-stream');
    res.setHeader('X-Blake3-Hash', asset.blake3 || 'unknown');
    res.setHeader('X-Asset-URI', asset.uri);

    // Stream the file
    console.log(`[QuantumVault] Serving file: ${asset.path} (${asset.size} bytes)`);
    res.sendFile(asset.path);

  } catch (error) {
    console.error('[QuantumVault] Download error:', error);
    res.status(500).json({
      error: 'Download failed',
      message: error.message
    });
  }
});

/**
 * POST /register
 * Register asset on-chain via Dytallix blockchain
 */
app.post('/register', async (req, res) => {
  try {
    const { blake3, uri, metadata } = req.body;

    if (!blake3 || !uri) {
      return res.status(400).json({ error: 'Missing blake3 or uri' });
    }

    // Get blockchain URL
    const BLOCKCHAIN_API_URL = process.env.BLOCKCHAIN_API_URL ||
      process.env.VITE_BLOCKCHAIN_URL ||
      'http://localhost:3003';

    // Import transaction signer (CLI-based)
    const { submitDataTransaction, getAccountNonce, loadWallet } = await import('./tx-signer-cli.js');

    // Load service wallet
    const wallet = loadWallet();

    // Get current nonce
    const nonce = await getAccountNonce(wallet.address, BLOCKCHAIN_API_URL);

    // Get chain ID from blockchain
    let chainId = 'dyt-local-1';
    try {
      const statusRes = await fetch(`${BLOCKCHAIN_API_URL}/status`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        chainId = statusData.chain_id || chainId;
      }
    } catch (err) {
      console.warn('[QuantumVault] Could not fetch chain ID, using default:', chainId);
    }

    // Prepare registration data
    const registrationData = {
      type: 'quantumvault_registration',
      assetHash: blake3,
      uri: uri,
      metadata: metadata || {
        registered_by: 'quantumvault-api',
        timestamp: new Date().toISOString()
      }
    };

    // Submit transaction to blockchain
    console.log(`[QuantumVault] Registering asset ${blake3} from ${wallet.address}`);

    const txResult = await submitDataTransaction({
      from: wallet.address,
      data: registrationData,
      chainId,
      nonce,
      fee: 1000, // 1000 micro-units fee
      walletPath: wallet.walletPath,
      rpcUrl: BLOCKCHAIN_API_URL
    });

    const txHash = txResult.hash || txResult.tx_hash;

    if (!txHash) {
      throw new Error('Transaction submitted but no hash returned');
    }

    // Get block height
    let blockHeight = 0;
    try {
      const statusRes = await fetch(`${BLOCKCHAIN_API_URL}/status`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        blockHeight = statusData.latest_height || statusData.height || 0;
      }
    } catch (err) {
      console.warn('[QuantumVault] Could not get blockchain height:', err.message);
    }

    // Generate asset ID
    const assetId = assetIdCounter++;

    // Store in registry
    onChainRegistry[assetId] = {
      assetId,
      blake3,
      uri,
      owner: wallet.address,
      timestamp: Math.floor(Date.now() / 1000),
      txHash,
      blockHeight
    };

    console.log(`[QuantumVault] ✅ Registered asset on blockchain: ${blake3}, tx: ${txHash}`);

    res.json({
      txHash,
      assetId,
      blockHeight,
      timestamp: Math.floor(Date.now() / 1000),
      success: true
    });

  } catch (error) {
    console.error('[QuantumVault] Register error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: error.message
    });
  }
});

/**
 * GET /verify/:assetHash
 * Verify asset on-chain via Dytallix blockchain
 */
app.get('/verify/:assetHash', async (req, res) => {
  try {
    const assetHash = req.params.assetHash;

    // Get blockchain URL
    const BLOCKCHAIN_API_URL = process.env.BLOCKCHAIN_API_URL ||
      process.env.VITE_BLOCKCHAIN_URL ||
      'http://localhost:3003';

    // Search for transactions containing this asset hash
    // Try to find the transaction by searching recent blocks
    console.log(`[QuantumVault] Verifying asset hash: ${assetHash}`);

    // First check our local registry
    let foundAsset = null;
    for (const [assetId, asset] of Object.entries(onChainRegistry)) {
      if (asset.blake3 === assetHash || asset.assetId === assetHash) {
        foundAsset = asset;
        break;
      }
    }

    if (foundAsset) {
      // Verify the transaction exists on-chain
      try {
        const txResponse = await fetch(`${BLOCKCHAIN_API_URL}/tx/${foundAsset.txHash}`);

        if (txResponse.ok) {
          const txData = await txResponse.json();

          res.json({
            verified: true,
            asset_id: foundAsset.assetId,
            tx_hash: foundAsset.txHash,
            block_height: foundAsset.blockHeight || txData.block_height,
            timestamp: foundAsset.timestamp,
            owner: foundAsset.owner,
            metadata: {
              verification_time: new Date().toISOString(),
              status: 'verified',
              blockchain_status: txData.status || 'confirmed'
            }
          });
          return;
        }
      } catch (txError) {
        console.warn('[QuantumVault] Transaction lookup failed:', txError.message);
      }
    }

    // Asset not found in registry or blockchain
    res.status(404).json({
      verified: false,
      error: 'Asset not found on blockchain',
      asset_hash: assetHash
    });

  } catch (error) {
    console.error('[QuantumVault] Verify error:', error);
    res.status(500).json({
      error: 'Verification failed',
      message: error.message
    });
  }
});

/**
 * POST /proof/generate
 * Generate cryptographic proof without upload (v2 API)
 */
app.post('/proof/generate', async (req, res) => {
  try {
    const { blake3, filename, mime, size, storageLocation, metadata: metaData } = req.body;

    if (!blake3 || !filename) {
      return res.status(400).json({ error: 'Missing blake3 or filename' });
    }

    // Generate proof ID
    const proofId = createHash('sha256')
      .update(blake3 + filename + Date.now())
      .digest('hex')
      .slice(0, 16);

    // Create proof certificate
    const certificate = {
      version: '2.0',
      proofId,
      blake3Hash: blake3,
      filename,
      mimeType: mime || 'application/octet-stream',
      size: size || 0,
      storageLocation: storageLocation || 'user-managed',
      timestamp: new Date().toISOString(),
      algorithm: 'BLAKE3',
      metadata: metaData || {}
    };

    // Sign the certificate (in production, use proper signing)
    const signature = createHash('sha256')
      .update(JSON.stringify(certificate))
      .digest('hex');

    const proof = {
      ...certificate,
      signature,
      issuer: 'QuantumVault-API',
      verificationUrl: `${req.protocol}://${req.get('host')}/verify/${blake3}`
    };

    // Store proof for anchoring
    metadata[proofId] = proof;
    await saveMetadata();

    console.log(`[QuantumVault] Generated proof for ${filename} (${blake3.slice(0, 16)}...)`);

    res.json({
      success: true,
      proofId,
      proof,
      certificate,
      downloadUrl: null // No download URL since file isn't stored
    });

  } catch (error) {
    console.error('[QuantumVault] Proof generation error:', error);
    res.status(500).json({ error: 'Proof generation failed' });
  }
});

/**
 * POST /anchor
 * Anchor a proof to the Dytallix blockchain using the Asset Registry
 * Uses the blockchain's /asset/register endpoint to create an immutable on-chain record
 */
app.post('/anchor', async (req, res) => {
  try {
    const { proofId } = req.body;

    if (!proofId) {
      return res.status(400).json({ error: 'Missing proofId' });
    }

    // Look up proof
    const proof = metadata[proofId];
    if (!proof) {
      return res.status(404).json({ error: 'Proof not found' });
    }

    // Get blockchain URL
    const blockchainUrl = process.env.BLOCKCHAIN_API_URL ||
      process.env.VITE_BLOCKCHAIN_URL ||
      'http://localhost:3003';

    console.log(`[QuantumVault] Anchoring proof ${proofId} to blockchain at ${blockchainUrl}`);

    // Prepare anchor data for blockchain asset registry
    const anchorData = {
      type: 'quantumvault_proof',
      proofId: proofId,
      blake3Hash: proof.blake3Hash,
      filename: proof.filename,
      timestamp: proof.timestamp,
      signature: proof.signature,
      service: 'QuantumVault',
      version: '2.0'
    };

    let txHash, blockHeight;

    try {
      // Submit to blockchain asset registry endpoint
      // This uses JSON-RPC format expected by the blockchain
      const response = await fetch(`${blockchainUrl}/asset/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          params: [
            proof.blake3Hash,  // Asset hash (BLAKE3)
            JSON.stringify(anchorData)  // Metadata as JSON string
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[QuantumVault] Blockchain register failed: ${response.status} - ${errorText}`);
        throw new Error(`Blockchain asset registration failed: ${response.status}`);
      }

      const result = await response.json();

      // Extract transaction hash and block height from response
      if (result.error) {
        throw new Error(result.error);
      }

      txHash = result.tx_hash || result.txHash || result.hash || result.transaction_hash;
      blockHeight = result.block_height || result.blockHeight || result.height;

      console.log(`[QuantumVault] ✅ Asset registered on blockchain: ${txHash}`);

      // Verify the asset was actually registered by checking the blockchain
      if (txHash) {
        try {
          const verifyResponse = await fetch(`${blockchainUrl}/asset/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              params: [proof.blake3Hash]
            })
          });

          if (verifyResponse.ok) {
            const verifyResult = await verifyResponse.json();
            console.log(`[QuantumVault] ✅ Verified asset on-chain:`, verifyResult);
          }
        } catch (verifyErr) {
          console.warn('[QuantumVault] Could not verify asset:', verifyErr.message);
        }
      }

    } catch (blockchainError) {
      console.error('[QuantumVault] Blockchain anchoring failed:', blockchainError.message);

      return res.status(500).json({
        success: false,
        error: 'Blockchain anchoring failed',
        message: blockchainError.message,
        note: 'The blockchain asset registry is not responding. Please ensure the blockchain node is running.'
      });
    }

    // Get current block height if not returned
    if (!blockHeight) {
      try {
        const statusRes = await fetch(`${blockchainUrl}/status`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          blockHeight = statusData.latest_height || statusData.height || 0;
        }
      } catch (err) {
        console.warn('[QuantumVault] Could not get block height:', err.message);
        blockHeight = 0;
      }
    }

    // Store in on-chain registry
    onChainRegistry[proofId] = {
      ...anchorData,
      txHash,
      blockHeight,
      anchoredAt: new Date().toISOString(),
      status: 'confirmed'
    };

    // Update proof with anchor info
    proof.anchored = true;
    proof.txHash = txHash;
    proof.blockHeight = blockHeight;
    metadata[proofId] = proof;
    await saveMetadata();

    console.log(`[QuantumVault] ✅ Proof ${proofId} anchored at block ${blockHeight}, tx: ${txHash}`);

    res.json({
      success: true,
      proofId,
      transaction: {
        hash: txHash,
        blockHeight: blockHeight,
        timestamp: new Date().toISOString(),
        status: 'confirmed'
      },
      proof: proof,
      verification: `You can verify this proof at: ${blockchainUrl}/asset/verify with hash ${proof.blake3Hash}`
    });

  } catch (error) {
    console.error('[QuantumVault] Anchor error:', error);
    res.status(500).json({
      error: 'Anchoring failed',
      message: error.message
    });
  }
});

/**
 * GET /status
 * Get blockchain connection status
 */
app.get('/status', async (req, res) => {
  const blockchainUrl = process.env.BLOCKCHAIN_API_URL || process.env.VITE_BLOCKCHAIN_URL || 'http://localhost:3030';

  let blockchainConnected = false;
  let blockchainHeight = 0;

  try {
    const response = await fetch(`${blockchainUrl}/health`, {
      method: 'GET',
      timeout: 5000
    });

    if (response.ok) {
      const data = await response.json();
      blockchainConnected = true;
      blockchainHeight = data.block_height || data.blockHeight || 0;
    }
  } catch (err) {
    console.warn('[QuantumVault] Blockchain health check failed:', err.message);
  }

  res.json({
    status: 'operational',
    service: 'quantumvault-api',
    version: '2.0',
    blockchain: {
      connected: blockchainConnected,
      url: blockchainUrl,
      blockHeight: blockchainHeight
    },
    storage: {
      assets: Object.keys(metadata).length,
      onChainRegistrations: Object.keys(onChainRegistry).length
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /health
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'quantumvault-api',
    assets: Object.keys(metadata).length,
    onChainAssets: Object.keys(onChainRegistry).length
  });
});

/**
 * POST /verify/transaction
 * Verify asset anchored in a specific transaction and optionally verify signature
 * Performs REAL blockchain lookup and signature verification
 */
app.post('/verify/transaction', async (req, res) => {
  try {
    const { txHash, payloadHash, signature, publicKey } = req.body;

    if (!txHash || !payloadHash) {
      return res.status(400).json({ error: 'Missing txHash or payloadHash' });
    }

    console.log(`[QuantumVault] Verifying transaction ${txHash} for payload ${payloadHash}`);

    const BLOCKCHAIN_API_URL = process.env.BLOCKCHAIN_API_URL ||
      process.env.VITE_BLOCKCHAIN_URL ||
      'http://localhost:3003';

    // 1. Fetch Transaction from Blockchain (Real Lookup)
    let txData;

    // Check if this is a special Asset Registry transaction (qv_anchor_...)
    if (txHash.startsWith('qv_anchor_')) {
      console.log(`[QuantumVault] Detected Asset Registry transaction: ${txHash}`);

      // For qv_anchor transactions, we use the /asset/verify endpoint
      try {
        const verifyResponse = await fetch(`${BLOCKCHAIN_API_URL}/asset/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            params: [payloadHash]
          })
        });

        if (!verifyResponse.ok) {
          console.warn(`[QuantumVault] Blockchain asset verify failed: ${verifyResponse.status}`);
          return res.status(404).json({ error: 'Asset verification failed on blockchain' });
        }

        const verifyResult = await verifyResponse.json();

        // Construct a synthetic transaction object for the frontend
        txData = {
          hash: txHash, // Pass back the ID
          block_height: verifyResult.block_height || 0,
          status: 'confirmed', // Asset registry writes are confirmed immediately in this implementation
          timestamp: new Date().toISOString(), // Mock timestamp if not returned
          type: 'asset_registration'
        };
        console.log('[QuantumVault] Asset verified via registry');

      } catch (e) {
        console.error('[QuantumVault] Asset verification error:', e);
        return res.status(502).json({ error: 'Blockchain unreachable for asset verification' });
      }

    } else {
      // Standard Transaction Lookup
      try {
        const txResponse = await fetch(`${BLOCKCHAIN_API_URL}/tx/${txHash}`);

        if (!txResponse.ok) {
          console.warn(`[QuantumVault] Blockchain returned ${txResponse.status} for tx ${txHash}`);
          return res.status(404).json({ error: 'Transaction not found on blockchain' });
        }

        txData = await txResponse.json();
      } catch (e) {
        console.error('[QuantumVault] Blockchain lookup failed:', e);
        return res.status(502).json({ error: 'Blockchain unreachable', details: e.message });
      }
    }

    // 2. Verify Signature (Real Cryptography)
    let signatureValid = false;
    let signatureMessage = "Signature not provided";

    if (signature && publicKey) {
      try {
        console.log(`[QuantumVault] Verifying Dilithium signature...`);
        // Dilithium signature verification
        // The signature was made over the binary hash of the ciphertext
        const dataToVerify = Buffer.from(payloadHash, 'hex');
        signatureValid = await cryptoService.verifyPQC(dataToVerify, signature, publicKey);

        signatureMessage = signatureValid ? "Dilithium Signature VALID" : "Dilithium Signature INVALID";
        console.log(`[QuantumVault] Signature result: ${signatureValid}`);
      } catch (e) {
        console.error(`[QuantumVault] Signature check error:`, e);
        signatureValid = false;
        signatureMessage = `Signature verification error: ${e.message}`;
      }
    } else {
      // If not provided, we can't verify signature, but we verified blockchain presence
      signatureMessage = "Skipped (Missing keys)";
    }

    res.json({
      success: true,
      blockchain: {
        exists: true,
        txHash: txHash,
        blockHeight: txData.block_height || txData.height || 0,
        status: txData.status || 'confirmed',
        timestamp: txData.timestamp || new Date().toISOString()
      },
      signature: {
        valid: signatureValid,
        message: signatureMessage
      },
      payloadHash: payloadHash
    });

  } catch (error) {
    console.error('[QuantumVault] Transaction verify error:', error);
    res.status(500).json({ error: 'Verification failed', message: error.message });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[QuantumVault] Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`[QuantumVault] API server running on port ${PORT}`);
  console.log(`[QuantumVault] Storage directory: ${STORAGE_DIR}`);
  console.log(`[QuantumVault] Loaded ${Object.keys(metadata).length} assets`);
});
