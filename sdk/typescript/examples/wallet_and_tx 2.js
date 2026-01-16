/**
 * Dytallix SDK Example: Wallet and Transaction
 * 
 * This example demonstrates:
 * 1. Initializing PQC
 * 2. Generating a wallet
 * 3. Querying chain status
 * 4. Checking account balance
 * 
 * Run: node examples/wallet_and_tx.js
 */

import { 
  DytallixClient, 
  PQCWallet, 
  initPQC,
  TESTNET_RPC,
  TESTNET_CHAIN_ID,
  VERSION
} from '../dist/index.js';

async function main() {
  console.log('Dytallix SDK v' + VERSION);
  console.log('='.repeat(40));
  
  // Step 1: Initialize PQC
  console.log('\n1. Initializing PQC module...');
  try {
    await initPQC();
    console.log('   ✓ PQC initialized');
  } catch (error) {
    console.error('   ✗ PQC initialization failed');
    console.error('   Install pqc-wasm: npm install pqc-wasm');
    process.exit(1);
  }
  
  // Step 2: Connect to testnet
  console.log('\n2. Connecting to testnet...');
  const client = new DytallixClient({
    rpcUrl: TESTNET_RPC,
    chainId: TESTNET_CHAIN_ID
  });
  
  try {
    const status = await client.getStatus();
    console.log('   ✓ Connected');
    console.log('   Block height:', status.block_height);
    console.log('   Chain ID:', status.chain_id);
  } catch (error) {
    console.error('   ✗ Connection failed:', error.message);
    console.log('   (Continuing with wallet demo...)');
  }
  
  // Step 3: Generate wallet
  console.log('\n3. Generating PQC wallet...');
  const wallet = await PQCWallet.generate();
  console.log('   ✓ Wallet generated');
  console.log('   Address:', wallet.address);
  console.log('   Algorithm:', wallet.algorithm);
  
  // Step 4: Export keystore
  console.log('\n4. Exporting encrypted keystore...');
  const keystore = await wallet.exportKeystore('demo-password-123');
  console.log('   ✓ Keystore exported');
  console.log('   Size:', keystore.length, 'bytes');
  
  // Step 5: Import keystore (verification)
  console.log('\n5. Re-importing keystore...');
  const imported = await PQCWallet.fromKeystore(keystore, 'demo-password-123');
  console.log('   ✓ Keystore imported');
  console.log('   Address matches:', imported.address === wallet.address);
  
  // Step 6: Query balance (will be 0 for new wallet)
  console.log('\n6. Querying account balance...');
  try {
    const account = await client.getAccount(wallet.address);
    console.log('   DGT Balance:', account.balances.DGT);
    console.log('   DRT Balance:', account.balances.DRT);
    console.log('   Nonce:', account.nonce);
  } catch (error) {
    console.log('   (Account query failed - network may be unavailable)');
  }
  
  console.log('\n' + '='.repeat(40));
  console.log('Demo complete!');
  console.log('\nTo send transactions, you need:');
  console.log('1. Tokens from the faucet');
  console.log('2. A recipient address');
  console.log('\nExample:');
  console.log('  const tx = await client.sendTokens({');
  console.log('    from: wallet,');
  console.log("    to: 'dyt1recipient...',");
  console.log('    amount: 10,');
  console.log("    denom: 'DRT'");
  console.log('  });');
}

main().catch(console.error);
