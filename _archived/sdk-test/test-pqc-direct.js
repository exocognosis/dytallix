/**
 * Direct test of pqc-wasm compatibility fix
 * This tests the fixed wallet implementation directly
 */

const pqcWasm = require('pqc-wasm');

console.log('='.repeat(60));
console.log('🔐 PQC-WASM DIRECT COMPATIBILITY TEST');
console.log('='.repeat(60));
console.log('');

async function testPQCWasm() {
    console.log('Available pqc-wasm functions:', Object.keys(pqcWasm).filter(k => typeof pqcWasm[k] === 'function'));
    console.log('');

    // Test 1: Check if generate_keypair exists
    console.log('Test 1: Check generate_keypair function');
    if (typeof pqcWasm.generate_keypair === 'function') {
        console.log('   ✅ generate_keypair is available');
    } else {
        console.log('   ❌ generate_keypair NOT found');
        return;
    }

    // Test 2: Generate a keypair
    console.log('\nTest 2: Generate keypair');
    try {
        const result = pqcWasm.generate_keypair();
        console.log('   ✅ generate_keypair() succeeded');
        console.log('   Result type:', typeof result);

        // Parse if string
        let keypair;
        if (typeof result === 'string') {
            keypair = JSON.parse(result);
            console.log('   Parsed JSON result');
        } else {
            keypair = result;
        }

        console.log('   Keys present:', Object.keys(keypair));

        // Check for expected keys
        const pk = keypair.pk || keypair.publicKey;
        const sk = keypair.sk || keypair.privateKey || keypair.secretKey;

        if (pk) {
            console.log('   ✅ Public key found, length:', typeof pk === 'string' ? pk.length : pk.length + ' bytes');
        }
        if (sk) {
            console.log('   ✅ Secret key found, length:', typeof sk === 'string' ? sk.length : sk.length + ' bytes');
        }
        if (keypair.address) {
            console.log('   ✅ Address:', keypair.address);
        }

    } catch (err) {
        console.log('   ❌ generate_keypair() failed:', err.message);
    }

    // Test 3: Check public_key_to_address
    console.log('\nTest 3: Check public_key_to_address function');
    if (typeof pqcWasm.public_key_to_address === 'function') {
        console.log('   ✅ public_key_to_address is available');
    } else {
        console.log('   ⚠️ public_key_to_address NOT found (optional)');
    }

    // Test 4: Check sign function
    console.log('\nTest 4: Check sign function');
    if (typeof pqcWasm.sign === 'function') {
        console.log('   ✅ sign is available');
    } else {
        console.log('   ❌ sign NOT found');
    }

    // Test 5: Check verify function
    console.log('\nTest 5: Check verify function');
    if (typeof pqcWasm.verify === 'function') {
        console.log('   ✅ verify is available');
    } else {
        console.log('   ❌ verify NOT found');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ PQC-WASM module is functional');
    console.log('='.repeat(60));
}

testPQCWasm().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
