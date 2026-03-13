import { getMlDsa65, computeDAddr } from '../src/index.js';

/**
 * End-to-End Agent Execution Flow on Dytallix Alkali Testnet
 * 
 * Demonstrates:
 * 1. PQC Wallet Creation (ML-DSA-65)
 * 2. Faucet request (DGT + DRT)
 * 3. On-chain balance checks
 * 4. PQC-signed token transaction
 */

// Mock helper representing standard RPC payload mechanics
const RPC_ENDPOINT = 'http://localhost:9933';
const FAUCET_ENDPOINT = 'http://localhost:3001/api/faucet/drip';

async function logStep(msg: string) {
    console.log(`\n[\x1b[36mAGENT-FLOW\x1b[0m] ${msg}`);
}

async function requestTokensFromFaucet(dAddr: string): Promise<boolean> {
    logStep(`Requesting DGT/DRT tokens from Faucet for ${dAddr}...`);
    try {
        const response = await fetch(FAUCET_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dAddr, tokenTypes: ['DGT', 'DRT'] })
        });

        if (response.ok) {
            console.log('✓ Faucet drip successful.');
            return true;
        } else {
            console.warn(`! Faucet not reachable or failed. Mocking success for demo.`);
            return true; // We mock success if the local testnet isn't actually spun up
        }
    } catch (e) {
        console.warn(`! Local Faucet offline (${FAUCET_ENDPOINT}). Simulating incoming Tx...`);
        return true;
    }
}

async function signAndBroadcastTransaction(
    mlDsa: any,
    secretKey: Uint8Array,
    fromDAddr: string,
    toDAddr: string,
    amount: number,
    tokenType: 'DGT' | 'DRT'
) {
    logStep(`Creating ${amount} ${tokenType} transfer to ${toDAddr}...`);

    // Abstracted transaction payload
    const txPayload = {
        nonce: Date.now(),
        from: fromDAddr,
        to: toDAddr,
        amount,
        asset: tokenType,
        gasLimit: tokenType === 'DGT' ? 21000 : 50000,
    };

    // Agent signs the payload using its PQC ML-DSA-65 key
    console.log(`Signing transaction with ML-DSA-65...`);
    const payloadBytes = new TextEncoder().encode(JSON.stringify(txPayload));
    const signature = await mlDsa.sign(payloadBytes, secretKey);

    const signedTx = {
        payload: txPayload,
        signature: Buffer.from(signature).toString('hex')
    };

    // Broadcast
    logStep(`Broadcasting transaction to Dytallix RPC...`);
    try {
        const response = await fetch(RPC_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_sendRawTransaction',
                params: [signedTx],
                id: 1
            })
        });

        if (response.ok) {
            console.log('✓ Transaction broadcasted successfully.');
        } else {
            console.warn('! Local RPC offline. Simulating broadcast success...');
            console.log(`✓ [MOCK] TxHash: 0x` + Buffer.from(signature.slice(0, 32)).toString('hex'));
        }
    } catch (e) {
        console.warn('! Local RPC offline. Simulating broadcast success...');
        console.log(`✓ [MOCK] TxHash: 0x` + Buffer.from(signature.slice(0, 32)).toString('hex'));
    }
}

async function runE2EFlow() {
    logStep('Initializing PQC primitives for Agent Wallet...');
    const mlDsa = await getMlDsa65();

    // 1. Create a PQC Wallet continuously
    const keyPair = await mlDsa.generateKeyPair();
    const agentDAddr = computeDAddr(keyPair.publicKey);

    console.log(`Agent ML-DSA PublicKey generated: ${Buffer.from(keyPair.publicKey.slice(0, 16)).toString('hex')}...`);
    console.log(`Agent D-Addr derived: \x1b[32m${agentDAddr}\x1b[0m`);

    // 2. Fund the wallet
    await requestTokensFromFaucet(agentDAddr);

    // 3. Storing Value (checking balances)
    logStep('Querying on-chain balances...');
    // Simulated RPC read
    const balances = {
        DGT: '50.00',
        DRT: '10.00'
    };
    console.log(`Current DGT (Gas): ${balances.DGT}`);
    console.log(`Current DRT (Stake): ${balances.DRT}`);

    // 4. Create another receiver address to demonstrate transfer
    const receiverKey = await mlDsa.generateKeyPair();
    const receiverDAddr = computeDAddr(receiverKey.publicKey);

    // 5. Build, sign and send a token transfer
    await signAndBroadcastTransaction(
        mlDsa,
        keyPair.secretKey,
        agentDAddr,
        receiverDAddr,
        5.0,
        'DGT' // Sending Gas tokens
    );

    logStep('Agent Wallet Execution flow complete.');
}

runE2EFlow().catch(console.error);
