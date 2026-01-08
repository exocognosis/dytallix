/**
 * Transaction Signer for QuantumVault (CLI-based)
 * 
 * Creates and signs Dytallix blockchain transactions for file anchoring
 * using the Dytallix CLI for proper signature compatibility
 */

import { spawn } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

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
 * @param {string} params.rpcUrl - RPC endpoint URL
 * @param {string} params.walletPath - Path to wallet file
 * @returns {Promise<Object>} Transaction result
 */
export async function submitDataTransaction({
  from,
  data,
  chainId,
  nonce,
  fee,
  rpcUrl,
  walletPath
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

  // Write transaction to temp file
  const txPath = join(tmpdir(), `qv-tx-${Date.now()}.json`);
  await writeFile(txPath, JSON.stringify(tx));

  try {
    // Sign transaction using Dytallix CLI
    const cliPath = process.env.DYTALLIX_CLI_PATH || 'dytallix-cli';
    const signedTxJson = await signTransactionWithCLI(cliPath, txPath, walletPath);
    const signedTx = JSON.parse(signedTxJson);

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
  } finally {
    // Clean up temp file
    await unlink(txPath).catch(() => {});
  }
}

/**
 * Sign a transaction using the Dytallix CLI
 * 
 * @param {string} cliPath - Path to the dytallix-cli binary
 * @param {string} txPath - Path to the transaction JSON file
 * @param {string} walletPath - Path to wallet file
 * @returns {Promise<string>} Signed transaction as JSON string
 */
async function signTransactionWithCLI(cliPath, txPath, walletPath) {
  return new Promise((resolve, reject) => {
    const args = ['tx', 'sign-file', txPath, '--wallet', walletPath, '--output', 'json'];

    const cli = spawn(cliPath, args);
    let stdout = '';
    let stderr = '';

    cli.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    cli.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    cli.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`CLI signing failed (exit code ${code}): ${stderr}`));
      } else {
        resolve(stdout);
      }
    });

    cli.on('error', (err) => {
      reject(new Error(`Failed to execute CLI: ${err.message}`));
    });
  });
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
 * Load wallet information
 * Returns wallet address and path for CLI usage
 */
export function loadWallet() {
  const walletPath = process.env.QV_WALLET_PATH;
  const address = process.env.QV_ADDRESS;

  if (!walletPath || !address) {
    throw new Error('QV_WALLET_PATH and QV_ADDRESS environment variables must be set');
  }

  return {
    address,
    walletPath
  };
}
