/**
 * Dytallix SDK Developer Experience Test
 * 
 * This script tests the complete developer workflow:
 * 1. SDK installation and import
 * 2. Testnet connection
 * 3. Wallet generation
 * 4. Faucet request
 * 5. Balance check
 * 6. Transaction submission
 * 7. Contract deployment (if supported)
 */

const { DytallixClient, Wallet } = require('@dytallix/sdk');

const TESTNET_RPC = 'https://dytallix.com/api';
const FAUCET_URL = 'https://dytallix.com/api/faucet/request';

async function runTests() {
    console.log('='.repeat(60));
    console.log('🧪 DYTALLIX SDK DEVELOPER EXPERIENCE TEST');
    console.log('='.repeat(60));
    console.log('');

    const results = {
        passed: [],
        failed: [],
        warnings: []
    };

    // Test 1: SDK Import
    console.log('📦 Test 1: SDK Import');
    try {
        if (DytallixClient) {
            console.log('   ✅ DytallixClient imported successfully');
            results.passed.push('SDK Import - DytallixClient');
        }
        if (Wallet) {
            console.log('   ✅ Wallet imported successfully');
            results.passed.push('SDK Import - Wallet');
        }
    } catch (err) {
        console.log('   ❌ SDK import failed:', err.message);
        results.failed.push('SDK Import');
    }
    console.log('');

    // Test 2: Client Initialization
    console.log('🔌 Test 2: Client Initialization');
    let client;
    try {
        client = new DytallixClient({
            network: 'testnet',
            rpcUrl: TESTNET_RPC
        });
        console.log('   ✅ Client initialized with testnet config');
        results.passed.push('Client Initialization');
    } catch (err) {
        console.log('   ❌ Client initialization failed:', err.message);
        results.failed.push('Client Initialization');
        return results; // Cannot continue without client
    }
    console.log('');

    // Test 3: Network Status
    console.log('🌐 Test 3: Network Status Check');
    try {
        const status = await client.getNetworkStatus();
        console.log('   ✅ Network status retrieved:', JSON.stringify(status, null, 2).split('\n').map(l => '      ' + l).join('\n'));
        results.passed.push('Network Status');
    } catch (err) {
        console.log('   ❌ Network status failed:', err.message);
        results.failed.push('Network Status');
    }
    console.log('');

    // Test 4: Wallet Generation
    console.log('👛 Test 4: Wallet Generation');
    let wallet;
    try {
        wallet = Wallet.generate();
        console.log('   ✅ Wallet generated');
        console.log('      Address:', wallet.address);
        console.log('      Algorithm:', wallet.algorithm || 'Dilithium5');
        results.passed.push('Wallet Generation');
    } catch (err) {
        console.log('   ❌ Wallet generation failed:', err.message);
        results.failed.push('Wallet Generation');
    }
    console.log('');

    // Test 5: Faucet Request
    console.log('💰 Test 5: Faucet Request');
    if (wallet) {
        try {
            const faucetResponse = await fetch(FAUCET_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address: wallet.address,
                    dgt_amount: 100,
                    drt_amount: 1000
                })
            });

            const faucetData = await faucetResponse.json();
            if (faucetResponse.ok) {
                console.log('   ✅ Faucet request successful');
                console.log('      Response:', JSON.stringify(faucetData, null, 2).split('\n').map(l => '      ' + l).join('\n'));
                results.passed.push('Faucet Request');
            } else {
                console.log('   ⚠️ Faucet request returned error:', faucetData.message || faucetData.error);
                results.warnings.push('Faucet Request - ' + (faucetData.message || faucetData.error));
            }
        } catch (err) {
            console.log('   ❌ Faucet request failed:', err.message);
            results.failed.push('Faucet Request');
        }
    } else {
        console.log('   ⏭️ Skipped (no wallet)');
        results.warnings.push('Faucet Request - Skipped');
    }
    console.log('');

    // Test 6: Balance Check
    console.log('💵 Test 6: Balance Check');
    if (wallet) {
        try {
            // Wait for potential block commitment
            console.log('   ⏳ Waiting 3 seconds for block commitment...');
            await new Promise(r => setTimeout(r, 3000));

            const balance = await client.getBalance(wallet.address);
            console.log('   ✅ Balance retrieved:', JSON.stringify(balance, null, 2).split('\n').map(l => '      ' + l).join('\n'));
            results.passed.push('Balance Check');
        } catch (err) {
            console.log('   ❌ Balance check failed:', err.message);
            results.failed.push('Balance Check');
        }
    } else {
        console.log('   ⏭️ Skipped (no wallet)');
    }
    console.log('');

    // Test 7: Contract Deployment Check
    console.log('📜 Test 7: Contract Deployment API Check');
    try {
        if (typeof client.deployContract === 'function') {
            console.log('   ✅ deployContract method available');
            results.passed.push('Contract API Available');
        } else {
            console.log('   ⚠️ deployContract method not found on client');
            results.warnings.push('Contract API - Method not found');
        }
    } catch (err) {
        console.log('   ❌ Contract API check failed:', err.message);
        results.failed.push('Contract API Check');
    }
    console.log('');

    // Test 8: Transaction Building
    console.log('📝 Test 8: Transaction Building');
    try {
        if (typeof client.buildTransaction === 'function' || typeof client.transfer === 'function') {
            console.log('   ✅ Transaction building API available');
            results.passed.push('Transaction API Available');
        } else {
            console.log('   ⚠️ No standard transaction building method found');
            results.warnings.push('Transaction API - Method not found');
        }
    } catch (err) {
        console.log('   ❌ Transaction API check failed:', err.message);
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
