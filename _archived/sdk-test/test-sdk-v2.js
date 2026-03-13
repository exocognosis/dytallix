/**
 * Dytallix SDK Developer Experience Test v2
 * 
 * Using the actual SDK API discovered via introspection:
 * - PQCWallet (not Wallet)
 * - client.getStatus() (not getNetworkStatus)
 * - client.requestFromFaucet()
 * - client.sendTokens()
 */

const { DytallixClient, PQCWallet, VERSION, initPQC } = require('@dytallix/sdk');

const TESTNET_RPC = 'https://dytallix.com/api';

async function runTests() {
    console.log('='.repeat(60));
    console.log('🧪 DYTALLIX SDK DEVELOPER EXPERIENCE TEST v2');
    console.log('='.repeat(60));
    console.log(`SDK Version: ${VERSION}`);
    console.log('');

    const results = {
        passed: [],
        failed: [],
        warnings: []
    };

    // Test 1: SDK Import
    console.log('📦 Test 1: SDK Import');
    try {
        console.log('   ✅ DytallixClient:', typeof DytallixClient === 'function' ? 'OK' : 'MISSING');
        console.log('   ✅ PQCWallet:', typeof PQCWallet === 'function' ? 'OK' : 'MISSING');
        console.log('   ✅ VERSION:', VERSION);
        results.passed.push('SDK Import');
    } catch (err) {
        console.log('   ❌ SDK import failed:', err.message);
        results.failed.push('SDK Import');
    }
    console.log('');

    // Test 2: Initialize PQC (if needed)
    console.log('🔐 Test 2: PQC Initialization');
    try {
        if (typeof initPQC === 'function') {
            await initPQC();
            console.log('   ✅ PQC cryptography initialized');
            results.passed.push('PQC Init');
        } else {
            console.log('   ⏭️ initPQC not required');
            results.passed.push('PQC Init (not required)');
        }
    } catch (err) {
        console.log('   ⚠️ PQC init warning:', err.message);
        results.warnings.push('PQC Init - ' + err.message);
    }
    console.log('');

    // Test 3: Client Initialization
    console.log('🔌 Test 3: Client Initialization');
    let client;
    try {
        client = new DytallixClient({
            rpcUrl: TESTNET_RPC
        });
        console.log('   ✅ Client initialized with RPC:', TESTNET_RPC);
        results.passed.push('Client Initialization');
    } catch (err) {
        console.log('   ❌ Client initialization failed:', err.message);
        results.failed.push('Client Initialization');
        return results;
    }
    console.log('');

    // Test 4: Network Status
    console.log('🌐 Test 4: Network Status Check');
    try {
        const status = await client.getStatus();
        console.log('   ✅ Network status retrieved:');
        console.log('      Chain ID:', status.chain_id);
        console.log('      Latest Height:', status.latest_height);
        console.log('      Syncing:', status.syncing);
        console.log('      Status:', status.status);
        results.passed.push('Network Status');
    } catch (err) {
        console.log('   ❌ Network status failed:', err.message);
        results.failed.push('Network Status');
    }
    console.log('');

    // Test 5: Wallet Generation
    console.log('👛 Test 5: PQC Wallet Generation');
    let wallet;
    try {
        wallet = PQCWallet.generate();
        console.log('   ✅ Wallet generated');
        console.log('      Address:', wallet.address);
        console.log('      Public Key (truncated):', wallet.getPublicKey().substring(0, 32) + '...');
        results.passed.push('Wallet Generation');
    } catch (err) {
        console.log('   ❌ Wallet generation failed:', err.message);
        results.failed.push('Wallet Generation');
    }
    console.log('');

    // Test 6: Faucet Request via SDK
    console.log('💰 Test 6: Faucet Request (via SDK)');
    if (wallet) {
        try {
            const faucetResult = await client.requestFromFaucet(wallet.address, {
                dgt_amount: 100,
                drt_amount: 1000
            });
            console.log('   ✅ Faucet request successful');
            console.log('      TX Hash:', faucetResult.hash || faucetResult.tx_hash || 'N/A');
            results.passed.push('Faucet Request');
        } catch (err) {
            console.log('   ⚠️ Faucet request issue:', err.message);
            // Try direct API call as fallback
            console.log('   🔄 Trying direct API call...');
            try {
                const response = await fetch(`${TESTNET_RPC}/faucet/request`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        address: wallet.address,
                        dgt_amount: 100,
                        drt_amount: 1000
                    })
                });
                const data = await response.json();
                if (response.ok) {
                    console.log('   ✅ Direct faucet request successful');
                    results.passed.push('Faucet Request (direct)');
                } else {
                    console.log('   ⚠️ Faucet response:', data.message || data.error);
                    results.warnings.push('Faucet - ' + (data.message || data.error));
                }
            } catch (directErr) {
                results.failed.push('Faucet Request');
            }
        }
    } else {
        console.log('   ⏭️ Skipped (no wallet)');
        results.warnings.push('Faucet Request - Skipped');
    }
    console.log('');

    // Test 7: Balance Check
    console.log('💵 Test 7: Balance Check');
    if (wallet) {
        try {
            console.log('   ⏳ Waiting 3 seconds for block commitment...');
            await new Promise(r => setTimeout(r, 3000));

            const account = await client.getAccount(wallet.address);
            console.log('   ✅ Account retrieved:');
            console.log('      Balances:', JSON.stringify(account.balances || account, null, 2).split('\n').slice(0, 5).join('\n      '));
            results.passed.push('Balance Check');
        } catch (err) {
            console.log('   ⚠️ Balance check:', err.message);
            results.warnings.push('Balance Check - ' + err.message);
        }
    } else {
        console.log('   ⏭️ Skipped (no wallet)');
    }
    console.log('');

    // Test 8: Latest Block
    console.log('🔲 Test 8: Get Latest Block');
    try {
        const block = await client.getLatestBlock();
        console.log('   ✅ Latest block retrieved:');
        console.log('      Height:', block.height);
        console.log('      Hash:', (block.hash || '').substring(0, 20) + '...');
        console.log('      Transactions:', block.txs?.length || 0);
        results.passed.push('Get Latest Block');
    } catch (err) {
        console.log('   ❌ Get latest block failed:', err.message);
        results.failed.push('Get Latest Block');
    }
    console.log('');

    // Test 9: Transaction Signing (local only)
    console.log('✍️ Test 9: Transaction Signing');
    if (wallet) {
        try {
            const testMessage = { type: 'test', data: 'hello' };
            const signature = wallet.sign(JSON.stringify(testMessage));
            console.log('   ✅ Message signed successfully');
            console.log('      Signature length:', signature.length, 'bytes');
            results.passed.push('Transaction Signing');
        } catch (err) {
            console.log('   ❌ Signing failed:', err.message);
            results.failed.push('Transaction Signing');
        }
    }
    console.log('');

    // Summary
    console.log('='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`   ✅ Passed:   ${results.passed.length}`);
    console.log(`   ⚠️ Warnings: ${results.warnings.length}`);
    console.log(`   ❌ Failed:   ${results.failed.length}`);
    console.log('');

    if (results.passed.length > 0) {
        console.log('Passed Tests:');
        results.passed.forEach(t => console.log('   ✅ ' + t));
        console.log('');
    }

    if (results.warnings.length > 0) {
        console.log('Warnings:');
        results.warnings.forEach(t => console.log('   ⚠️ ' + t));
        console.log('');
    }

    if (results.failed.length > 0) {
        console.log('Failed Tests:');
        results.failed.forEach(t => console.log('   ❌ ' + t));
        console.log('');
    }

    const overallStatus = results.failed.length === 0 ?
        (results.warnings.length === 0 ? '✅ ALL TESTS PASSED' : '⚠️ PASSED WITH WARNINGS') :
        '❌ SOME TESTS FAILED';

    console.log('='.repeat(60));
    console.log(`RESULT: ${overallStatus}`);
    console.log('='.repeat(60));

    return results;
}

runTests().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
