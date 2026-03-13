#!/usr/bin/env node

/**
 * Test the QuantumVault upload endpoint
 */

const testUpload = async () => {
  try {
    console.log('🔧 Testing QuantumVault upload endpoint...');
    
    // Create a simple test file
    const testContent = 'Hello, QuantumVault!';
    const testBlob = new Blob([testContent], { type: 'text/plain' });
    
    const formData = new FormData();
    formData.append('file', testBlob, 'test.txt');
    formData.append('original_filename', 'test.txt');
    formData.append('mime', 'text/plain');
    formData.append('blake3', 'test-hash-123');

    const response = await fetch('http://localhost:3031/upload', {
      method: 'POST',
      body: formData
    });

    console.log(`📊 Response status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Upload endpoint is working!');
      console.log('📁 Result:', JSON.stringify(result, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Upload failed');
      console.log('📄 Error response:', errorText);
    }
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
};

testUpload().catch(console.error);
