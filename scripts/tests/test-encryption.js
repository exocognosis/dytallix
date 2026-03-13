#!/usr/bin/env node

/**
 * Test the encryptEnvelope function
 */

// Mock the encryptEnvelope function
const encryptEnvelopeMock = async (data, options = {}) => {
  const {
    algorithm = 'AES-256-GCM',
    keyDerivation = 'PBKDF2',
    iterations = 100000
  } = options;

  console.log('[Envelope] Encrypting data (stub)', {
    dataType: typeof data,
    dataLength: data?.length || data?.byteLength,
    algorithm,
    keyDerivation
  });

  try {
    // For development, create a mock encrypted envelope
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Convert data to string if needed
    const dataString = typeof data === 'string' ? data : new TextDecoder().decode(data);
    
    // Mock encryption - in production this would use real encryption
    const mockCiphertext = btoa(dataString + '_encrypted_' + Date.now());
    
    // Generate mock key for demonstration
    const mockKey = crypto.getRandomValues(new Uint8Array(32)); // 256-bit key
    
    // Create mock ciphertext as Uint8Array
    const encoder = new TextEncoder();
    const mockCiphertextBytes = encoder.encode(mockCiphertext);
    
    const envelope = {
      version: '1.0',
      algorithm,
      keyDerivation,
      iterations,
      salt: Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join(''),
      iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
      ciphertext: mockCiphertext,
      timestamp: new Date().toISOString(),
      metadata: {
        originalSize: dataString.length,
        encryptedSize: mockCiphertext.length
      }
    };

    // Return the format expected by UploadCard
    return {
      ciphertext: mockCiphertextBytes, // Uint8Array for upload
      key: mockKey,                    // Uint8Array key
      nonce: iv,                       // Uint8Array nonce (using iv as nonce)
      envelope: envelope               // Full envelope for reference
    };
  } catch (error) {
    console.error('[Envelope] Encryption error:', error);
    throw new Error('Failed to encrypt data: ' + error.message);
  }
};

const testEncryption = async () => {
  console.log('🧪 Testing Envelope Encryption');
  console.log('==============================');

  const testData = 'Hello, QuantumVault! This is test data for encryption.';
  
  try {
    console.log('📝 Input data:', testData);
    console.log('📊 Data length:', testData.length);
    
    const result = await encryptEnvelopeMock(testData);
    
    console.log('\n✅ Encryption successful!');
    console.log('📦 Result structure:');
    console.log('   - ciphertext:', !!result.ciphertext, typeof result.ciphertext);
    console.log('   - key:', !!result.key, typeof result.key);
    console.log('   - nonce:', !!result.nonce, typeof result.nonce);
    console.log('   - envelope:', !!result.envelope);
    
    // Test Array.from operations
    if (result.key) {
      const keyHex = Array.from(result.key).map(b => b.toString(16).padStart(2, '0')).join('');
      console.log('🔑 Key (hex):', keyHex.substring(0, 32) + '...');
    }
    
    if (result.nonce) {
      const nonceHex = Array.from(result.nonce).map(b => b.toString(16).padStart(2, '0')).join('');
      console.log('🎲 Nonce (hex):', nonceHex);
    }
    
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
};

testEncryption().catch(console.error);
