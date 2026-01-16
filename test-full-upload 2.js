#!/usr/bin/env node

/**
 * Test QuantumVault upload functionality similar to frontend
 */

const fs = require('fs');
const path = require('path');

// Create a test file
const createTestFile = () => {
  const testContent = `# Test Document

This is a test document for QuantumVault upload.
Created at: ${new Date().toISOString()}
Content: Lorem ipsum dolor sit amet, consectetur adipiscing elit.

## Features tested:
- File upload
- BLAKE3 hashing 
- XChaCha20-Poly1305 encryption
- Post-quantum signatures
- Blockchain anchoring
`;

  const testFileName = 'test-document.md';
  const testFilePath = path.join(__dirname, testFileName);
  
  fs.writeFileSync(testFilePath, testContent);
  console.log(`📄 Created test file: ${testFilePath}`);
  console.log(`📊 File size: ${fs.statSync(testFilePath).size} bytes`);
  
  return { testFilePath, testFileName, testContent };
};

const testQuantumVaultUpload = async () => {
  try {
    console.log('🚀 Testing QuantumVault Upload Flow');
    console.log('====================================');
    
    // Create test file
    const { testFilePath, testFileName, testContent } = createTestFile();
    
    // Read file
    const fileBuffer = fs.readFileSync(testFilePath);
    
    console.log('\n🔧 Step 1: File Upload Test');
    console.log('---------------------------');
    
    // Create FormData similar to what the frontend does
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    
    formData.append('file', fileBuffer, {
      filename: `test-${Date.now()}.enc`,
      contentType: 'application/octet-stream'
    });
    formData.append('original_filename', testFileName);
    formData.append('mime', 'text/markdown');
    formData.append('blake3', 'test-blake3-hash-' + Date.now());

    // Test the upload
    const response = await fetch('http://localhost:3031/upload', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    console.log(`📊 Upload Response Status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Upload successful!');
      console.log('📁 Upload result:', JSON.stringify(result, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Upload failed');
      console.log('📄 Error response:', errorText);
    }

    // Clean up test file
    fs.unlinkSync(testFilePath);
    console.log('🧹 Cleaned up test file');

  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
};

testQuantumVaultUpload().catch(console.error);
