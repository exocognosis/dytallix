#!/usr/bin/env node

import { DytallixClient, PQCWallet, initPQC } from '@dytallix/sdk';

const TESTNET_CONFIG = {
  rpcUrl: 'https://dytallix.com/rpc',
  chainId: 'dytallix-testnet-1'
};

async function main() {
  console.log('\n═══════════════════════════════════════');
  console.log('  🚀 Dytallix SDK Demo Application');
  console.log('═══════════════════════════════════════\n');

  try {
    // Step 0: Initialize PQC module
    console.log('🔐 Initializing PQC module...');
    await initPQC();
    console.log('   ✓ PQC initialized\n');

    // Step 1: Create client
    console.log('📡 Connecting to testnet...');
    const client = new DytallixClient(TESTNET_CONFIG);
    
    // Step 2: Generate wallet
    console.log('🔑 Generating quantum-resistant wallet...');
    const wallet = await PQCWallet.generate();
    const address = wallet.address;
    console.log(`   ✓ Address: ${address}`);
    console.log(`   ✓ Algorithm: ML-DSA (FIPS 204)\n`);

    // Step 3: Get network status
    console.log('📊 Network Status:');
    const status = await client.getStatus();
    console.log(`   Chain ID: ${status.chain_id}`);
    console.log(`   Block Height: ${status.block_height}\n`);

    // Step 4: Check balance
    console.log('💰 Checking initial balance...');
    try {
      const accountBefore = await client.getAccount(address);
      console.log(`   DGT: ${accountBefore.balances.DGT || 0}`);
      console.log(`   DRT: ${accountBefore.balances.DRT || 0}\n`);
    } catch (error) {
      console.log(`   [No account found yet]\n`);
    }

    // Step 5: Request faucet
    console.log('🚰 Requesting testnet tokens...');
    const faucetResponse = await client.requestFaucet(address, ['DGT', 'DRT']);
    if (faucetResponse.success && faucetResponse.dispensed) {
      console.log(`   ✓ Faucet request successful`);
      for (const token of faucetResponse.dispensed) {
        console.log(`   ${token.symbol}: ${token.amount}`);
      }
    } else {
      console.log(`   ⚠️  ${faucetResponse.message || faucetResponse.error}`);
    }
    console.log('');

    // Step 6: Wait a moment and check balance again
    console.log('⏳ Waiting for tokens (3 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      const accountAfter = await client.getAccount(address);
      console.log('💎 Updated balance:');
      console.log(`   DGT: ${accountAfter.balances.DGT || 0}`);
      console.log(`   DRT: ${accountAfter.balances.DRT || 0}\n`);
    } catch (error) {
      console.log('   [Account balance not yet available]\n');
    }

    // Step 7: Sign a message
    console.log('✍️  Signing a message (ML-DSA)...');
    const message = 'Dytallix - Quantum-Resistant Blockchain!';
    const signature = await wallet.signMessage(message);
    console.log(`   Message: "${message}"`);
    console.log(`   Signature bytes: ${signature.length}`);
    console.log(`   Signature (first 32 bytes): ${Array.from(signature.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join('')}\n`);

    console.log('═══════════════════════════════════════');
    console.log('  ✅ Demo completed successfully!');
    console.log('═══════════════════════════════════════\n');

    // Show next steps
    console.log('Next steps:');
    console.log('1. Deploy a contract: node ../sdk/typescript/examples/deploy_contract.js');
    console.log('2. View full SDK docs: ../sdk/typescript/README.md');
    console.log('3. Join Discord: https://discord.gg/N8Q4A2KE');
    console.log('4. Visit: https://www.dytallix.com\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
