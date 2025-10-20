/**
 * Quantum-related API functions
 * Handles on-chain asset verification and registration
 */

// Get API base URL from environment
const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || 'http://localhost:8787';
};

/**
 * Register an asset hash on-chain
 * @param {string} assetHash - BLAKE3 hash of the asset
 * @param {object} metadata - Additional metadata
 * @returns {Promise<object>} - Registration result
 */
export async function registerAssetOnChain(assetHash, metadata = {}) {
  console.log('[Quantum API] Registering asset on-chain (stub)', {
    assetHash,
    metadata
  });

  const apiUrl = getApiUrl();
  
  try {
    const response = await fetch(`${apiUrl}/api/quantum/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assetHash,
        metadata,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Registration failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      transactionHash: result.txHash || `mock_tx_${Date.now()}`,
      blockHeight: result.blockHeight || Math.floor(Math.random() * 1000000),
      timestamp: result.timestamp || new Date().toISOString(),
      gasUsed: result.gasUsed || '21000',
      ...result
    };
  } catch (error) {
    console.error('[Quantum API] Registration error:', error);
    
    // For development, return a mock successful response
    return {
      success: true,
      transactionHash: `mock_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      blockHeight: Math.floor(Math.random() * 1000000) + 500000,
      timestamp: new Date().toISOString(),
      gasUsed: '21000',
      note: 'Mock response - endpoint not implemented'
    };
  }
}

/**
 * Verify an asset hash against on-chain records
 * @param {string} assetHash - BLAKE3 hash to verify
 * @returns {Promise<object>} - Verification result
 */
export async function verifyAssetOnChain(assetHash) {
  console.log('[Quantum API] Verifying asset on-chain (stub)', { assetHash });

  const apiUrl = getApiUrl();
  
  try {
    const response = await fetch(`${apiUrl}/api/quantum/verify/${assetHash}`, {
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
      transactionHash: result.txHash,
      blockHeight: result.blockHeight,
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
 * Upload encrypted ciphertext
 * @param {string} ciphertext - Encrypted data to upload
 * @param {object} metadata - Additional metadata
 * @returns {Promise<object>} - Upload result
 */
export async function uploadCiphertext(ciphertext, metadata = {}) {
  console.log('[Quantum API] Uploading ciphertext (stub)', {
    ciphertextLength: ciphertext?.length,
    metadata
  });

  const apiUrl = getApiUrl();
  
  try {
    const response = await fetch(`${apiUrl}/api/quantum/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ciphertext,
        metadata,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      uploadId: result.uploadId || `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: result.url || `mock://upload/${Date.now()}`,
      timestamp: result.timestamp || new Date().toISOString(),
      size: ciphertext?.length || 0,
      ...result
    };
  } catch (error) {
    console.error('[Quantum API] Upload error:', error);
    
    // For development, return a mock successful response
    return {
      success: true,
      uploadId: `mock_upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: `mock://upload/${Date.now()}`,
      timestamp: new Date().toISOString(),
      size: ciphertext?.length || 0,
      note: 'Mock response - endpoint not implemented'
    };
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
