#!/usr/bin/env node

/**
 * Quick test script to verify QuantumVault API connectivity
 */

const testAPIConnection = async (url, name) => {
  try {
    console.log(`\n🔍 Testing ${name} at ${url}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${name} is connected and healthy`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, JSON.stringify(data, null, 2));
      return true;
    } else {
      console.log(`❌ ${name} returned error status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name} connection failed: ${error.message}`);
    return false;
  }
};

const main = async () => {
  console.log('🚀 QuantumVault API Connection Test');
  console.log('=====================================');
  
  const results = await Promise.all([
    testAPIConnection('http://localhost:3031/health', 'QuantumVault API'),
    testAPIConnection('http://localhost:3001/health', 'Backend API')
  ]);
  
  const allConnected = results.every(result => result);
  
  console.log('\n📊 Summary:');
  console.log('===========');
  if (allConnected) {
    console.log('✅ All services are connected and healthy!');
    console.log('🌐 You can now use QuantumVault at: http://localhost:3000#/quantumvault');
  } else {
    console.log('⚠️  Some services are not responding. Check the logs above.');
    console.log('💡 Try running: ./start-quantumvault.sh');
  }
};

main().catch(console.error);
