/**
 * Backend selection example for @dyt/pqc
 * 
 * Demonstrates how to select and compare different backends
 * 
 * Run: node examples/backend-selection.js
 */

import { createProvider, ProviderWasm, ProviderNative } from '../dist/index.js';

async function testBackend(name, providerFn) {
  console.log(`\n=== Testing ${name} Backend ===`);
  
  try {
    const provider = await providerFn();
    console.log(`✓ ${provider.name} backend initialized (v${provider.version})`);
    
    // Quick operation test
    const start = Date.now();
    const keypair = await provider.keygen();
    const keygenTime = Date.now() - start;
    console.log(`  Keygen: ${keygenTime}ms`);
    
    const message = new TextEncoder().encode('Performance test');
    const signStart = Date.now();
    const { signature } = await provider.sign(message, keypair.secretKey);
    const signTime = Date.now() - signStart;
    console.log(`  Sign: ${signTime}ms`);
    
    const verifyStart = Date.now();
    const { ok } = await provider.verify(message, signature, keypair.publicKey);
    const verifyTime = Date.now() - verifyStart;
    console.log(`  Verify: ${verifyTime}ms`);
    console.log(`  Result: ${ok ? '✓ Valid' : '✗ Invalid'}`);
    
    return { name: provider.name, keygenTime, signTime, verifyTime };
  } catch (err) {
    console.log(`✗ ${name} backend failed: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('PQC Backend Selection Example\n');
  
  const results = [];
  
  // 1. Auto-select (default)
  results.push(
    await testBackend('Auto', () => createProvider())
  );
  
  // 2. Explicit WASM
  results.push(
    await testBackend('WASM (explicit)', () => createProvider({ backend: 'wasm' }))
  );
  
  // 3. Direct WASM provider
  results.push(
    await testBackend('WASM (direct)', async () => {
      const p = new ProviderWasm();
      await p.init();
      return p;
    })
  );
  
  // 4. Native (will likely fail without native addon)
  results.push(
    await testBackend('Native', () => createProvider({ backend: 'native' }))
  );
  
  // 5. Custom HRP
  results.push(
    await testBackend('WASM (custom HRP)', async () => {
      const provider = await createProvider({ backend: 'wasm', hrp: 'test' });
      const keypair = await provider.keygen();
      const address = await provider.addressFromPublicKey(keypair.publicKey);
      console.log(`  Custom address: ${address}`);
      return provider;
    })
  );
  
  // Summary
  console.log('\n=== Performance Summary ===');
  const successful = results.filter(r => r !== null);
  if (successful.length > 0) {
    console.log('\nBackend          Keygen    Sign    Verify');
    console.log('─────────────────────────────────────────');
    successful.forEach(r => {
      console.log(
        `${r.name.padEnd(16)} ${r.keygenTime.toString().padStart(5)}ms  ` +
        `${r.signTime.toString().padStart(4)}ms  ${r.verifyTime.toString().padStart(6)}ms`
      );
    });
  }
  
  console.log('\n=== Environment Variables ===');
  console.log('Set DYT_PQC_BACKEND or PQC_BACKEND to control backend:');
  console.log('  export DYT_PQC_BACKEND=wasm    # Force WASM');
  console.log('  export DYT_PQC_BACKEND=native  # Prefer native, fallback to WASM');
  console.log('  export DYT_PQC_BACKEND=auto    # Auto-select (default)');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
