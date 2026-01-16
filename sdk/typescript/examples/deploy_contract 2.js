/**
 * Dytallix SDK - Smart Contract Deployment Example
 * 
 * This example demonstrates deploying and interacting with a WASM smart contract.
 * 
 * Prerequisites:
 * - Node.js 18+
 * - A compiled WASM contract (e.g., counter.wasm)
 * - Testnet tokens from the faucet
 * 
 * Usage:
 *   node deploy_contract.js [path-to-wasm]
 */

import { DytallixClient, PQCWallet, initPQC, TESTNET_RPC } from '../dist/index.js';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  Dytallix SDK - Contract Deployment');
  console.log('═══════════════════════════════════════\n');

  // Initialize PQC module
  console.log('📦 Initializing PQC module...');
  await initPQC();
  console.log('✅ PQC initialized\n');

  // Connect to testnet
  console.log('🌐 Connecting to testnet...');
  const client = new DytallixClient({
    rpcUrl: TESTNET_RPC,
    chainId: 'dytallix-testnet-1'
  });

  const status = await client.getStatus();
  console.log(`✅ Connected: Block height ${status.block_height}\n`);

  // Generate wallet
  console.log('🔐 Generating PQC wallet...');
  const wallet = await PQCWallet.generate();
  console.log(`✅ Wallet: ${wallet.address}\n`);

  // Get testnet tokens
  console.log('🚰 Requesting faucet tokens...');
  const faucetResult = await client.requestFaucet(wallet.address, ['DGT', 'DRT']);
  if (faucetResult.success) {
    const dgt = faucetResult.dispensed.find(d => d.symbol === 'DGT');
    const drt = faucetResult.dispensed.find(d => d.symbol === 'DRT');
    console.log(`✅ Received: ${dgt?.amount || 0} DGT, ${drt?.amount || 0} DRT\n`);
  } else {
    console.log(`⚠️  Faucet: ${faucetResult.error || 'Unknown error'}\n`);
  }

  // Check for contract file
  const contractPath = process.argv[2];
  
  if (!contractPath) {
    console.log('═══════════════════════════════════════');
    console.log('  No contract file specified');
    console.log('═══════════════════════════════════════');
    console.log('\nUsage: node deploy_contract.js <path-to-wasm>\n');
    console.log('Example contracts can be found in smart-contracts/examples/');
    console.log('\nTo build a contract:');
    console.log('  cd smart-contracts/examples/counter');
    console.log('  cargo build --target wasm32-unknown-unknown --release');
    console.log('  node deploy_contract.js target/wasm32-unknown-unknown/release/counter.wasm');
    
    // Demo with mock deployment info
    console.log('\n--- Demo Mode (no actual deployment) ---\n');
    console.log('If contracts were enabled, you would use:');
    console.log(`
const result = await client.deployContract({
  code: wasmCode.toString('hex'),
  deployer: '${wallet.address}',
  gasLimit: 2_000_000
});
`);
    return;
  }

  // Read WASM file
  if (!fs.existsSync(contractPath)) {
    console.error(`❌ File not found: ${contractPath}`);
    process.exit(1);
  }

  const wasmCode = fs.readFileSync(contractPath);
  console.log(`📄 Contract file: ${path.basename(contractPath)}`);
  console.log(`   Size: ${wasmCode.length} bytes\n`);

  // Deploy contract
  console.log('🚀 Deploying contract...');
  try {
    const deployResult = await client.deployContract({
      code: wasmCode.toString('hex'),
      deployer: wallet.address,
      gasLimit: 2_000_000
    });

    console.log('✅ Contract deployed!');
    console.log(`   Address: ${deployResult.address}`);
    console.log(`   Tx Hash: ${deployResult.txHash}\n`);

    // Try calling a method
    console.log('📞 Calling contract method "get_count"...');
    try {
      const callResult = await client.callContract({
        address: deployResult.address,
        method: 'get_count',
        args: '',
        gasLimit: 500_000
      });

      console.log('✅ Contract called!');
      console.log(`   Result: ${callResult.result}`);
      console.log(`   Gas used: ${callResult.gasUsed}`);
      if (callResult.logs.length > 0) {
        console.log(`   Logs: ${callResult.logs.join(', ')}`);
      }
    } catch (callError) {
      console.log(`⚠️  Method call failed: ${callError.message}`);
    }

  } catch (error) {
    console.log(`❌ Deployment failed: ${error.message}`);
    console.log('\nNote: Smart contracts may not be enabled on testnet yet.');
    console.log('Check https://dytallix.com for contract availability.\n');
  }

  console.log('\n═══════════════════════════════════════');
  console.log('  Complete');
  console.log('═══════════════════════════════════════');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
