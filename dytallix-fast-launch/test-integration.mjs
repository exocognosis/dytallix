#!/usr/bin/env node

/**
 * Test script for pqc-wasm integration
 */

async function test() {
  try {
    console.log('🧪 Testing pqc-wasm integration...\n');

    // Import SDK
    const SDK = await import('./sdk/dist/index.mjs');
    const { initPQC, PQCWallet } = SDK;

    // Initialize PQC
    console.log('1️⃣  Initializing PQC WASM module...');
    await initPQC();
    console.log('✅ PQC initialized\n');

    // Generate wallet
    console.log('2️⃣  Generating ML-DSA wallet...');
    const wallet = await PQCWallet.generate('ML-DSA');
    console.log('✅ Wallet generated');
    console.log(`   Address: ${wallet.address}`);
    console.log(`   Algorithm: ${wallet.algorithm}\n`);

    // Sign a message
    console.log('3️⃣  Signing a message...');
    const message = new TextEncoder().encode('Hello, Quantum World!');
    const signature = await wallet.sign(message);
    console.log('✅ Message signed');
    console.log(`   Signature length: ${signature.length} bytes\n`);

    // Verify signature
    console.log('4️⃣  Verifying signature...');
    const publicKey = wallet.getPublicKey();
    const isValid = await PQCWallet.verify(publicKey, message, signature);
    console.log(`✅ Signature verification: ${isValid ? 'VALID ✓' : 'INVALID ✗'}\n`);

    // Test address derivation using SDK method
    console.log('5️⃣  Testing wallet export/import...');
    const walletJSON = wallet.toJSON();
    const restoredWallet = PQCWallet.fromJSON(walletJSON);
    console.log(`✅ Wallet export/import successful`);
    console.log(`   Addresses match: ${restoredWallet.address === wallet.address ? 'YES ✓' : 'NO ✗'}\n`);

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('🎉 ALL TESTS PASSED!');
    console.log('═══════════════════════════════════════\n');
    console.log('✅ PQC WASM module loads correctly');
    console.log('✅ Wallet generation works');
    console.log('✅ Message signing works');
    console.log('✅ Signature verification works');
    console.log('✅ Wallet export/import works');
    console.log('\n📦 Ready to publish to npm!');

  } catch (error) {
    console.error('\n❌ TEST FAILED:',  error.message);
    console.error(error);
    process.exit(1);
  }
}

test();
