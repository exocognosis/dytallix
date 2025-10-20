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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3031;

// Middleware
app.use(cors());
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
 * POST /register
 * Register asset on-chain (mock)
 */
app.post('/register', async (req, res) => {
  try {
    const { blake3, uri } = req.body;

    if (!blake3 || !uri) {
      return res.status(400).json({ error: 'Missing blake3 or uri' });
    }

    // Generate mock transaction hash
    const txHash = '0x' + createHash('sha256')
      .update(blake3 + uri + Date.now())
      .digest('hex');

    // Generate asset ID
    const assetId = assetIdCounter++;

    // Store in mock registry
    onChainRegistry[assetId] = {
      assetId,
      blake3,
      uri,
      owner: '0x' + randomBytes(20).toString('hex'),
      timestamp: Math.floor(Date.now() / 1000),
      txHash
    };

    console.log(`[QuantumVault] Registered asset ${assetId}: ${blake3}`);

    res.json({ txHash, assetId });

  } catch (error) {
    console.error('[QuantumVault] Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * GET /verify/:assetId
 * Verify asset on-chain
 */
app.get('/verify/:assetId', (req, res) => {
  const assetId = parseInt(req.params.assetId);
  const asset = onChainRegistry[assetId];

  if (!asset) {
    return res.status(404).json({ error: 'Asset not found on-chain' });
  }

  res.json(asset);
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
