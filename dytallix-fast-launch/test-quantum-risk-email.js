#!/usr/bin/env node

/**
 * Test script for quantum risk email submission
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';

// Sample test data
const testData = {
  email: 'test@example.com',
  formData: {
    industry: 'Finance & Banking',
    region: 'United States',
    dataTypes: ['PII (Personally Identifiable Information)', 'Financial Records'],
    cryptography: ['RSA-2048 (Legacy)', 'AES-256 (Symmetric)'],
    regulatoryRegime: 'SEC / NYDFS (US Finance)',
    orgSize: 'Enterprise (500 - 5000 employees)'
  },
  riskScores: {
    hndl: 75,
    crqc: 65
  }
};

async function testEmailSubmission() {
  console.log('Testing quantum risk email submission...\n');
  console.log('API URL:', API_URL);
  console.log('Test email:', testData.email);
  console.log('Risk Scores:', testData.riskScores);
  console.log('\nSending request...\n');

  try {
    const response = await fetch(`${API_URL}/api/quantum-risk/submit-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ SUCCESS!');
      console.log('Response:', JSON.stringify(data, null, 2));
      
      // In development mode, the email content is logged
      if (data.messageId) {
        console.log('\n📧 Email would be sent with:');
        console.log('- To:', testData.email);
        console.log('- BCC: hello@dytallix.com');
        console.log('- Subject: Your Quantum Risk Analysis Report');
        console.log('- Attachment: quantum-risk-analysis.pdf');
      }
    } else {
      console.error('❌ FAILED');
      console.error('Status:', response.status);
      console.error('Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('\nMake sure the server is running:');
    console.error('  cd /home/runner/work/dytallix/dytallix/dytallix-fast-launch');
    console.error('  PORT=3001 node server/index.js');
  }
}

// Run the test
testEmailSubmission();
