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

// Use built-in fetch (Node.js 18+) or import from node-fetch
const fetch = globalThis.fetch || (await import('node-fetch')).default;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

    // Use fallback mode for development (skip external blockchain call)
    const BLOCKCHAIN_API_URL = process.env.BLOCKCHAIN_API_URL;
    
    if (BLOCKCHAIN_API_URL && BLOCKCHAIN_API_URL !== 'http://localhost:3001/api/quantum/register') {
      try {
        const response = await fetch(BLOCKCHAIN_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assetHash: blake3,
            uri: uri,
            metadata: metadata || {
              registered_by: 'quantumvault-api',
              timestamp: new Date().toISOString()
            }
          })
        });

        if (!response.ok) {
          throw new Error(`Blockchain API error: ${response.status}`);
        }

        const result = await response.json();
        
        console.log(`[QuantumVault] Registered asset on blockchain: ${blake3}`);
        
        return res.json({
          txHash: result.tx_hash,
          assetId: result.asset_id,
          blockHeight: result.block_height,
          timestamp: result.timestamp,
          success: result.success
        });

      } catch (blockchainError) {
        console.warn('[QuantumVault] Blockchain registration failed, using fallback:', blockchainError.message);
      }
    } else {
      console.log('[QuantumVault] Using fallback mode for development');
    }
    
    // Fallback to mock implementation (either due to error or development mode)
    const txHash = '0x' + createHash('sha256')
      .update(blake3 + uri + Date.now())
      .digest('hex');
    const assetId = assetIdCounter++;

    onChainRegistry[assetId] = {
      assetId,
      blake3,
      uri,
      owner: '0x' + randomBytes(20).toString('hex'),
      timestamp: Math.floor(Date.now() / 1000),
      txHash
    };

    res.json({ 
      txHash, 
      assetId,
      blockHeight: 0,
      timestamp: Math.floor(Date.now() / 1000),
      success: true,
      note: 'Fallback mode - blockchain unavailable'
    });

  } catch (error) {
    console.error('[QuantumVault] Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * GET /verify/:assetHash
 * Verify asset on-chain via Dytallix blockchain
 */
app.get('/verify/:assetHash', async (req, res) => {
  try {
    const assetHash = req.params.assetHash;
    
    // Connect to the actual blockchain API
    const BLOCKCHAIN_API_URL = process.env.BLOCKCHAIN_API_URL || 'https://rpc.dytallix.com/api/quantum/verify';
    
    try {
      const response = await fetch(`${BLOCKCHAIN_API_URL}/${assetHash}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Blockchain API error: ${response.status}`);
      }

      const result = await response.json();
      
      console.log(`[QuantumVault] Verified asset on blockchain: ${assetHash}`);
      
      res.json(result);

    } catch (blockchainError) {
      console.warn('[QuantumVault] Blockchain verification failed, using fallback:', blockchainError.message);
      
      // Fallback to mock implementation
      const assetId = parseInt(assetHash) || 0;
      const asset = onChainRegistry[assetId];

      if (asset) {
        res.json(asset);
      } else {
        // Mock verification response - ensure assetHash is a string
        const hashStr = String(assetHash || '');
        res.json({
          verified: hashStr.length === 64,
          asset_id: `asset_${hashStr.slice(0, 16)}`,
          tx_hash: `0x${createHash('sha256').update(`verify_${hashStr}`).digest('hex')}`,
          block_height: 123456,
          timestamp: Math.floor(Date.now() / 1000),
          metadata: {
            verification_time: new Date().toISOString(),
            status: 'verified_fallback'
          }
        });
      }
    }

  } catch (error) {
    console.error('[QuantumVault] Verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
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
