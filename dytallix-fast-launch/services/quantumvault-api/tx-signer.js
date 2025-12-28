/**
 * Transaction Signer for QuantumVault
 *
 * This file is kept for backward compatibility, but the implementation is
 * CLI-based to ensure signature format compatibility with the Rust node.
 */

export {
  submitDataTransaction,
  getAccountNonce,
  loadWallet,
} from './tx-signer-cli.js';
