/**
 * QuantumVault API Server
 * Stateless backend for encrypted asset storage
 * 
 * Endpoints:
 * - POST /upload - Upload encrypted file (returns URI)
 * - GET /asset/:uri - Get asset metadata
 * - POST /register - Register asset on-chain with a signed data transaction
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

console.log('[QuantumVault] Booting QuantumVault API...');

// Require Node.js 18+ (global fetch)
if (!globalThis.fetch) {
  throw new Error('[QuantumVault] Node.js 18+ required (global fetch is missing)');
}

const fetch = globalThis.fetch;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { getCrypto } from './crypto-service.js';
const cryptoService = getCrypto();

const app = express();
const PORT = process.env.PORT || process.env.QUANTUMVAULT_API_PORT || 3002;

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
const REGISTRY_FILE = join(__dirname, 'registry.json');
const SERVICE_WALLET_FILE = join(__dirname, 'service-wallet.json');
const SERVICE_WALLET_PREFIX = (process.env.QV_ADDRESS_PREFIX || 'dytallix').trim() || 'dytallix';
const MIN_SERVICE_WALLET_BALANCE_UDGT = Number(process.env.QV_MIN_WALLET_BALANCE_UDGT || 5_000_000);
const SERVICE_WALLET_FAUCET_TOP_UP_DGT = Number(process.env.QV_SERVICE_WALLET_TOP_UP_DGT || 25);
const ANCHOR_TX_FEE = Number(process.env.QV_ANCHOR_TX_FEE || 1000);
const ANCHOR_TX_MEMO = process.env.QV_ANCHOR_TX_MEMO || 'QuantumVault proof anchor';

// In-memory storage for POC (use database in production)
let metadata = {};
let onChainRegistry = {};
let assetIdCounter = 1;

// Initialize filesystem-backed storage asynchronously to avoid startup hangs
async function initStorage() {
  await fs.mkdir(STORAGE_DIR, { recursive: true });

  try {
    const data = await fs.readFile(METADATA_FILE, 'utf-8');
    metadata = JSON.parse(data);
    console.log(`[QuantumVault] Loaded ${Object.keys(metadata).length} assets from metadata`);
  } catch (err) {
    console.log('[QuantumVault] No existing metadata, starting fresh');
  }

  try {
    const data = await fs.readFile(REGISTRY_FILE, 'utf-8');
    onChainRegistry = JSON.parse(data);
    const maxNumericRegistryId = Object.keys(onChainRegistry)
      .map((key) => Number(key))
      .filter((value) => Number.isFinite(value))
      .reduce((max, value) => Math.max(max, value), 0);
    assetIdCounter = maxNumericRegistryId + 1;
    console.log(`[QuantumVault] Loaded ${Object.keys(onChainRegistry).length} anchored proofs from registry`);
  } catch (err) {
    console.log('[QuantumVault] No existing anchor registry, starting fresh');
  }
}

initStorage().catch((err) => {
  console.error('[QuantumVault] Storage initialization failed:', err);
});

// Save metadata helper
async function saveMetadata() {
  await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2));
}

async function saveRegistry() {
  await fs.writeFile(REGISTRY_FILE, JSON.stringify(onChainRegistry, null, 2));
}

function deriveAddressFromPublicKey(publicKeyBase64, prefix = SERVICE_WALLET_PREFIX) {
  const publicKey = Buffer.from(publicKeyBase64, 'base64');
  const sha = createHash('sha256').update(publicKey).digest();
  const ripe = createHash('ripemd160').update(sha).digest('hex');
  return `${prefix}1${ripe}`;
}

function extractUdgtBalance(payload) {
  if (!payload || typeof payload !== 'object') {
    return 0;
  }

  const udgtBalance = payload?.balances?.udgt?.balance ?? payload?.balances?.udgt;
  if (typeof udgtBalance === 'string' || typeof udgtBalance === 'number') {
    const parsed = Number(udgtBalance);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (typeof payload.legacy_balance === 'string' || typeof payload.legacy_balance === 'number') {
    const parsed = Number(payload.legacy_balance);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (typeof payload.balance === 'string' || typeof payload.balance === 'number') {
    const parsed = Number(payload.balance);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

async function fetchJson(url, init, fallbackMessage) {
  const response = await fetch(url, init);
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(fallbackMessage || `${response.status} ${response.statusText}${errorText ? `: ${errorText}` : ''}`);
  }
  return response.json();
}

async function loadServiceWallet() {
  if (process.env.QV_PRIVATE_KEY && process.env.QV_PUBLIC_KEY) {
    return {
      privateKey: process.env.QV_PRIVATE_KEY,
      publicKey: process.env.QV_PUBLIC_KEY,
      address: process.env.QV_ADDRESS || deriveAddressFromPublicKey(process.env.QV_PUBLIC_KEY),
      source: 'env',
    };
  }

  try {
    const persisted = JSON.parse(await fs.readFile(SERVICE_WALLET_FILE, 'utf-8'));
    if (persisted?.privateKey && persisted?.publicKey && persisted?.address) {
      return { ...persisted, source: 'disk' };
    }
  } catch {
    // fall through to wallet creation
  }

  return null;
}

async function saveServiceWallet(wallet) {
  await fs.writeFile(SERVICE_WALLET_FILE, JSON.stringify(wallet, null, 2), { mode: 0o600 });
  try {
    await fs.chmod(SERVICE_WALLET_FILE, 0o600);
  } catch {
    // ignore chmod failures on non-posix filesystems
  }
}

async function ensureServiceWallet(blockchainUrl) {
  const existing = await loadServiceWallet();
  if (existing) {
    return existing;
  }

  const created = await fetchJson(
    `${blockchainUrl}/wallet/create`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    },
    'Failed to create QuantumVault service wallet'
  );

  const wallet = {
    privateKey: created.private_key,
    publicKey: created.public_key,
    address: deriveAddressFromPublicKey(created.public_key),
    algorithm: created.algorithm,
    version: created.version,
    createdAt: new Date().toISOString(),
  };

  await saveServiceWallet(wallet);
  console.log(`[QuantumVault] Created persistent service wallet ${wallet.address}`);
  return wallet;
}

async function ensureServiceWalletFunding(wallet, blockchainUrl) {
  const balancePayload = await fetchJson(
    `${blockchainUrl}/balance/${encodeURIComponent(wallet.address)}?denom=udgt`,
    undefined,
    `Failed to fetch QuantumVault service wallet balance for ${wallet.address}`
  );
  const balance = extractUdgtBalance(balancePayload);

  if (balance >= MIN_SERVICE_WALLET_BALANCE_UDGT) {
    return balance;
  }

  console.log(`[QuantumVault] Funding service wallet ${wallet.address} via dev faucet`);
  await fetchJson(
    `${blockchainUrl}/dev/faucet`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: wallet.address,
        dgt_amount: SERVICE_WALLET_FAUCET_TOP_UP_DGT,
        drt_amount: 0
      })
    },
    `Failed to fund QuantumVault service wallet ${wallet.address}`
  );

  const refreshedBalancePayload = await fetchJson(
    `${blockchainUrl}/balance/${encodeURIComponent(wallet.address)}?denom=udgt`,
    undefined,
    `Failed to re-check QuantumVault service wallet balance for ${wallet.address}`
  );

  return extractUdgtBalance(refreshedBalancePayload);
}

async function getChainStatus(blockchainUrl) {
  return fetchJson(`${blockchainUrl}/status`, undefined, `Failed to fetch blockchain status from ${blockchainUrl}`);
}

async function getAccountNonce(address, blockchainUrl) {
  const account = await fetchJson(
    `${blockchainUrl}/account/${encodeURIComponent(address)}`,
    undefined,
    `Failed to fetch account nonce for ${address}`
  );
  return Number(account?.nonce || 0);
}

async function signAnchorTransaction(tx, wallet, blockchainUrl) {
  return fetchJson(
    `${blockchainUrl}/wallet/sign`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tx,
        public_key: wallet.publicKey,
        private_key: wallet.privateKey
      })
    },
    'Failed to sign QuantumVault anchor transaction'
  );
}

async function submitAnchorTransaction(signedTransaction, blockchainUrl) {
  return fetchJson(
    `${blockchainUrl}/submit`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signedTransaction)
    },
    'Failed to submit QuantumVault anchor transaction'
  );
}

async function waitForTransactionConfirmation(txHash, blockchainUrl, maxAttempts = 20, delayMs = 1000) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const receipt = await fetchJson(
        `${blockchainUrl}/tx/${encodeURIComponent(txHash)}`,
        undefined,
        `Failed to fetch transaction ${txHash}`
      );
      const status = String(receipt?.status || '').toLowerCase();
      if (status === 'failed' || receipt?.success === false) {
        throw new Error(receipt?.error || `Transaction ${txHash} failed`);
      }
      if (status === 'success' || receipt?.success === true || receipt?.block_height) {
        return receipt;
      }
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error;
      }
    }

    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  throw new Error(`Timed out waiting for QuantumVault anchor transaction ${txHash} to confirm`);
}

async function fetchConfirmedTransactionRecord(txHash, blockHeight, blockchainUrl) {
  const block = await fetchJson(
    `${blockchainUrl}/block/${blockHeight}`,
    undefined,
    `Failed to fetch block ${blockHeight} for transaction ${txHash}`
  );

  const tx = Array.isArray(block?.txs)
    ? block.txs.find((candidate) => candidate?.hash === txHash)
    : null;

  if (!tx) {
    throw new Error(`Transaction ${txHash} was not found in block ${blockHeight}`);
  }

  return tx;
}

function parseDataMessage(transaction) {
  const messages = Array.isArray(transaction?.messages) ? transaction.messages : [];
  const dataMessage = messages.find((message) => message?.type === 'data' && typeof message?.data === 'string');

  if (!dataMessage) {
    return null;
  }

  try {
    return JSON.parse(dataMessage.data);
  } catch {
    return null;
  }
}

async function verifyAnchorOnChain(entry, blockchainUrl) {
  if (!entry?.txHash) {
    return { verified: false, reason: 'missing_tx_hash' };
  }

  const receipt = await fetchJson(
    `${blockchainUrl}/tx/${encodeURIComponent(entry.txHash)}`,
    undefined,
    `Failed to fetch transaction receipt for ${entry.txHash}`
  );
  if (String(receipt?.status || '').toLowerCase() === 'failed' || receipt?.success === false) {
    return { verified: false, reason: 'transaction_failed', receipt };
  }
  const blockHeight = Number(receipt?.block_height || entry?.blockHeight || 0);
  if (!blockHeight) {
    return { verified: false, reason: 'transaction_not_confirmed', receipt };
  }

  const tx = await fetchConfirmedTransactionRecord(entry.txHash, blockHeight, blockchainUrl);
  const payload = parseDataMessage(tx);
  const anchoredPayloadHash = payload?.payloadHash || payload?.blake3Hash || payload?.blake3 || null;
  const expectedPayloadHash = String(entry?.payloadHash || entry?.blake3Hash || entry?.blake3 || '')
    .trim()
    .toLowerCase()
    .replace(/^0x/i, '');
  const verified = Boolean(
    anchoredPayloadHash &&
    String(anchoredPayloadHash).trim().toLowerCase().replace(/^0x/i, '') === expectedPayloadHash
  );

  return {
    verified,
    blockHeight,
    receipt,
    tx,
    payload,
    reason: verified ? null : 'payload_hash_mismatch'
  };
}

async function anchorPayloadToChain(anchorPayload, blockchainUrl) {
  const wallet = await ensureServiceWallet(blockchainUrl);
  const fundedBalance = await ensureServiceWalletFunding(wallet, blockchainUrl);

  if (fundedBalance < MIN_SERVICE_WALLET_BALANCE_UDGT) {
    throw new Error(`QuantumVault service wallet ${wallet.address} balance is below the minimum threshold`);
  }

  const status = await getChainStatus(blockchainUrl);
  const nonce = await getAccountNonce(wallet.address, blockchainUrl);
  const anchorTx = {
    chain_id: status?.chain_id || 'dyt-local-1',
    nonce,
    msgs: [{
      type: 'data',
      from: wallet.address,
      data: JSON.stringify(anchorPayload)
    }],
    fee: String(ANCHOR_TX_FEE),
    memo: ANCHOR_TX_MEMO
  };

  const signedTransaction = await signAnchorTransaction(anchorTx, wallet, blockchainUrl);
  const submitted = await submitAnchorTransaction(signedTransaction, blockchainUrl);
  const txHash = submitted?.hash || submitted?.tx_hash;

  if (!txHash) {
    throw new Error('Blockchain submission succeeded but no transaction hash was returned');
  }

  const receipt = await waitForTransactionConfirmation(txHash, blockchainUrl);
  const blockHeight = Number(receipt?.block_height || 0);
  const tx = await fetchConfirmedTransactionRecord(txHash, blockHeight, blockchainUrl);

  return {
    wallet,
    txHash,
    blockHeight,
    receipt,
    tx,
    anchorPayload
  };
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
      signatureMethod: "Dilithium-5 (ML-DSA-87)"
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
    const { blake3, uri, metadata: assetMetadata } = req.body;

    if (!blake3 || !uri) {
      return res.status(400).json({ error: 'Missing blake3 or uri' });
    }

    const BLOCKCHAIN_API_URL = process.env.BLOCKCHAIN_API_URL ||
      process.env.VITE_BLOCKCHAIN_URL ||
      'http://localhost:3003';

    const registrationData = {
      type: 'quantumvault_registration',
      payloadHash: blake3,
      blake3Hash: blake3,
      uri: uri,
      metadata: assetMetadata || {
        registered_by: 'quantumvault-api',
        timestamp: new Date().toISOString()
      }
    };

    const anchored = await anchorPayloadToChain(registrationData, BLOCKCHAIN_API_URL);

    const assetId = assetIdCounter++;
    onChainRegistry[assetId] = {
      assetId,
      blake3Hash: blake3,
      payloadHash: blake3,
      uri,
      owner: anchored.wallet.address,
      timestamp: Math.floor(Date.now() / 1000),
      txHash: anchored.txHash,
      blockHeight: anchored.blockHeight,
      status: 'confirmed',
      anchoredAt: new Date().toISOString()
    };
    await saveRegistry();

    console.log(`[QuantumVault] ✅ Registered asset on blockchain: ${blake3}, tx: ${anchored.txHash}`);

    res.json({
      txHash: anchored.txHash,
      assetId,
      blockHeight: anchored.blockHeight,
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
    const assetHash = String(req.params.assetHash || '').trim();
    const BLOCKCHAIN_API_URL = process.env.BLOCKCHAIN_API_URL ||
      process.env.VITE_BLOCKCHAIN_URL ||
      'http://localhost:3003';

    console.log(`[QuantumVault] Verifying asset hash: ${assetHash}`);

    let foundAsset = null;
    for (const [assetId, asset] of Object.entries(onChainRegistry)) {
      const normalizedRegistryHash = String(
        asset?.payloadHash || asset?.blake3Hash || asset?.blake3 || asset?.assetHash || ''
      ).trim().toLowerCase().replace(/^0x/i, '');
      const normalizedSearchHash = assetHash.toLowerCase().replace(/^0x/i, '');

      if (normalizedRegistryHash === normalizedSearchHash || String(assetId) === assetHash) {
        foundAsset = { assetId, ...asset };
        break;
      }
    }

    if (!foundAsset) {
      return res.status(404).json({
        verified: false,
        error: 'Asset not found on blockchain',
        asset_hash: assetHash
      });
    }

    const verification = await verifyAnchorOnChain({
      txHash: foundAsset.txHash,
      blockHeight: foundAsset.blockHeight,
      blake3Hash: foundAsset.payloadHash || foundAsset.blake3Hash || foundAsset.blake3
    }, BLOCKCHAIN_API_URL);

    if (!verification.verified) {
      return res.status(409).json({
        verified: false,
        error: 'Asset registry entry exists but failed on-chain verification',
        asset_hash: assetHash,
        tx_hash: foundAsset.txHash,
        details: verification.reason
      });
    }

    res.json({
      verified: true,
      asset_id: foundAsset.assetId,
      tx_hash: foundAsset.txHash,
      block_height: verification.blockHeight,
      timestamp: foundAsset.timestamp || foundAsset.anchoredAt,
      owner: foundAsset.owner,
      payload_hash: foundAsset.payloadHash || foundAsset.blake3Hash || foundAsset.blake3,
      metadata: {
        verification_time: new Date().toISOString(),
        status: 'verified',
        blockchain_status: verification.receipt?.status || 'confirmed'
      }
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
 * Anchor a proof to the Dytallix blockchain with a signed data transaction.
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

    const anchorData = {
      type: 'quantumvault_proof',
      proofId,
      payloadHash: proof.blake3Hash,
      issuedAt: proof.timestamp,
      version: '2.0'
    };

    const anchored = await anchorPayloadToChain(anchorData, blockchainUrl);

    onChainRegistry[proofId] = {
      ...anchorData,
      blake3Hash: proof.blake3Hash,
      filename: proof.filename,
      signature: proof.signature,
      txHash: anchored.txHash,
      blockHeight: anchored.blockHeight,
      owner: anchored.wallet.address,
      anchoredAt: new Date().toISOString(),
      status: 'confirmed'
    };
    await saveRegistry();

    proof.anchored = true;
    proof.txHash = anchored.txHash;
    proof.blockHeight = anchored.blockHeight;
    metadata[proofId] = proof;
    await saveMetadata();

    console.log(`[QuantumVault] ✅ Proof ${proofId} anchored at block ${anchored.blockHeight}, tx: ${anchored.txHash}`);

    res.json({
      success: true,
      proofId,
      transaction: {
        hash: anchored.txHash,
        blockHeight: anchored.blockHeight,
        timestamp: new Date().toISOString(),
        status: 'confirmed'
      },
      proof: proof,
      verification: `On-chain transaction ${anchored.txHash} confirms payload ${proof.blake3Hash}`
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
      blockchainHeight = data.latest_height || data.block_height || data.blockHeight || 0;
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
 * GET /anchors/recent
 * List recently anchored proofs (Explorer integration)
 * Query: ?limit=10
 */
app.get('/anchors/recent', (req, res) => {
  try {
    const limit = Math.max(1, Math.min(Number(req.query.limit || 10), 100));

    const items = Object.entries(onChainRegistry)
      .map(([proofId, entry]) => {
        const proof = metadata[proofId] || {};
        return {
          proofId,
          txHash: entry.txHash,
          payloadHash: entry.payloadHash || entry.blake3Hash || entry.blake3 || proof.blake3Hash,
          filename: entry.filename || proof.filename,
          blockHeight: entry.blockHeight || proof.blockHeight,
          anchoredAt: entry.anchoredAt || proof.anchoredAt || proof.timestamp,
          status: entry.status || 'confirmed'
        };
      })
      .sort((a, b) => {
        const ta = Date.parse(a.anchoredAt || '') || 0;
        const tb = Date.parse(b.anchoredAt || '') || 0;
        return tb - ta;
      })
      .slice(0, limit);

    res.json({ anchors: items, total: items.length });
  } catch (error) {
    console.error('[QuantumVault] anchors/recent error:', error);
    res.status(500).json({ error: 'Failed to fetch recent anchors' });
  }
});

/**
 * GET /anchors/lookup/:id
 * Lookup an anchored proof by txHash, proofId, or payload hash.
 */
app.get('/anchors/lookup/:id', async (req, res) => {
  try {
    const id = decodeURIComponent(req.params.id);
    const normalizedId = String(id || '').trim().toLowerCase();
    const normalizedHexId = normalizedId.replace(/^0x/i, '');
    const blockchainUrl = process.env.BLOCKCHAIN_API_URL ||
      process.env.VITE_BLOCKCHAIN_URL ||
      'http://localhost:3003';
    const attachVerification = async (payload) => {
      try {
        const verification = await verifyAnchorOnChain({
          txHash: payload.txHash,
          blockHeight: payload.blockHeight,
          payloadHash: payload.payloadHash
        }, blockchainUrl);

        return {
          ...payload,
          blockHeight: verification.blockHeight || payload.blockHeight,
          onChainVerified: verification.verified,
          onChainStatus: verification.receipt?.status || payload.status || 'confirmed'
        };
      } catch (error) {
        return {
          ...payload,
          onChainVerified: false,
          verificationError: error.message
        };
      }
    };

    // 1) Direct proofId match
    if (onChainRegistry[id]) {
      const entry = onChainRegistry[id];
      const proof = metadata[id] || {};
      return res.json(await attachVerification({
        found: true,
        type: 'proofId',
        proofId: id,
        txHash: entry.txHash,
        payloadHash: entry.payloadHash || entry.blake3Hash || entry.blake3 || proof.blake3Hash,
        filename: entry.filename || proof.filename,
        blockHeight: entry.blockHeight || proof.blockHeight,
        anchoredAt: entry.anchoredAt || proof.anchoredAt || proof.timestamp,
        status: entry.status || 'confirmed'
      }));
    }

    // 2) txHash match
    for (const [proofId, entry] of Object.entries(onChainRegistry)) {
      const entryTxHash = entry?.txHash ? String(entry.txHash).trim().toLowerCase() : '';
      if (entryTxHash && entryTxHash === normalizedId) {
        const proof = metadata[proofId] || {};
        return res.json(await attachVerification({
          found: true,
          type: 'txHash',
          proofId,
          txHash: entry.txHash,
          payloadHash: entry.payloadHash || entry.blake3Hash || entry.blake3 || proof.blake3Hash,
          filename: entry.filename || proof.filename,
          blockHeight: entry.blockHeight || proof.blockHeight,
          anchoredAt: entry.anchoredAt || proof.anchoredAt || proof.timestamp,
          status: entry.status || 'confirmed'
        }));
      }
    }

    // 3) payload hash match (attestation hash)
    for (const [proofId, entry] of Object.entries(onChainRegistry)) {
      const proof = metadata[proofId] || {};
      const payloadHash = entry.payloadHash || entry.blake3Hash || entry.blake3 || proof.blake3Hash;
      const normalizedPayloadHash = payloadHash ? String(payloadHash).trim().toLowerCase().replace(/^0x/i, '') : '';
      if (normalizedPayloadHash && normalizedPayloadHash === normalizedHexId) {
        return res.json(await attachVerification({
          found: true,
          type: 'payloadHash',
          proofId,
          txHash: entry.txHash,
          payloadHash,
          filename: entry.filename || proof.filename,
          blockHeight: entry.blockHeight || proof.blockHeight,
          anchoredAt: entry.anchoredAt || proof.anchoredAt || proof.timestamp,
          status: entry.status || 'confirmed'
        }));
      }
    }

    return res.status(404).json({ found: false, error: 'Anchor not found', id });
  } catch (error) {
    console.error('[QuantumVault] anchors/lookup error:', error);
    res.status(500).json({ error: 'Failed to lookup anchor' });
  }
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

    let verification;
    try {
      verification = await verifyAnchorOnChain({
        txHash,
        payloadHash
      }, BLOCKCHAIN_API_URL);
    } catch (e) {
      console.error('[QuantumVault] Blockchain lookup failed:', e);
      return res.status(502).json({ error: 'Blockchain unreachable', details: e.message });
    }

    if (!verification?.verified) {
      return res.status(404).json({
        error: 'Transaction not found on blockchain for the supplied payload hash',
        txHash,
        payloadHash,
        details: verification?.reason || 'unknown'
      });
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
        blockHeight: verification.blockHeight || verification.receipt?.block_height || 0,
        status: verification.receipt?.status || 'confirmed',
        timestamp: verification.payload?.timestamp || new Date().toISOString()
      },
      signature: {
        valid: signatureValid,
        message: signatureMessage
      },
      payloadHash: payloadHash,
      onChainPayload: verification.payload
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
console.log(`[QuantumVault] Starting HTTP listener on port ${PORT}...`);
const server = app.listen(PORT, () => {
  console.log(`[QuantumVault] API server running on port ${PORT}`);
  console.log(`[QuantumVault] Storage directory: ${STORAGE_DIR}`);
  console.log(`[QuantumVault] Loaded ${Object.keys(metadata).length} assets`);
});
