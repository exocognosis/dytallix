#!/usr/bin/env node
// Minimal signature verification test

import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load the wallet
const walletPath = process.argv[2] || './test-wallets/debug-wallet.json';
const wallet = JSON.parse(readFileSync(resolve(walletPath), 'utf8'));

console.log('=== Wallet Info ===');
console.log('Address:', wallet.address);
console.log('Public Key Length:', Buffer.from(wallet.pubkey_b64, 'base64').length, 'bytes');
if (wallet.seckey_b64) {
  console.log('Secret Key Length:', Buffer.from(wallet.seckey_b64, 'base64').length, 'bytes');
}
console.log();

// Create a simple transaction
const tx = {
  chain_id: 'dytallix-gov-e2e',
  nonce: 0,
  msgs: [{
    type: 'send',
    from: wallet.address,
    to: 'dyt1test00000000000000000000000000000',
    denom: 'DGT',
    amount: '100'
  }],
  fee: '1000',
  memo: 'test'
};

console.log('=== Transaction ===');
console.log(JSON.stringify(tx, null, 2));
console.log();

// Canonical JSON (stable key sort)
function canonicalJson(obj) {
  const stable = (value) => {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === 'object') {
      return Object.keys(value)
        .sort()
        .reduce((acc, key) => {
          acc[key] = stable(value[key]);
          return acc;
        }, {});
    }
    return value;
  };
  return JSON.stringify(stable(obj));
}

const canonical = canonicalJson(tx);
console.log('=== Canonical JSON ===');
console.log(canonical);
console.log('Length:', canonical.length, 'bytes');
console.log();

// SHA3-256 hash
const hash = createHash('sha3-256').update(canonical).digest();
console.log('=== SHA3-256 Hash ===');
console.log('Hex:', hash.toString('hex'));
console.log('Base64:', hash.toString('base64'));
console.log('Length:', hash.length, 'bytes');
console.log();

// Expected values
console.log('=== Expected Backend Processing ===');
console.log('1. Backend receives the transaction object');
console.log('2. Creates canonical_fields() from tx (chain_id, nonce, msgs, fee, memo)');
console.log('3. Serializes to canonical JSON with sorted keys');
console.log('4. Computes SHA3-256 hash of canonical JSON bytes');
console.log('5. Verifies Dilithium5 signature over the hash');
console.log();

console.log('=== CLI Processing ===');
console.log('1. CLI creates transaction object');
console.log('2. Serializes to canonical JSON with sorted keys');
console.log('3. Computes SHA3-256 hash of canonical JSON bytes');
console.log('4. Signs the hash with Dilithium5');
console.log('5. Encodes signature as base64');
console.log();

console.log('=== Potential Issues ===');
console.log('1. Field order mismatch between CLI and backend canonical JSON');
console.log('2. Different JSON serialization (whitespace, number format)');
console.log('3. Different hash input (raw JSON vs UTF-8 bytes)');
console.log('4. Public key encoding/length mismatch');
console.log('5. Signature encoding/length mismatch');
