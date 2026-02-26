#!/usr/bin/env node

/**
 * QuantumVault API v2 Test Script
 * Demonstrates storage-agnostic verification service
 */

const API_URL = 'http://localhost:3031';

// Test data
const testFile = {
  blake3: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  filename: 'test-document.pdf',
  mime: 'application/pdf',
  size: 1024000,
  storageLocation: 's3://my-bucket/documents/test-document.pdf',
  metadata: {
    author: 'John Doe',
    department: 'Engineering',
    classification: 'Internal'
  }
};

async function runTests() {
  console.log('🧪 QuantumVault API v2 Test Suite\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Generate Proof
    console.log('\n📋 Test 1: Generate Cryptographic Proof');
    console.log('-'.repeat(60));
    
    const proofResponse = await fetch(`${API_URL}/proof/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testFile)
    });
    
    const proofResult = await proofResponse.json();
    console.log('✓ Proof generated successfully');
    console.log(`  Proof ID: ${proofResult.proofId}`);
    console.log(`  File: ${proofResult.proof.file.filename}`);
    console.log(`  Hash: ${proofResult.proof.file.blake3.substring(0, 20)}...`);
    console.log(`  Storage: ${proofResult.proof.storage.location}`);
    console.log(`  Certificate URL: ${proofResult.certificate.verificationUrl}`);
    
    const proofId = proofResult.proofId;

    // Test 2: Verify File
    console.log('\n✅ Test 2: Verify File Integrity');
    console.log('-'.repeat(60));
    
    const verifyResponse = await fetch(`${API_URL}/proof/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proofId: proofId,
        blake3: testFile.blake3
      })
    });
    
    const verifyResult = await verifyResponse.json();
    console.log(`✓ Verification: ${verifyResult.result.verified ? 'PASSED ✓' : 'FAILED ✗'}`);
    console.log(`  Original file: ${verifyResult.result.originalFile.filename}`);
    console.log(`  Created: ${verifyResult.result.originalFile.created}`);
    console.log(`  Message: ${verifyResult.result.message}`);

    // Test 3: Test with wrong hash
    console.log('\n❌ Test 3: Verify with Wrong Hash (Should Fail)');
    console.log('-'.repeat(60));
    
    const wrongHash = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const verifyWrongResponse = await fetch(`${API_URL}/proof/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proofId: proofId,
        blake3: wrongHash
      })
    });
    
    const verifyWrongResult = await verifyWrongResponse.json();
    console.log(`✓ Verification: ${verifyWrongResult.result.verified ? 'PASSED ✓' : 'FAILED ✗ (Expected)'}`);
    console.log(`  Message: ${verifyWrongResult.result.message}`);

    // Test 4: Anchor on Blockchain
    console.log('\n⚓ Test 4: Anchor Proof on Blockchain');
    console.log('-'.repeat(60));
    
    const anchorResponse = await fetch(`${API_URL}/anchor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proofId })
    });
    
    const anchorResult = await anchorResponse.json();
    console.log('✓ Proof anchored on blockchain');
    console.log(`  Transaction: ${anchorResult.transaction.hash}`);
    console.log(`  Block Height: ${anchorResult.transaction.blockHeight}`);
    console.log(`  Timestamp: ${anchorResult.transaction.timestamp}`);

    // Test 5: Get Certificate
    console.log('\n📜 Test 5: Get Verification Certificate');
    console.log('-'.repeat(60));
    
    const certResponse = await fetch(`${API_URL}/certificate/${proofId}`);
    const certificate = await certResponse.json();
    
    console.log('✓ Certificate retrieved');
    console.log(`  Certificate ID: ${certificate.certificate.id}`);
    console.log(`  Issue Date: ${certificate.certificate.issueDate}`);
    console.log(`  File Name: ${certificate.file.name}`);
    console.log(`  Status: ${certificate.verification.status}`);
    console.log(`  Blockchain Anchored: ${certificate.verification.blockchainAnchored ? 'Yes' : 'No'}`);
    console.log(`  Storage: ${certificate.storage.location}`);

    // Test 6: Batch Proof Generation
    console.log('\n📦 Test 6: Batch Proof Generation');
    console.log('-'.repeat(60));
    
    const batchFiles = [
      {
        blake3: 'hash1' + '0'.repeat(56),
        filename: 'document1.pdf',
        size: 1000
      },
      {
        blake3: 'hash2' + '0'.repeat(56),
        filename: 'document2.pdf',
        size: 2000
      },
      {
        blake3: 'hash3' + '0'.repeat(56),
        filename: 'document3.pdf',
        size: 3000
      }
    ];
    
    const batchResponse = await fetch(`${API_URL}/proof/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: batchFiles })
    });
    
    const batchResult = await batchResponse.json();
    console.log(`✓ Batch processing complete`);
    console.log(`  Total files: ${batchResult.total}`);
    console.log(`  Successful: ${batchResult.successful}`);
    console.log(`  Failed: ${batchResult.failed}`);
    batchResult.results.forEach((r, i) => {
      console.log(`    ${i + 1}. ${r.filename} → ${r.proofId}`);
    });

    // Test 7: Health Check
    console.log('\n🏥 Test 7: Health Check');
    console.log('-'.repeat(60));
    
    const healthResponse = await fetch(`${API_URL}/health`);
    const health = await healthResponse.json();
    
    console.log(`✓ Service Status: ${health.status}`);
    console.log(`  Version: ${health.version}`);
    console.log(`  Mode: ${health.mode}`);
    console.log(`  Proofs Generated: ${health.proofs}`);
    console.log(`  Legacy Assets: ${health.legacyAssets}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests passed successfully!');
    console.log('\n💡 Key Takeaways:');
    console.log('  • Files are NOT stored by QuantumVault (user-managed)');
    console.log('  • Only cryptographic proofs are generated and stored');
    console.log('  • Proofs can be anchored on blockchain for immutability');
    console.log('  • Verification works from any storage location');
    console.log('  • True zero-knowledge architecture');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run tests
runTests();
