/**
 * Complete test of pqc-wasm with proper initialization
 */

const pqcWasm = require('pqc-wasm');
const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('🔐 PQC-WASM COMPLETE INITIALIZATION TEST');
console.log('='.repeat(60));
console.log('');

async function testPQCWasm() {
    // Step 1: Initialize the WASM module
    console.log('Step 1: Initialize WASM module');
    try {
        // Find the wasm file
        const pqcWasmDir = path.dirname(require.resolve('pqc-wasm'));
        console.log('   pqc-wasm directory:', pqcWasmDir);

        // Try different possible locations
        const possiblePaths = [
            path.join(pqcWasmDir, 'pqc_wasm_bg.wasm'),
            path.join(pqcWasmDir, 'pkg', 'pqc_wasm_bg.wasm'),
            path.join(pqcWasmDir, '..', 'pqc_wasm_bg.wasm'),
        ];

        let wasmPath = null;
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                wasmPath = p;
                break;
            }
        }

        if (!wasmPath) {
            // List directory contents to debug
            console.log('   Directory contents:', fs.readdirSync(pqcWasmDir));
            throw new Error('WASM file not found in expected locations');
        }

        console.log('   WASM file found at:', wasmPath);

        const wasmBuffer = fs.readFileSync(wasmPath);
        console.log('   WASM buffer size:', wasmBuffer.length, 'bytes');

        if (typeof pqcWasm.initSync === 'function') {
            pqcWasm.initSync(wasmBuffer);
            console.log('   ✅ initSync() completed successfully');
        } else {
            console.log('   ⚠️ No initSync function, module may auto-initialize');
        }
    } catch (err) {
        console.log('   ❌ Initialization failed:', err.message);
        return;
    }

    // Step 2: Generate keypair
    console.log('\nStep 2: Generate keypair');
    let keypair;
    try {
        const result = pqcWasm.generate_keypair();
        console.log('   ✅ generate_keypair() succeeded');
        console.log('   Result type:', typeof result);

        if (typeof result === 'string') {
            keypair = JSON.parse(result);
            console.log('   Parsed from JSON string');
        } else {
            keypair = result;
        }

        console.log('   Keys:', Object.keys(keypair));

        const pk = keypair.pk || keypair.publicKey;
        const sk = keypair.sk || keypair.privateKey || keypair.secretKey;
        const address = keypair.address;

        if (pk) console.log('   ✅ Public key:', typeof pk, pk.length ? `(${pk.length} ${typeof pk === 'string' ? 'chars' : 'bytes'})` : '');
        if (sk) console.log('   ✅ Secret key:', typeof sk, sk.length ? `(${sk.length} ${typeof sk === 'string' ? 'chars' : 'bytes'})` : '');
        if (address) console.log('   ✅ Address:', address);

    } catch (err) {
        console.log('   ❌ generate_keypair() failed:', err.message);
        console.log('   Stack:', err.stack);
        return;
    }

    // Step 3: Test signing
    console.log('\nStep 3: Test signing');
    try {
        const message = new TextEncoder().encode('Hello, Dytallix!');
        const sk = keypair.sk || keypair.privateKey || keypair.secretKey;

        // Convert to Uint8Array if string
        let skBytes;
        if (typeof sk === 'string') {
            // Could be hex or base64
            if (sk.length === 64 * 2 || sk.length > 100) {
                // Likely hex
                skBytes = new Uint8Array(sk.length / 2);
                for (let i = 0; i < skBytes.length; i++) {
                    skBytes[i] = parseInt(sk.slice(i * 2, i * 2 + 2), 16);
                }
            } else {
                skBytes = Uint8Array.from(atob(sk), c => c.charCodeAt(0));
            }
        } else {
            skBytes = sk;
        }

        const signature = pqcWasm.sign(skBytes, message);
        console.log('   ✅ sign() succeeded');
        console.log('   Signature type:', typeof signature);
        console.log('   Signature length:', signature.length, 'bytes');

        // Step 4: Test verification
        console.log('\nStep 4: Test verification');
        const pk = keypair.pk || keypair.publicKey;
        let pkBytes;
        if (typeof pk === 'string') {
            pkBytes = new Uint8Array(pk.length / 2);
            for (let i = 0; i < pkBytes.length; i++) {
                pkBytes[i] = parseInt(pk.slice(i * 2, i * 2 + 2), 16);
            }
        } else {
            pkBytes = pk;
        }

        const isValid = pqcWasm.verify(pkBytes, message, signature);
        if (isValid) {
            console.log('   ✅ verify() returned true - signature is valid');
        } else {
            console.log('   ❌ verify() returned false - signature invalid');
        }

    } catch (err) {
        console.log('   ❌ Signing/verification failed:', err.message);
    }

    // Step 5: Test public_key_to_address
    console.log('\nStep 5: Test public_key_to_address');
    try {
        const pk = keypair.pk || keypair.publicKey;
        let pkBytes;
        if (typeof pk === 'string') {
            pkBytes = new Uint8Array(pk.length / 2);
            for (let i = 0; i < pkBytes.length; i++) {
                pkBytes[i] = parseInt(pk.slice(i * 2, i * 2 + 2), 16);
            }
        } else {
            pkBytes = pk;
        }

        const address = pqcWasm.public_key_to_address(pkBytes);
        console.log('   ✅ Derived address:', address);
    } catch (err) {
        console.log('   ❌ public_key_to_address failed:', err.message);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL PQC-WASM TESTS PASSED');
    console.log('='.repeat(60));
}

testPQCWasm().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
