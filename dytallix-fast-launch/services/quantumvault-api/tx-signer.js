/**
 * Transaction Signer for QuantumVault
 * 
 * Creates and signs Dytallix blockchain transactions for file anchoring
 */

import { createHash } from 'crypto';
import dilithium from 'crystals-dilithium';

const fetch = globalThis.fetch || (await import('node-fetch')).default;

/**
 * Create and submit a Data transaction to anchor proof on-chain
 * 
 * @param {Object} params
 * @param {string} params.from - Sender address
 * @param {Object} params.data - Data object to anchor (will be JSON stringified)
 * @param {string} params.chainId - Chain ID (e.g., 'dyt-local-1')
 * @param {number} params.nonce - Account nonce
 * @param {number} params.fee - Transaction fee in micro-units
 * @param {Uint8Array} params.secretKey - Secret key for signing
 * @param {Uint8Array} params.publicKey - Public key
 * @param {string} params.rpcUrl - RPC endpoint URL
 * @returns {Promise<Object>} Transaction result
 */
export async function submitDataTransaction({
  from,
  data,
  chainId,
  nonce,
  fee,
  secretKey,
  publicKey,
  rpcUrl
}) {
  // Create transaction
  const tx = {
    chain_id: chainId,
    nonce,
    msgs: [{
      type: 'data',
      from,
      data: JSON.stringify(data)
    }],
    fee: fee.toString(),
    memo: 'QuantumVault file anchor'
  };

  // Compute canonical JSON for signing
  const canonicalJson = JSON.stringify(tx);
  const txBytes = new TextEncoder().encode(canonicalJson);
  
  // Hash the transaction
  const hash = createHash('sha3-256').update(txBytes).digest();
  
  // Sign with Dilithium
  const signature = dilithium.sign(secretKey, hash);
  
  // Create signed transaction
  const signedTx = {
    tx,
    public_key: Buffer.from(publicKey).toString('base64'),
    signature: Buffer.from(signature).toString('base64'),
    algorithm: 'ML-DSA-65',
    version: 1
  };

  // Submit to blockchain
  const response = await fetch(`${rpcUrl}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ signed_tx: signedTx })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Transaction submission failed (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return result;
}

/**
 * Get account nonce from blockchain
 */
export async function getAccountNonce(address, rpcUrl) {
  const response = await fetch(`${rpcUrl}/account/${address}`);
  
  if (!response.ok) {
    // Account doesn't exist yet, nonce is 0
    return 0;
  }
  
  const account = await response.json();
  return account.nonce || 0;
}

/**
 * Load wallet keypair from environment or file
 * 
 * For development, we'll create a test keypair
 * In production, this should load from secure storage
 */
export function loadWallet() {
  // Check if keypair exists in environment
  const secretKeyBase64 = process.env.QV_SECRET_KEY;
  const publicKeyBase64 = process.env.QV_PUBLIC_KEY;
  const address = process.env.QV_ADDRESS;

  if (secretKeyBase64 && publicKeyBase64 && address) {
    return {
      address,
      secretKey: Buffer.from(secretKeyBase64, 'base64'),
      publicKey: Buffer.from(publicKeyBase64, 'base64')
    };
  }

  // For development: generate a deterministic keypair
  console.log('[TxSigner] Generating development keypair (not for production!)');
  const seed = Buffer.alloc(32, 0xAB); // Deterministic seed for dev
  const keypair = dilithium.keyPair(seed);
  
  // Generate address from public key hash
  const pkHash = createHash('sha256').update(keypair.publicKey).digest();
  const devAddress = 'dytallix1' + Buffer.from(pkHash).toString('hex').substring(0, 40);

  console.log('[TxSigner] Development wallet address:', devAddress);
  console.log('[TxSigner] WARNING: This is a test wallet. Do not use in production!');

  return {
    address: devAddress,
    secretKey: keypair.secretKey,
    publicKey: keypair.publicKey
  };
}
