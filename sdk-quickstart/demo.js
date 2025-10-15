#!/usr/bin/env node

/**
 * Dytallix SDK Quickstart Demo
 * 
 * This script demonstrates the complete onboarding experience for new developers:
 * 1. Attempt to connect to the live testnet RPC
 * 2. If unreachable, start a local mock RPC and reconnect
 * 3. Verify the SDK works by fetching block height
 * 4. (Optional) Generate a PQC wallet
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

const TESTNET_RPC = 'https://rpc.testnet.dytallix.network';
const MOCK_RPC = 'http://localhost:26657';
const CHAIN_ID = 'dyt-testnet-1';

let mockServer = null;

/**
 * Test if SDK can connect to an RPC endpoint
 */
async function testConnection(rpcUrl) {
  console.log(`\n🔍 Testing connection to: ${rpcUrl}`);
  
  try {
    // Use dynamic import to load the SDK
    const { DytallixClient } = await import('@dytallix/sdk');
    
    const client = new DytallixClient({
      rpcUrl,
      chainId: CHAIN_ID,
      timeout: 10000
    });
    
    const status = await client.getStatus();
    return { success: true, status, client };
  } catch (error) {
    return { success: false, error };
  }
}

/**
 * Start the mock RPC server
 */
async function startMockServer() {
  console.log('\n🚀 Starting local mock RPC server...');
  
  return new Promise((resolve, reject) => {
    mockServer = spawn('node', ['mock-rpc.js'], {
      stdio: 'pipe',
      cwd: process.cwd()
    });
    
    let output = '';
    
    mockServer.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
      
      // Server is ready when we see the running message
      if (output.includes('RUNNING')) {
        setTimeout(500).then(() => resolve());
      }
    });
    
    mockServer.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    
    mockServer.on('error', reject);
    
    // Timeout after 5 seconds
    setTimeout(5000).then(() => {
      if (!output.includes('RUNNING')) {
        reject(new Error('Mock server failed to start'));
      }
    });
  });
}

/**
 * Stop the mock server
 */
function stopMockServer() {
  if (mockServer) {
    console.log('\n🛑 Stopping mock RPC server...');
    mockServer.kill();
    mockServer = null;
  }
}

/**
 * Print success banner
 */
function printSuccess(rpcUrl, status) {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  ✅ Dytallix SDK Verified!                                ║
║                                                            ║
║  RPC:          ${rpcUrl.padEnd(40)} ║
║  Chain ID:     ${(status.chain_id || CHAIN_ID).padEnd(40)} ║
║  Block Height: ${String(status.block_height).padEnd(40)} ║
║                                                            ║
║  Your SDK is working correctly! 🎉                        ║
╚════════════════════════════════════════════════════════════╝
  `);
}

/**
 * Demonstrate PQC wallet generation
 */
async function demonstratePQCWallet() {
  console.log('\n📝 PQC Wallet Generation Demo');
  console.log('━'.repeat(60));
  
  try {
    console.log('\nℹ️  Note: PQC wallet generation requires @dytallix/pqc-wasm');
    console.log('   This is an optional peer dependency.');
    console.log('\n   To enable PQC wallets, run:');
    console.log('   npm install @dytallix/pqc-wasm\n');
    
    // Try to import and initialize PQC
    const { PQCWallet, initPQC } = await import('@dytallix/sdk');
    
    console.log('🔐 Initializing PQC cryptography...');
    await initPQC();
    
    console.log('🔑 Generating ML-DSA (Dilithium) wallet...');
    const wallet = await PQCWallet.generate('ML-DSA');
    
    console.log(`\n✅ Wallet generated successfully!`);
    console.log(`   Address:    ${wallet.address}`);
    console.log(`   Algorithm:  ${wallet.algorithm}`);
    console.log(`   Public Key: ${wallet.getPublicKey().slice(0, 32)}...`);
    
  } catch (error) {
    console.log(`\n⚠️  PQC wallet generation not available: ${error.message}`);
    console.log('   This is expected if @dytallix/pqc-wasm is not installed.');
  }
}

/**
 * Print next steps
 */
function printNextSteps() {
  console.log('\n📚 Next Steps:');
  console.log('━'.repeat(60));
  console.log('');
  console.log('1. 🏗️  Install Dytallix CLI:');
  console.log('   npm install -g @dytallix/cli');
  console.log('');
  console.log('2. 📖 Read the documentation:');
  console.log('   https://docs.dytallix.network');
  console.log('');
  console.log('3. 🐳 Run a local node with Docker:');
  console.log('   docker run -p 26657:26657 dytallix/node:latest');
  console.log('');
  console.log('4. 💰 Get testnet tokens:');
  console.log('   Visit https://faucet.testnet.dytallix.network');
  console.log('');
  console.log('5. 🔨 Build something amazing!');
  console.log('   Check out examples/ directory for more demos');
  console.log('');
}

/**
 * Main execution flow
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🌟 Dytallix SDK Quickstart                              ║');
  console.log('║                                                            ║');
  console.log('║  Welcome! This script will verify your SDK installation   ║');
  console.log('║  and demonstrate basic functionality.                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  // Try testnet first
  let result = await testConnection(TESTNET_RPC);
  let rpcUrl = TESTNET_RPC;
  
  if (!result.success) {
    console.log(`❌ Testnet RPC not reachable: ${result.error.message}`);
    console.log('   This is okay! We\'ll use a local mock server instead.');
    
    // Start mock server
    try {
      await startMockServer();
      
      // Try mock connection
      result = await testConnection(MOCK_RPC);
      rpcUrl = MOCK_RPC;
      
      if (!result.success) {
        console.error('\n❌ Failed to connect to mock server:', result.error.message);
        stopMockServer();
        process.exit(1);
      }
    } catch (error) {
      console.error('\n❌ Failed to start mock server:', error.message);
      process.exit(1);
    }
  } else {
    console.log('✅ Connected to testnet RPC successfully!');
  }
  
  // Print success
  printSuccess(rpcUrl, result.status);
  
  // Demonstrate PQC wallet (optional)
  const enablePQCDemo = process.argv.includes('--with-pqc') || process.argv.includes('-p');
  if (enablePQCDemo) {
    await demonstratePQCWallet();
  }
  
  // Print next steps
  printNextSteps();
  
  // Cleanup
  stopMockServer();
  
  console.log('✨ Quickstart complete!\n');
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  stopMockServer();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopMockServer();
  process.exit(0);
});

// Run
main().catch((error) => {
  console.error('\n💥 Unexpected error:', error);
  stopMockServer();
  process.exit(1);
});
