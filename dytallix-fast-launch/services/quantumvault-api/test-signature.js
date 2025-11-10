/**
 * Test script to verify Dilithium signature compatibility
 * between JavaScript dilithium-crystals-js and Rust pqcrypto_dilithium
 */

import { createHash } from 'crypto';
import DilithiumModule from 'dilithium-crystals-js';

const dilithium = await DilithiumModule;

console.log('Testing Dilithium signature compatibility...\n');

// Generate keypair using kind 3 (Dilithium3/ML-DSA-65)
console.log('1. Generating Dilithium3 (ML-DSA-65) keypair...');
const { publicKey, privateKey } = dilithium.generateKeys(3);

console.log(`   Public key length: ${publicKey.length} bytes`);
console.log(`   Private key length: ${privateKey.length} bytes`);

// Create test message
const testMessage = 'Hello, Dytallix Blockchain!';
const messageBytes = Buffer.from(testMessage, 'utf-8');

// Hash the message (like we do for transactions)
const messageHash = createHash('sha3-256').update(messageBytes).digest();

console.log(`\n2. Test message: "${testMessage}"`);
console.log(`   SHA3-256 hash: ${messageHash.toString('hex')}`);

// Sign the hash
console.log('\n3. Signing the message hash...');
const { signature } = dilithium.sign(messageHash, privateKey, 3);

console.log(`   Signature length: ${signature.length} bytes`);
console.log(`   Signature (hex, first 64 bytes): ${Buffer.from(signature).toString('hex').substring(0, 128)}...`);

// Verify the signature
console.log('\n4. Verifying the signature...');
const isValid = dilithium.verify(messageHash, signature, publicKey, 3);

console.log(`   Verification result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);

// Output base64-encoded values for testing with the blockchain
console.log('\n5. Base64-encoded values for blockchain testing:');
console.log(`   Public key (base64): ${Buffer.from(publicKey).toString('base64')}`);
console.log(`   Signature (base64): ${Buffer.from(signature).toString('base64')}`);

// Check expected sizes for Dilithium3
console.log('\n6. Expected sizes for Dilithium3 (ML-DSA-65):');
console.log('   Expected public key: 1952 bytes');
console.log('   Expected private key: 4000 bytes');
console.log('   Expected signature: ~3293 bytes (varies)');

console.log('\n7. Actual sizes:');
console.log(`   Actual public key: ${publicKey.length} bytes ${publicKey.length === 1952 ? '✅' : '❌'}`);
console.log(`   Actual private key: ${privateKey.length} bytes ${privateKey.length === 4000 ? '✅' : '❌'}`);
console.log(`   Actual signature: ${signature.length} bytes`);

if (publicKey.length !== 1952 || privateKey.length !== 4000) {
    console.warn('\n⚠️  WARNING: Key sizes don\'t match Dilithium3 (ML-DSA-65) specifications!');
    console.warn('   This suggests the library might be using a different algorithm variant.');
    console.warn('   The blockchain expects Dilithium5 (ML-DSA-87) which has:');
    console.warn('   - Public key: 2592 bytes');
    console.warn('   - Private key: 4864 bytes');
    console.warn('   - Signature: ~4595 bytes');
    
    console.log('\n8. Testing with kind=5 (Dilithium5/ML-DSA-87)...');
    const { publicKey: pk5, privateKey: sk5 } = dilithium.generateKeys(5);
    const { signature: sig5 } = dilithium.sign(messageHash, sk5, 5);
    const valid5 = dilithium.verify(messageHash, sig5, pk5, 5);
    
    console.log(`   Public key length: ${pk5.length} bytes ${pk5.length === 2592 ? '✅' : '❌'}`);
    console.log(`   Private key length: ${sk5.length} bytes ${sk5.length === 4864 ? '✅' : '❌'}`);
    console.log(`   Signature length: ${sig5.length} bytes`);
    console.log(`   Verification: ${valid5 ? '✅ VALID' : '❌ INVALID'}`);
    
    if (pk5.length === 2592 && sk5.length === 4864) {
        console.log('\n✅ KIND=5 MATCHES DILITHIUM5 (ML-DSA-87)!');
        console.log('   Use kind=5 instead of kind=3 for blockchain compatibility.');
    }
}

console.log('\nTest complete.');
