#!/usr/bin/env node

/**
 * Test the pq-signature function with various inputs
 */

// Mock the generateProofSignature function to test locally
const generateProofSignature = async (assetHash, algorithm = 'dilithium') => {
  console.log('[PQ-Signature] Generating proof signature (stub)', {
    assetHash,
    algorithm,
    hashType: typeof assetHash
  });
  
  // Validate and normalize assetHash
  const hashStr = typeof assetHash === 'string' ? assetHash : String(assetHash || 'unknown');
  const hashPrefix = hashStr.length >= 16 ? hashStr.substring(0, 16) : hashStr.padEnd(16, '0');
  
  // For development, return a mock signature
  const mockSignature = {
    algorithm: algorithm,
    signature: `mock_sig_${hashPrefix}_${Date.now()}`,
    publicKey: `mock_pub_${algorithm}_${Math.random().toString(36).substr(2, 16)}`,
    timestamp: new Date().toISOString(),
    version: '1.0'
  };
  
  // Simulate some processing time
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log('[PQ-Signature] Generated signature:', mockSignature);
  
  return mockSignature;
};

const testSignatureGeneration = async () => {
  console.log('🧪 Testing PQ Signature Generation');
  console.log('================================');

  const testCases = [
    { name: 'Valid hash', input: 'abc123def456789012345678' },
    { name: 'Short hash', input: 'abc123' },
    { name: 'Empty string', input: '' },
    { name: 'Undefined', input: undefined },
    { name: 'Null', input: null },
    { name: 'Number', input: 12345 },
    { name: 'Object (wrong type)', input: { hash: 'abc123' } }
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log(`   Input: ${JSON.stringify(testCase.input)}`);
    
    try {
      const result = await generateProofSignature(testCase.input);
      console.log(`   ✅ Success: ${result.signature}`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n🎉 All tests completed!');
};

testSignatureGeneration().catch(console.error);
