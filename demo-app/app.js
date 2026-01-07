#!/usr/bin/env node

/**
 * Dytallix Demo App
 * 
 * A simple application demonstrating:
 * - PQC wallet creation
 * - Faucet token requests
 * - Balance checking
 * - Smart contract interaction
 */

import { DytallixClient, DytallixWallet, TESTNET_CONFIG } from '@dytallix/sdk';
import { readFileSync } from 'fs';

console.log('═══════════════════════════════════════');
console.log('  Dytallix Demo App');
console.log('  Post-Quantum Blockchain Demo');
console.log('═══════════════════════════════════════\n');

const CONTRACT_ADDRESS = '0x2bbeef9c81ba8009df511712ca59cdaef1dbfd58';

async function main() {
  // Step 1: Initialize client
  console.log('📡 Connecting to Dytallix testnet...');
  const client = new DytallixClient(TESTNET_CONFIG);
  
  const status = await client.getStatus();
  console.log(`✅ Connected! Chain: ${status.chain_id}\n`);

  // Step 2: Create a new PQC wallet
  console.log('🔐 Generating quantum-resistant wallet...');
  const wallet = await DytallixWallet.generate();
  console.log(`✅ Wallet created: ${wallet.address}`);
  console.log(`   Public key: ${wallet.publicKey.substring(0, 32)}...\n`);

  // Step 3: Request testnet tokens from faucet
  console.log('🚰 Requesting tokens from faucet...');
  const faucetResult = await client.requestFaucet(wallet.address);
  console.log(`✅ Tokens received!`);
  console.log(`   DGT: ${faucetResult.dgt_amount}`);
  console.log(`   DRT: ${faucetResult.drt_amount}\n`);

  // Wait a moment for tokens to be processed
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 4: Check balance
  console.log('💰 Checking balance...');
  const account = await client.getAccount(wallet.address);
  console.log(`✅ Balance:`);
  console.log(`   DGT: ${account.dgt_balance}`);
  console.log(`   DRT: ${account.drt_balance}\n`);

  // Step 5: Interact with deployed contract
  console.log('📝 Interacting with smart contract...');
  console.log(`   Contract: ${CONTRACT_ADDRESS}`);
  
  try {
    // Call init method
    console.log('\n   → Calling init()...');
    const initResult = await client.callContract(
      CONTRACT_ADDRESS,
      'init',
      ''
    );
    console.log(`   ✅ Init result: ${Buffer.from(initResult.result, 'hex').toString()}`);
    console.log(`   ⛽ Gas used: ${initResult.gas_used}`);

    // Call increment method
    console.log('\n   → Calling increment()...');
    const incResult = await client.callContract(
      CONTRACT_ADDRESS,
      'increment',
      ''
    );
    const counterValue = Buffer.from(incResult.result, 'hex').readBigUInt64LE(0);
    console.log(`   ✅ Counter: ${counterValue}`);
    console.log(`   ⛽ Gas used: ${incResult.gas_used}`);

    // Call increment again
    console.log('\n   → Calling increment() again...');
    const inc2Result = await client.callContract(
      CONTRACT_ADDRESS,
      'increment',
      ''
    );
    const counter2Value = Buffer.from(inc2Result.result, 'hex').readBigUInt64LE(0);
    console.log(`   ✅ Counter: ${counter2Value}`);
    console.log(`   ⛽ Gas used: ${inc2Result.gas_used}`);

    // Get counter value
    console.log('\n   → Calling get_counter()...');
    const getResult = await client.callContract(
      CONTRACT_ADDRESS,
      'get_counter',
      ''
    );
    const finalValue = Buffer.from(getResult.result, 'hex').readBigUInt64LE(0);
    console.log(`   ✅ Final counter value: ${finalValue}`);

  } catch (error) {
    console.log(`   ⚠️  Contract interaction error: ${error.message}`);
  }

  // Step 6: Sign a message
  console.log('\n✍️  Signing a message...');
  const message = 'Hello from Dytallix Demo App!';
  const signature = wallet.sign(message);
  console.log(`✅ Message signed (${signature.length} bytes)`);

  // Verify the signature
  const isValid = wallet.verify(message, signature);
  console.log(`✅ Signature verified: ${isValid ? 'Valid ✓' : 'Invalid ✗'}\n`);

  // Summary
  console.log('═══════════════════════════════════════');
  console.log('  Demo Complete! 🎉');
  console.log('═══════════════════════════════════════');
  console.log('\nYou\'ve successfully:');
  console.log('  ✓ Created a quantum-resistant wallet');
  console.log('  ✓ Received testnet tokens');
  console.log('  ✓ Interacted with a smart contract');
  console.log('  ✓ Signed and verified messages');
  console.log('\nLearn more at: https://www.dytallix.com');
  console.log('Join Discord: https://discord.gg/N8Q4A2KE\n');
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
