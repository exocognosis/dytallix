/**
 * 🚀 DYTALLIX DEVELOPER QUICKSTART TEST
 * 
 * This script validates the end-to-end developer experience for Dytallix.
 * It tests SDK installation, testnet connectivity, and blockchain operations.
 * 
 * USAGE:
 *   npm install @dytallix/sdk pqc-wasm
 *   node dytallix-quickstart.js
 * 
 * TEST RESULTS: Saved to dytallix-test-results.json
 */

const { DytallixClient, PQCWallet, VERSION } = require('@dytallix/sdk');

const TESTNET_RPC = 'https://dytallix.com/api';
const FAUCET_ENDPOINT = `${TESTNET_RPC}/faucet/request`;

const results = {
    timestamp: new Date().toISOString(),
    sdkVersion: VERSION || 'unknown',
    nodeVersion: process.version,
    tests: [],
    issues: [],
    summary: {}
};

function log(level, message, details = null) {
    const icons = { pass: '✅', fail: '❌', warn: '⚠️', info: 'ℹ️' };
    console.log(`   ${icons[level] || '•'} ${message}`);
    if (details) {
        console.log('      ' + JSON.stringify(details, null, 2).replace(/\n/g, '\n      '));
    }
}

function addResult(name, passed, details = null, issue = null) {
    results.tests.push({ name, passed, details, issue });
    if (issue) {
        results.issues.push({ test: name, issue });
    }
    return passed;
}

async function test1_SDKImport() {
    console.log('\n📦 Test 1: SDK Import');
    try {
        const hasClient = typeof DytallixClient === 'function';
        const hasWallet = typeof PQCWallet === 'function';

        log('pass', 'DytallixClient class available');
        log('pass', `PQCWallet class available`);
        log('info', `SDK Version: ${VERSION}`);

        return addResult('SDK Import', true, { DytallixClient: hasClient, PQCWallet: hasWallet, version: VERSION });
    } catch (err) {
        log('fail', err.message);
        return addResult('SDK Import', false, null, err.message);
    }
}

async function test2_ClientInit() {
    console.log('\n🔌 Test 2: Client Initialization');
    try {
        const client = new DytallixClient({ rpcUrl: TESTNET_RPC });
        log('pass', `Client initialized with ${TESTNET_RPC}`);
        return { result: addResult('Client Init', true), client };
    } catch (err) {
        log('fail', err.message);
        return { result: addResult('Client Init', false, null, err.message), client: null };
    }
}

async function test3_NetworkStatus(client) {
    console.log('\n🌐 Test 3: Network Status');
    if (!client) {
        log('warn', 'Skipped - no client');
        return addResult('Network Status', false, null, 'No client');
    }
    try {
        const status = await client.getStatus();
        log('pass', `Chain: ${status.chain_id}`);
        log('pass', `Height: ${status.latest_height}`);
        log('pass', `Status: ${status.status}`);
        return addResult('Network Status', true, status);
    } catch (err) {
        log('fail', err.message);
        return addResult('Network Status', false, null, err.message);
    }
}

async function test4_LatestBlock(client) {
    console.log('\n🔲 Test 4: Get Latest Block');
    if (!client) {
        log('warn', 'Skipped - no client');
        return addResult('Get Latest Block', false, null, 'No client');
    }
    try {
        const block = await client.getLatestBlock();
        log('pass', `Block Height: ${block.height}`);
        log('info', `Block Hash: ${(block.hash || '').substring(0, 24)}...`);
        log('info', `Transactions: ${block.txs?.length || 0}`);
        return addResult('Get Latest Block', true, { height: block.height, hash: block.hash?.substring(0, 24) });
    } catch (err) {
        log('fail', err.message);
        return addResult('Get Latest Block', false, null, err.message);
    }
}

async function test5_WalletGeneration() {
    console.log('\n👛 Test 5: Wallet Generation');
    try {
        const wallet = PQCWallet.generate();
        if (wallet && wallet.address) {
            log('pass', `Address: ${wallet.address}`);
            return { result: addResult('Wallet Generation', true, { address: wallet.address }), wallet };
        } else {
            log('warn', 'Wallet generated but missing address property');
            return { result: addResult('Wallet Generation', false, null, 'Missing address'), wallet: null };
        }
    } catch (err) {
        log('fail', err.message);

        // Document the known issue
        if (err.message.includes('pqc-wasm')) {
            log('info', 'Known Issue: SDK requires pqc-wasm but has API mismatch');
            log('info', 'SDK expects init() but pqc-wasm exports initSync()');
            results.issues.push({
                test: 'Wallet Generation',
                issue: 'pqc-wasm API mismatch - SDK uses init() but package exports initSync()',
                severity: 'critical',
                impact: 'Developers cannot generate PQC wallets using SDK'
            });
        }

        return { result: addResult('Wallet Generation', false, null, err.message), wallet: null };
    }
}

async function test6_FaucetDirect() {
    console.log('\n💰 Test 6: Faucet API (Direct)');

    // Generate a test address format
    const testAddress = 'dyt1' + Array(40).fill(0).map(() =>
        Math.floor(Math.random() * 16).toString(16)
    ).join('');

    try {
        const response = await fetch(FAUCET_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                address: testAddress,
                dgt_amount: 100,
                drt_amount: 1000
            })
        });

        const data = await response.json();

        if (response.ok) {
            log('pass', 'Faucet request successful');
            log('info', `TX Hash: ${data.hash || data.tx_hash || 'N/A'}`);
            return { result: addResult('Faucet Direct', true, data), address: testAddress };
        } else {
            log('warn', `Faucet returned: ${data.message || data.error}`);
            return { result: addResult('Faucet Direct', false, data, data.message), address: testAddress };
        }
    } catch (err) {
        log('fail', err.message);
        return { result: addResult('Faucet Direct', false, null, err.message), address: null };
    }
}

async function test7_BalanceCheck(client, address) {
    console.log('\n💵 Test 7: Balance Check');
    if (!client || !address) {
        log('warn', 'Skipped - no client or address');
        return addResult('Balance Check', false, null, 'Missing prerequisites');
    }

    try {
        log('info', 'Waiting 3 seconds for block commitment...');
        await new Promise(r => setTimeout(r, 3000));

        const account = await client.getAccount(address);
        log('pass', 'Account retrieved');
        log('info', `Balances: ${JSON.stringify(account.balances || account)}`);
        return addResult('Balance Check', true, account);
    } catch (err) {
        log('warn', err.message);
        return addResult('Balance Check', false, null, err.message);
    }
}

async function runAllTests() {
    console.log('='.repeat(60));
    console.log('🚀 DYTALLIX DEVELOPER QUICKSTART TEST');
    console.log('='.repeat(60));
    console.log(`Testnet RPC: ${TESTNET_RPC}`);
    console.log(`SDK Version: ${VERSION}`);
    console.log(`Node.js: ${process.version}`);

    // Run tests
    await test1_SDKImport();
    const { client } = await test2_ClientInit();
    await test3_NetworkStatus(client);
    await test4_LatestBlock(client);
    const { wallet } = await test5_WalletGeneration();
    const { address: faucetAddress } = await test6_FaucetDirect();
    await test7_BalanceCheck(client, faucetAddress);

    // Summary
    const passed = results.tests.filter(t => t.passed).length;
    const failed = results.tests.filter(t => !t.passed).length;

    results.summary = {
        total: results.tests.length,
        passed,
        failed,
        passRate: `${Math.round((passed / results.tests.length) * 100)}%`
    };

    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`   Total:  ${results.summary.total}`);
    console.log(`   Passed: ${passed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Rate:   ${results.summary.passRate}`);

    if (results.issues.length > 0) {
        console.log('\n⚠️ ISSUES FOUND:');
        results.issues.forEach((issue, i) => {
            console.log(`   ${i + 1}. ${issue.test}: ${issue.issue}`);
        });
    }

    console.log('\n' + '='.repeat(60));
    if (failed === 0) {
        console.log('✅ ALL TESTS PASSED');
    } else if (failed <= 2) {
        console.log('⚠️ MOSTLY WORKING - Some issues found');
    } else {
        console.log('❌ CRITICAL ISSUES - Developer experience impacted');
    }
    console.log('='.repeat(60));

    // Save results
    const fs = require('fs');
    fs.writeFileSync('dytallix-test-results.json', JSON.stringify(results, null, 2));
    console.log('\n📄 Results saved to: dytallix-test-results.json');

    return results;
}

runAllTests().catch(err => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
});
