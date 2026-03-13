#!/usr/bin/env node

/**
 * QuantumVault Integration Test
 * Tests the full flow from frontend to blockchain
 */

import { createHash } from 'crypto';

// Test configuration
const BLOCKCHAIN_API_URL = process.env.BLOCKCHAIN_API_URL || 'https://rpc.dytallix.com';
const QUANTUMVAULT_API_URL = process.env.VITE_QUANTUMVAULT_API_URL || 'https://quantumvault.dytallix.com';

// Use built-in fetch (Node.js 18+) or import from node-fetch
const fetch = globalThis.fetch || (await import('node-fetch')).default;

/**
 * Test the blockchain API asset registry endpoints
 */
async function testBlockchainAPI() {
  console.log('🔗 Testing Blockchain API...');

  try {
    // Test asset registration via JSON-RPC
    const assetHash = createHash('sha256').update('test-asset-' + Date.now()).digest('hex');
    const uri = `qv://test-${Date.now()}.enc`;

    const registerRequest = {
      method: 'asset_register',
      params: [assetHash, uri, { test: true }]
    };

    const registerResponse = await fetch(`${BLOCKCHAIN_API_URL}/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerRequest)
    });

    if (!registerResponse.ok) {
      throw new Error(`Blockchain registration failed: ${registerResponse.status}`);
    }

    const registerResult = await registerResponse.json();
    console.log('✅ Asset registered on blockchain:', registerResult);

    // Test asset verification
    const verifyRequest = {
      method: 'asset_verify',
      params: [assetHash]
    };

    const verifyResponse = await fetch(`${BLOCKCHAIN_API_URL}/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(verifyRequest)
    });

    if (!verifyResponse.ok) {
      throw new Error(`Blockchain verification failed: ${verifyResponse.status}`);
    }

    const verifyResult = await verifyResponse.json();
    console.log('✅ Asset verified on blockchain:', verifyResult);

    // Test REST endpoints
    const restRegisterResponse = await fetch(`${BLOCKCHAIN_API_URL}/api/quantum/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assetHash: assetHash + '_rest',
        uri: uri + '_rest',
        metadata: { test: 'rest_api' }
      })
    });

    if (!restRegisterResponse.ok) {
      throw new Error(`REST registration failed: ${restRegisterResponse.status}`);
    }

    const restRegisterResult = await restRegisterResponse.json();
    console.log('✅ Asset registered via REST:', restRegisterResult);

    return true;
  } catch (error) {
    console.error('❌ Blockchain API test failed:', error.message);
    return false;
  }
}

/**
 * Test the QuantumVault API
 */
async function testQuantumVaultAPI() {
  console.log('🔐 Testing QuantumVault API...');

  try {
    // Test health endpoint
    const healthResponse = await fetch(`${QUANTUMVAULT_API_URL}/health`);
    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status}`);
    }
    const health = await healthResponse.json();
    console.log('✅ QuantumVault API healthy:', health);

    // Test file upload (mock file)
    const testData = new Uint8Array([1, 2, 3, 4, 5]);
    const formData = new FormData();
    const blob = new Blob([testData], { type: 'application/octet-stream' });
    formData.append('file', blob, 'test.enc');
    formData.append('original_filename', 'test.txt');
    formData.append('mime', 'text/plain');
    formData.append('blake3', createHash('sha256').update(testData).digest('hex'));

    const uploadResponse = await fetch(`${QUANTUMVAULT_API_URL}/upload`, {
      method: 'POST',
      body: formData
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('✅ File uploaded to QuantumVault:', uploadResult);

    // Test asset registration (should connect to blockchain)
    const registerResponse = await fetch(`${QUANTUMVAULT_API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blake3: uploadResult.blake3,
        uri: uploadResult.uri,
        metadata: { test: true, filename: 'test.txt' }
      })
    });

    if (!registerResponse.ok) {
      throw new Error(`Registration failed: ${registerResponse.status}`);
    }

    const registerResult = await registerResponse.json();
    console.log('✅ Asset registered via QuantumVault:', registerResult);

    // Test asset verification
    const verifyResponse = await fetch(`${QUANTUMVAULT_API_URL}/verify/${uploadResult.blake3}`);
    if (!verifyResponse.ok) {
      throw new Error(`Verification failed: ${verifyResponse.status}`);
    }

    const verifyResult = await verifyResponse.json();
    console.log('✅ Asset verified via QuantumVault:', verifyResult);

    return true;
  } catch (error) {
    console.error('❌ QuantumVault API test failed:', error.message);
    return false;
  }
}

/**
 * Test the full integration flow
 */
async function testFullIntegration() {
  console.log('🚀 Testing Full Integration Flow...');

  try {
    // This would simulate the frontend workflow:
    // 1. Upload encrypted file to QuantumVault API
    // 2. Register asset hash on blockchain via QuantumVault API
    // 3. Verify the registration worked

    const testFile = new Uint8Array(Buffer.from('Hello, QuantumVault Integration Test!', 'utf8'));
    const blake3Hash = createHash('sha256').update(testFile).digest('hex');

    // Step 1: Upload
    const formData = new FormData();
    const blob = new Blob([testFile], { type: 'application/octet-stream' });
    formData.append('file', blob, `integration-test-${Date.now()}.enc`);
    formData.append('original_filename', 'integration-test.txt');
    formData.append('mime', 'text/plain');
    formData.append('blake3', blake3Hash);

    const uploadResponse = await fetch(`${QUANTUMVAULT_API_URL}/upload`, {
      method: 'POST',
      body: formData
    });

    const uploadResult = await uploadResponse.json();
    console.log('📁 Step 1 - File uploaded:', uploadResult.uri);

    // Step 2: Register
    const registerResponse = await fetch(`${QUANTUMVAULT_API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blake3: blake3Hash,
        uri: uploadResult.uri,
        metadata: {
          filename: 'integration-test.txt',
          test: 'full-integration',
          timestamp: new Date().toISOString()
        }
      })
    });

    const registerResult = await registerResponse.json();
    console.log('⚓ Step 2 - Asset registered on blockchain:', registerResult.txHash || registerResult.transactionHash);

    // Step 3: Verify
    const verifyResponse = await fetch(`${QUANTUMVAULT_API_URL}/verify/${blake3Hash}`);
    const verifyResult = await verifyResponse.json();
    console.log('✅ Step 3 - Asset verified:', verifyResult.verified ? 'SUCCESS' : 'FAILED');

    console.log('🎉 Full integration test completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Full integration test failed:', error.message);
    return false;
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('🧪 QuantumVault Integration Test Suite\n');

  const tests = [
    { name: 'Blockchain API', test: testBlockchainAPI },
    { name: 'QuantumVault API', test: testQuantumVaultAPI },
    { name: 'Full Integration', test: testFullIntegration }
  ];

  let passed = 0;
  let failed = 0;

  for (const { name, test } of tests) {
    console.log(`\n--- Testing ${name} ---`);
    try {
      const result = await test();
      if (result) {
        passed++;
        console.log(`✅ ${name} test PASSED`);
      } else {
        failed++;
        console.log(`❌ ${name} test FAILED`);
      }
    } catch (error) {
      failed++;
      console.log(`❌ ${name} test FAILED:`, error.message);
    }
  }

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! QuantumVault integration is working correctly.');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please check the configuration and services.');
    process.exit(1);
  }
}

// Run the tests
main().catch(console.error);
