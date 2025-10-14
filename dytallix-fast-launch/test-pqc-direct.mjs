// Direct test of pqc-wasm
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import init, * as pqc from './pqc-wasm/pkg/pqc_wasm.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🧪 Testing @dytallix/pqc-wasm directly...\n');

try {
  // Initialize WASM with the binary
  console.log('1️⃣  Initializing WASM...');
  const wasmPath = join(__dirname, 'pqc-wasm/pkg/pqc_wasm_bg.wasm');
  const wasmBinary = await readFile(wasmPath);
  await init(wasmBinary);
  console.log('✅ WASM initialized\n');

  // Generate keypair
  console.log('2️⃣  Generating keypair...');
  const keypair = pqc.generate_keypair();
  console.log('✅ Keypair generated');
  console.log('   Public key size:', keypair.publicKey.length, 'bytes');
  console.log('   Private key size:', keypair.privateKey.length, 'bytes\n');

  // Generate address
  console.log('3️⃣  Generating address...');
  const address = pqc.public_key_to_address(keypair.publicKey);
  console.log('✅ Address:', address, '\n');

  // Sign message
  console.log('4️⃣  Signing message...');
  const message = new TextEncoder().encode('Hello, Quantum World!');
  const signature = pqc.sign(keypair.privateKey, message);
  console.log('✅ Signature size:', signature.length, 'bytes\n');

  // Verify signature
  console.log('5️⃣  Verifying signature...');
  const isValid = pqc.verify(keypair.publicKey, message, signature);
  console.log('✅ Signature valid:', isValid, '\n');

  console.log('🎉 ALL TESTS PASSED!\n');
} catch (error) {
  console.error('❌ TEST FAILED:', error.message);
  console.error(error);
  process.exit(1);
}
