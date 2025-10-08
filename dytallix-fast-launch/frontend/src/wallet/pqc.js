// PQCWalletLike adapter interface
// Provides a thin adapter to expose the wallet interface needed by keystore module

/**
 * @typedef {Object} PQCWalletLike
 * @property {() => Promise<string>} getAddress - Returns full canonical address
 * @property {() => ('ML-DSA' | 'SLH-DSA')} getAlgorithm - Returns algorithm name
 * @property {() => Promise<Uint8Array>} getPublicKey - Returns public key bytes
 * @property {() => Promise<Uint8Array>} exportPrivateKeyRaw - Returns private key bytes
 */

/**
 * Create a mock/demo wallet adapter for testing
 * This simulates a real PQC wallet with fake keys for demo purposes
 * @param {Object} opts
 * @param {string} opts.address - Full address
 * @param {'ML-DSA' | 'SLH-DSA'} opts.algorithm - Algorithm
 * @param {Uint8Array} opts.publicKey - Public key bytes
 * @param {Uint8Array} opts.privateKey - Private key bytes
 * @returns {PQCWalletLike}
 */
export function createMockWallet({ address, algorithm, publicKey, privateKey }) {
  return {
    async getAddress() {
      return address;
    },
    getAlgorithm() {
      return algorithm;
    },
    async getPublicKey() {
      return publicKey;
    },
    async exportPrivateKeyRaw() {
      return privateKey;
    }
  };
}

/**
 * Create a wallet adapter from the current app state
 * This bridges the existing wallet implementation to the keystore interface
 * @param {Object} state - Current wallet state from App
 * @param {string} state.addr - Current address
 * @param {string} state.algorithm - Current algorithm
 * @returns {PQCWalletLike}
 */
export function createWalletAdapter(state) {
  const { addr, algorithm } = state;
  
  // For now, we generate mock keys since the current implementation
  // doesn't store actual PQC keys. In a real implementation, these would
  // come from the actual PQC key generation process.
  
  return {
    async getAddress() {
      return addr;
    },
    getAlgorithm() {
      return algorithm;
    },
    async getPublicKey() {
      // Generate deterministic mock public key based on address
      // In real implementation, this would return the actual public key
      const encoder = new TextEncoder();
      const addrBytes = encoder.encode(addr);
      
      // ML-DSA public keys are ~1952 bytes, SLH-DSA are ~64 bytes
      const pkSize = algorithm === 'ML-DSA' ? 1952 : 64;
      const pk = new Uint8Array(pkSize);
      
      // Fill with deterministic data
      for (let i = 0; i < pkSize; i++) {
        pk[i] = (addrBytes[i % addrBytes.length] + i) % 256;
      }
      
      return pk;
    },
    async exportPrivateKeyRaw() {
      // Generate deterministic mock private key based on address
      // In real implementation, this would return the actual private key
      const encoder = new TextEncoder();
      const addrBytes = encoder.encode(addr);
      
      // ML-DSA secret keys are ~4032 bytes, SLH-DSA are ~128 bytes
      const skSize = algorithm === 'ML-DSA' ? 4032 : 128;
      const sk = new Uint8Array(skSize);
      
      // Fill with deterministic data (DO NOT use this in production!)
      for (let i = 0; i < skSize; i++) {
        sk[i] = (addrBytes[i % addrBytes.length] * 3 + i * 7) % 256;
      }
      
      return sk;
    }
  };
}
