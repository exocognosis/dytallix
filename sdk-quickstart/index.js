#!/usr/bin/env node

/**
 * Simple SDK Status Check
 * 
 * Quick verification that the SDK is installed and working.
 * This is the minimal example from the README.
 */

async function main() {
  const { DytallixClient } = await import('@dytallix/sdk');
  
  const client = new DytallixClient({
    rpcUrl: process.env.RPC_URL || 'https://rpc.testnet.dytallix.network',
    chainId: process.env.CHAIN_ID || 'dyt-testnet-1'
  });
  
  try {
    const status = await client.getStatus();
    console.log('✅ Dytallix SDK is working!');
    console.log(`   RPC: ${process.env.RPC_URL || 'https://rpc.testnet.dytallix.network'}`);
    console.log(`   Chain ID: ${status.chain_id || 'dyt-testnet-1'}`);
    console.log(`   Block height: ${status.block_height}`);
  } catch (error) {
    console.error('❌ Failed to connect:', error.message);
    console.error('\nℹ️  Try the full demo with fallback: npm run demo');
    process.exit(1);
  }
}

main();
