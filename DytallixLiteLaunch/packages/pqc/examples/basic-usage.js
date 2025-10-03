/**
 * Basic usage example for @dyt/pqc provider API
 * 
 * Run: node examples/basic-usage.js
 */

import { createProvider } from '../dist/index.js';

async function main() {
  console.log('PQC Provider Example\n');
  
  // 1. Create provider (auto-selects best backend)
  console.log('Creating provider...');
  const provider = await createProvider();
  console.log(`Using ${provider.name} backend (v${provider.version})\n`);
  
  // 2. Generate keypair
  console.log('Generating keypair...');
  const keypair = await provider.keygen();
  console.log(`Public key: ${keypair.publicKey.length} bytes`);
  console.log(`Secret key: ${keypair.secretKey.length} bytes\n`);
  
  // 3. Sign a message
  const message = new TextEncoder().encode('Hello, Dytallix!');
  console.log(`Signing message: "${new TextDecoder().decode(message)}"`);
  
  const signResult = await provider.sign(message, keypair.secretKey);
  console.log(`Signature: ${signResult.signature.length} bytes\n`);
  
  // 4. Verify signature
  console.log('Verifying signature...');
  const verifyResult = await provider.verify(
    message,
    signResult.signature,
    keypair.publicKey
  );
  console.log(`Verification result: ${verifyResult.ok ? '✓ Valid' : '✗ Invalid'}\n`);
  
  // 5. Derive address
  console.log('Deriving address...');
  const address = await provider.addressFromPublicKey(keypair.publicKey);
  console.log(`Address: ${address}\n`);
  
  // 6. Test with wrong key (should fail)
  console.log('Testing with wrong key...');
  const wrongKeypair = await provider.keygen();
  const badVerify = await provider.verify(
    message,
    signResult.signature,
    wrongKeypair.publicKey
  );
  console.log(`Wrong key verification: ${badVerify.ok ? '✓ Valid' : '✗ Invalid (expected)'}\n`);
  
  // 7. Memory cleanup
  if (provider.zeroize) {
    console.log('Zeroizing secret key...');
    provider.zeroize(keypair.secretKey);
    console.log('Secret key zeroed (best effort)\n');
  }
  
  console.log('Example completed successfully!');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
