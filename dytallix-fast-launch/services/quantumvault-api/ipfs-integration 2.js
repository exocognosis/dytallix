/**
 * IPFS Integration for QuantumVault
 * Demonstrates how to store files on decentralized storage
 * with blockchain anchoring
 */

import { create } from 'ipfs-http-client';
import { promises as fs } from 'fs';

// IPFS Configuration
const IPFS_CONFIG = {
  // Local IPFS node
  local: {
    host: 'localhost',
    port: 5001,
    protocol: 'http'
  },
  // Infura IPFS (managed service)
  infura: {
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
      authorization: 'Basic ' + Buffer.from(
        process.env.INFURA_PROJECT_ID + ':' + process.env.INFURA_PROJECT_SECRET
      ).toString('base64')
    }
  },
  // Pinata (managed IPFS)
  pinata: {
    apiKey: process.env.PINATA_API_KEY,
    apiSecret: process.env.PINATA_API_SECRET,
    baseUrl: 'https://api.pinata.cloud'
  }
};

/**
 * Upload file to IPFS
 * @param {Buffer} fileBuffer - File data
 * @param {string} filename - Original filename
 * @returns {Promise<object>} - IPFS result with CID
 */
export async function uploadToIPFS(fileBuffer, filename) {
  try {
    // Try local IPFS node first, fallback to Infura
    let ipfs;
    
    try {
      ipfs = create(IPFS_CONFIG.local);
      // Test connection
      await ipfs.version();
      console.log('[IPFS] Using local IPFS node');
    } catch (error) {
      console.log('[IPFS] Local node unavailable, using Infura');
      ipfs = create(IPFS_CONFIG.infura);
    }

    // Add file to IPFS
    const result = await ipfs.add({
      path: filename,
      content: fileBuffer
    }, {
      pin: true, // Pin to prevent garbage collection
      wrapWithDirectory: false,
      progress: (bytes) => console.log(`[IPFS] Uploaded ${bytes} bytes`)
    });

    const cid = result.cid.toString();
    const size = result.size;

    console.log(`[IPFS] File uploaded: ${filename}`);
    console.log(`[IPFS] CID: ${cid}`);
    console.log(`[IPFS] Size: ${size} bytes`);
    console.log(`[IPFS] Gateway URL: https://ipfs.io/ipfs/${cid}`);

    return {
      cid,
      size,
      filename,
      gatewayUrl: `https://ipfs.io/ipfs/${cid}`,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('[IPFS] Upload failed:', error);
    throw new Error(`IPFS upload failed: ${error.message}`);
  }
}

/**
 * Download file from IPFS
 * @param {string} cid - IPFS Content Identifier
 * @returns {Promise<Buffer>} - File data
 */
export async function downloadFromIPFS(cid) {
  try {
    const ipfs = create(IPFS_CONFIG.local);
    
    // Get file from IPFS
    const chunks = [];
    for await (const chunk of ipfs.cat(cid)) {
      chunks.push(chunk);
    }
    
    const fileBuffer = Buffer.concat(chunks);
    console.log(`[IPFS] Downloaded ${fileBuffer.length} bytes from ${cid}`);
    
    return fileBuffer;

  } catch (error) {
    console.error('[IPFS] Download failed:', error);
    throw new Error(`IPFS download failed: ${error.message}`);
  }
}

/**
 * Enhanced upload with IPFS + blockchain anchoring
 * @param {object} fileData - File information
 * @param {Buffer} encryptedBuffer - Encrypted file data
 * @returns {Promise<object>} - Complete storage result
 */
export async function uploadToDecentralizedStorage(fileData, encryptedBuffer) {
  const results = {
    timestamp: new Date().toISOString(),
    file: fileData,
    storage: {},
    blockchain: {}
  };

  try {
    // 1. Upload to IPFS
    console.log('[Storage] Uploading to IPFS...');
    const ipfsResult = await uploadToIPFS(encryptedBuffer, `${fileData.blake3}.enc`);
    
    results.storage = {
      type: 'ipfs',
      cid: ipfsResult.cid,
      size: ipfsResult.size,
      gatewayUrl: ipfsResult.gatewayUrl,
      uri: `ipfs://${ipfsResult.cid}`
    };

    // 2. Create blockchain record
    console.log('[Storage] Creating blockchain record...');
    const blockchainRecord = {
      assetHash: fileData.blake3,
      storageUri: `ipfs://${ipfsResult.cid}`,
      filename: fileData.original_filename,
      mime: fileData.mime,
      size: fileData.size,
      encrypted: true,
      timestamp: results.timestamp,
      version: '1.0'
    };

    // 3. Register on blockchain (this would be a real transaction)
    results.blockchain = await registerOnBlockchain(blockchainRecord);

    console.log('[Storage] Decentralized storage complete!');
    console.log('[Storage] IPFS CID:', results.storage.cid);
    console.log('[Storage] Blockchain TX:', results.blockchain.txHash);

    return results;

  } catch (error) {
    console.error('[Storage] Decentralized storage failed:', error);
    throw error;
  }
}

/**
 * Mock blockchain registration
 * In production, this would create an actual blockchain transaction
 */
async function registerOnBlockchain(record) {
  // Simulate blockchain transaction
  const txHash = '0x' + Buffer.from(
    record.assetHash + record.timestamp
  ).toString('hex').slice(0, 64);

  return {
    txHash,
    blockHeight: 1234567,
    gasUsed: 21000,
    gasPrice: '20000000000', // 20 gwei
    timestamp: new Date().toISOString(),
    record
  };
}

/**
 * Storage cost calculator
 */
export function calculateStorageCosts(fileSizeBytes) {
  const fileSizeMB = fileSizeBytes / (1024 * 1024);

  return {
    // Traditional cloud storage (monthly)
    aws_s3: fileSizeMB * 0.023, // $0.023/GB
    google_cloud: fileSizeMB * 0.020,
    
    // Decentralized storage (one-time)
    ipfs_pinata: fileSizeMB * 0.10, // $0.10/GB
    arweave: fileSizeMB * 5.00, // ~$5/GB permanent
    filecoin: fileSizeMB * 0.01, // Variable market price
    
    // Blockchain storage (prohibitively expensive)
    ethereum_mainnet: fileSizeBytes * 0.00001, // ~$100+/KB
    polygon: fileSizeBytes * 0.000001,
    bsc: fileSizeBytes * 0.0000005,
    
    // Recommendations
    recommended: {
      storage: 'IPFS + Arweave backup',
      blockchain: 'Hash + metadata only',
      estimatedCost: fileSizeMB * 5.10 // Arweave + IPFS
    }
  };
}

// Example usage demonstration
export async function demonstrateDecentralizedStorage() {
  console.log('\n🌐 Decentralized Storage Options for QuantumVault\n');
  
  const exampleFile = {
    blake3: 'abcd1234...',
    original_filename: 'document.pdf',
    mime: 'application/pdf',
    size: 1024 * 1024 // 1MB
  };

  // Show cost breakdown
  const costs = calculateStorageCosts(exampleFile.size);
  console.log('💰 Storage Cost Comparison (1MB file):');
  console.log(`AWS S3 (monthly): $${costs.aws_s3.toFixed(4)}`);
  console.log(`IPFS/Pinata: $${costs.ipfs_pinata.toFixed(4)}`);
  console.log(`Arweave (permanent): $${costs.arweave.toFixed(2)}`);
  console.log(`Ethereum (on-chain): $${costs.ethereum_mainnet.toFixed(0)}+`);
  console.log(`Recommended: ${costs.recommended.storage} ($${costs.recommended.estimatedCost.toFixed(2)})`);

  console.log('\n📋 Implementation Strategy:');
  console.log('1. Store encrypted file on IPFS');
  console.log('2. Backup to Arweave for permanence');
  console.log('3. Store IPFS CID + file hash on blockchain');
  console.log('4. Enable easy retrieval via CID or hash');
}

export default {
  uploadToIPFS,
  downloadFromIPFS,
  uploadToDecentralizedStorage,
  calculateStorageCosts,
  demonstrateDecentralizedStorage
};
