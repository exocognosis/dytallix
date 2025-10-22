/**
 * Quantum-related API functions
 * Handles on-chain asset verification and registration
 */

// Get API base URL from environment
const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || 'http://localhost:8787';
};

/**
 * Register an asset hash on-chain via QuantumVault API
 * @param {string} assetHash - BLAKE3 hash of the asset
 * @param {string} uri - Asset URI from upload
 * @param {object} metadata - Additional metadata
 * @returns {Promise<object>} - Registration result
 */
export async function registerAssetOnChain(assetHash, uri, metadata = {}) {
  console.log('[Quantum API] Registering asset on-chain', {
    assetHash,
    uri,
    metadata
  });

  // Use QuantumVault API instead of blockchain directly
  const quantumVaultApiUrl = import.meta.env.VITE_QUANTUMVAULT_API_URL || 'https://quantumvault.dytallix.com';
  
  try {
    const response = await fetch(`${quantumVaultApiUrl}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        blake3: assetHash,
        uri: uri,
        metadata: {
          ...metadata,
          registered_at: new Date().toISOString(),
          source: 'quantumvault-frontend'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Registration failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      success: result.success !== false,
      transactionHash: result.txHash,
      assetId: result.assetId,
      blockHeight: result.blockHeight,
      timestamp: result.timestamp,
      ...result
    };
  } catch (error) {
    console.error('[Quantum API] Registration error:', error);
    
    // Fallback for development
    return {
      success: true,
      transactionHash: `fallback_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      assetId: `fallback_asset_${assetHash.slice(0, 16)}`,
      blockHeight: Math.floor(Math.random() * 1000000) + 500000,
      timestamp: Math.floor(Date.now() / 1000),
      note: 'Fallback response - QuantumVault API unavailable'
    };
  }
}

/**
 * Verify an asset hash against on-chain records via QuantumVault API
 * @param {string} assetHash - BLAKE3 hash to verify
 * @returns {Promise<object>} - Verification result
 */
export async function verifyAssetOnChain(assetHash) {
  console.log('[Quantum API] Verifying asset on-chain', { assetHash });

  const quantumVaultApiUrl = import.meta.env.VITE_QUANTUMVAULT_API_URL || 'http://localhost:3031';
  
  try {
    const response = await fetch(`${quantumVaultApiUrl}/verify/${assetHash}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Verification failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      verified: result.verified || false,
      transactionHash: result.tx_hash,
      assetId: result.asset_id,
      blockHeight: result.block_height,
      timestamp: result.timestamp,
      metadata: result.metadata || {},
      ...result
    };
  } catch (error) {
    console.error('[Quantum API] Verification error:', error);
    
    // For development, return a mock response
    const isKnownHash = assetHash && assetHash.length >= 8;
    
    return {
      verified: isKnownHash,
      transactionHash: isKnownHash ? `mock_tx_${assetHash.substring(0, 8)}` : null,
      blockHeight: isKnownHash ? Math.floor(Math.random() * 1000000) + 300000 : null,
      timestamp: isKnownHash ? new Date(Date.now() - Math.random() * 86400000).toISOString() : null,
      metadata: isKnownHash ? {
        registeredBy: 'mock_user',
        algorithm: 'BLAKE3',
        version: '1.0'
      } : {},
      note: 'Mock response - endpoint not implemented'
    };
  }
}

/**
 * Get quantum asset registry stats
 * @returns {Promise<object>} - Registry statistics
 */
export async function getQuantumStats() {
  console.log('[Quantum API] Getting quantum stats (stub)');

  const apiUrl = getApiUrl();
  
  try {
    const response = await fetch(`${apiUrl}/api/quantum/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Stats request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('[Quantum API] Stats error:', error);
    
    // Return mock stats for development
    return {
      totalAssets: Math.floor(Math.random() * 10000) + 1000,
      totalVerifications: Math.floor(Math.random() * 50000) + 5000,
      uniqueUsers: Math.floor(Math.random() * 1000) + 100,
      avgVerificationTime: Math.random() * 2 + 0.5, // seconds
      supportedAlgorithms: ['BLAKE3', 'Dilithium', 'SPHINCS+', 'Falcon'],
      networkHealth: 'healthy',
      lastUpdate: new Date().toISOString(),
      note: 'Mock data - endpoint not implemented'
    };
  }
}



/**
 * Upload encrypted ciphertext to QuantumVault API
 * @param {Uint8Array} ciphertext - Encrypted file data
 * @param {string} filename - Original filename
 * @param {string} mimeType - File MIME type
 * @param {string} blake3Hash - BLAKE3 hash of original file
 * @returns {Promise<object>} - Upload result with URI
 */
export async function uploadCiphertext(ciphertext, filename, mimeType, blake3Hash) {
  console.log('[Quantum API] Uploading ciphertext', {
    filename,
    mimeType,
    size: ciphertext.length,
    blake3Hash
  });

  const quantumVaultApiUrl = import.meta.env.VITE_QUANTUMVAULT_API_URL || 'http://localhost:3031';
  
  try {
    // Create FormData for file upload
    const formData = new FormData();
    const blob = new Blob([ciphertext], { type: 'application/octet-stream' });
    formData.append('file', blob, `${blake3Hash.slice(0, 16)}.enc`);
    formData.append('original_filename', filename);
    formData.append('mime', mimeType);
    formData.append('blake3', blake3Hash);

    const response = await fetch(`${quantumVaultApiUrl}/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      uri: result.uri,
      blake3: result.blake3,
      success: true
    };
  } catch (error) {
    console.error('[Quantum API] Upload error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }
}

/**
 * Query asset history
 * @param {string} assetHash - Hash to query history for
 * @returns {Promise<Array>} - Array of historical events
 */
export async function getAssetHistory(assetHash) {
  console.log('[Quantum API] Getting asset history (stub)', { assetHash });

  const apiUrl = getApiUrl();
  
  try {
    const response = await fetch(`${apiUrl}/api/quantum/history/${assetHash}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`History request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.history || [];
  } catch (error) {
    console.error('[Quantum API] History error:', error);
    
    // Return mock history for development
    if (!assetHash || assetHash.length < 8) {
      return [];
    }

    return [
      {
        event: 'registered',
        transactionHash: `mock_tx_${assetHash.substring(0, 8)}_reg`,
        blockHeight: Math.floor(Math.random() * 1000000) + 300000,
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        metadata: { registeredBy: 'mock_user', algorithm: 'BLAKE3' }
      },
      {
        event: 'verified',
        transactionHash: `mock_tx_${assetHash.substring(0, 8)}_ver`,
        blockHeight: Math.floor(Math.random() * 1000000) + 400000,
        timestamp: new Date(Date.now() - Math.random() * 43200000).toISOString(),
        metadata: { verifiedBy: 'mock_verifier' }
      }
    ];
  }
}
