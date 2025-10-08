#!/usr/bin/env node
// Test transaction submission with detailed logging

import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import fetch from 'node-fetch';

const API_URL = process.env.NODE_URL || 'http://localhost:3030';

// Load wallet
const walletPath = process.argv[2] || './test-wallets/debug-wallet.json';
const wallet = JSON.parse(readFileSync(resolve(walletPath), 'utf8'));

console.log('=== Test Transaction Submission ===');
console.log('Wallet:', wallet.address);
console.log();

// Get account state
const accountResp = await fetch(`${API_URL}/api/account/${wallet.address}`);
const account = await accountResp.json();
console.log('Account nonce:', account.nonce || 0);
console.log('Account balance:', account.balances || {});
console.log();

// Get chain ID
const statsResp = await fetch(`${API_URL}/api/stats`);
const stats = await statsResp.json();
const chainId = stats.chain_id;
console.log('Chain ID:', chainId);
console.log();

// Create transaction
const tx = {
  chain_id: chainId,
  nonce: parseInt(account.nonce || '0'),
  msgs: [{
    type: 'send',
    from: wallet.address,
    to: 'dyt1test00000000000000000000000000000',
    denom: 'DGT',
    amount: '100000000' // 100 DGT in micro units
  }],
  fee: '1000',
  memo: 'test'
};

console.log('=== Transaction ===');
console.log(JSON.stringify(tx, null, 2));
console.log();

// Canonical JSON (same as CLI)
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
console.log();

// Hash
const hashBytes = createHash('sha3-256').update(canonical).digest();
const hashHex = hashBytes.toString('hex');
console.log('=== Hash ===');
console.log('Hex:', hashHex);
console.log();

// Now submit a REAL transaction with the CLI to see what it sends
console.log('=== Submitting via CLI ===');
console.log('(Run this separately to compare):');
console.log(`node cli/dytx/dist/index.js transfer \\`);
console.log(`  --from ${wallet.address} \\`);
console.log(`  --to dyt1test00000000000000000000000000000 \\`);
console.log(`  --amount 100 \\`);
console.log(`  --denom udgt \\`);
console.log(`  --memo test \\`);
console.log(`  --keystore ${walletPath} \\`);
console.log(`  --passphrase testpass123`);
console.log();

console.log('This will show what the CLI actually sends to the backend.');
