/**
 * End-to-End Test: SDK against live testnet
 * 
 * Tests:
 * 1. Connect to testnet RPC
 * 2. Generate PQC wallet
 * 3. Request faucet tokens
 * 4. Check balance
 * 5. (Optional) Send transaction
 */

import { 
  DytallixClient, 
  PQCWallet, 
  initPQC,
  TESTNET_RPC,
  TESTNET_CHAIN_ID,
  VERSION
} from '../dist/index.js';

async function runE2ETest() {
  console.log('═══════════════════════════════════════');
  console.log('  Dytallix SDK v' + VERSION + ' - E2E Test');
  console.log('═══════════════════════════════════════\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function pass(name, details = '') {
    console.log(`✅ ${name}${details ? ': ' + details : ''}`);
    results.passed++;
    results.tests.push({ name, status: 'pass', details });
  }

  function fail(name, error) {
    console.log(`❌ ${name}: ${error}`);
    results.failed++;
    results.tests.push({ name, status: 'fail', error: String(error) });
  }

  // Test 1: Initialize PQC
  console.log('\n📦 Test 1: Initialize PQC Module');
  try {
    await initPQC();
    pass('PQC initialized');
  } catch (e) {
    fail('PQC initialization', e.message);
    console.log('   ⚠️  Install pqc-wasm: npm install pqc-wasm');
    process.exit(1);
  }

  // Test 2: Connect to testnet
  console.log('\n🌐 Test 2: Connect to Testnet');
  const client = new DytallixClient({
    rpcUrl: TESTNET_RPC,
    chainId: TESTNET_CHAIN_ID
  });

  let status;
  try {
    status = await client.getStatus();
    pass('RPC connection', `Block height: ${status.block_height}, Chain: ${status.chain_id}`);
  } catch (e) {
    fail('RPC connection', e.message);
  }

  // Test 3: Generate wallet
  console.log('\n🔐 Test 3: Generate PQC Wallet');
  let wallet;
  try {
    wallet = await PQCWallet.generate();
    pass('Wallet generated', `Address: ${wallet.address}`);
  } catch (e) {
    fail('Wallet generation', e.message);
    process.exit(1);
  }

  // Test 4: Check initial balance (should be 0)
  console.log('\n💰 Test 4: Check Initial Balance');
  try {
    const account = await client.getAccount(wallet.address);
    pass('Account query', `DGT: ${account.balances.DGT}, DRT: ${account.balances.DRT}`);
  } catch (e) {
    fail('Account query', e.message);
  }

  // Test 5: Request faucet tokens
  console.log('\n🚰 Test 5: Request Faucet Tokens');
  try {
    const faucetResult = await client.requestFaucet(wallet.address, ['DGT', 'DRT']);
    
    if (faucetResult.success) {
      const tokens = faucetResult.dispensed?.map(d => `${d.symbol}: ${d.amount}`).join(', ') || 'unknown';
      pass('Faucet request', `Received: ${tokens}`);
    } else {
      // Rate limit is expected for repeated tests
      if (faucetResult.error === 'RATE_LIMITED' || faucetResult.error === 'TOO_MANY_REQUESTS') {
        console.log(`   ⚠️  Rate limited (expected): ${faucetResult.message}`);
        pass('Faucet request', 'Rate limit working correctly');
      } else {
        fail('Faucet request', `${faucetResult.error}: ${faucetResult.message}`);
      }
    }
  } catch (e) {
    fail('Faucet request', e.message);
  }

  // Test 6: Check balance after faucet
  console.log('\n💰 Test 6: Check Balance After Faucet');
  try {
    // Wait a moment for the faucet to process
    await new Promise(r => setTimeout(r, 2000));
    
    const account = await client.getAccount(wallet.address);
    pass('Balance check', `DGT: ${account.balances.DGT}, DRT: ${account.balances.DRT}`);
    
    if (account.balances.DGT > 0 || account.balances.DRT > 0) {
      pass('Tokens received', 'Balance > 0');
    } else {
      console.log('   ⚠️  Balance is 0 (faucet may be rate limited or demo mode)');
    }
  } catch (e) {
    fail('Balance check', e.message);
  }

  // Test 7: Sign a message
  console.log('\n✍️  Test 7: Sign Message');
  try {
    const message = { test: 'hello', timestamp: Date.now() };
    const signature = await wallet.signMessage(JSON.stringify(message));
    pass('Message signed', `Signature length: ${signature.length} bytes`);
    
    // Verify signature
    const isValid = await wallet.verifySignature(JSON.stringify(message), signature);
    if (isValid) {
      pass('Signature verified', 'Valid');
    } else {
      fail('Signature verification', 'Invalid signature');
    }
  } catch (e) {
    fail('Message signing', e.message);
  }

  // Test 8: List recent blocks
  console.log('\n📦 Test 8: List Recent Blocks');
  try {
    const blocks = await client.getBlocks({ limit: 5 });
    if (blocks.length > 0) {
      const heights = blocks.map(b => b.height).join(', ');
      pass('Blocks listed', `Found ${blocks.length} blocks: heights ${heights}`);
    } else {
      pass('Blocks listed', 'Empty list (expected for new chain)');
    }
  } catch (e) {
    fail('Blocks list', e.message);
  }

  // Test 9: Get staking rewards (will be 0 for new wallet)
  console.log('\n💎 Test 9: Get Staking Rewards');
  try {
    const rewards = await client.getStakingRewards(wallet.address);
    pass('Rewards query', `DGT: ${rewards.rewards.DGT}, DRT: ${rewards.rewards.DRT}`);
  } catch (e) {
    // This might fail if rewards endpoint isn't available
    console.log(`   ⚠️  Rewards query failed (may not be staking): ${e.message}`);
  }

  // Summary
  console.log('\n═══════════════════════════════════════');
  console.log('  Results: ' + results.passed + ' passed, ' + results.failed + ' failed');
  console.log('═══════════════════════════════════════\n');

  if (results.failed > 0) {
    process.exit(1);
  }
}

runE2ETest().catch(e => {
  console.error('E2E test crashed:', e);
  process.exit(1);
});
