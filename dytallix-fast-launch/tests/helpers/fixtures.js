/**
 * Test Helpers - Fixtures
 * Test data fixtures
 */

/**
 * Sample form data for quantum risk assessment
 */
export const sampleFormData = {
    industry: 'Technology',
    region: 'North America',
    orgSize: 'Enterprise',
    regulatoryRegime: 'GDPR',
    dataTypes: ['PII', 'Financial', 'Healthcare'],
    cryptography: ['RSA', 'ECC', 'AES-256'],
};

/**
 * Sample risk scores
 */
export const sampleRiskScores = {
    hndl: 75,
    crqc: 60,
    urgency: 70,
};

/**
 * Sample blockchain addresses
 */
export const sampleAddresses = {
    valid: 'dytallix1qpzry9x8gf2tvdw0s3jn54khce6mua7lmqqqxw',
    validPQC: 'dytallix' + '0'.repeat(40),
    invalid: 'invalid-address',
    empty: '',
};

/**
 * Sample blockchain block
 */
export const sampleBlock = {
    height: 12345,
    hash: '0x' + 'a'.repeat(64),
    timestamp: '2026-01-19T14:00:00.000Z',
    txs: [
        {
            hash: '0x' + 'b'.repeat(64),
            from: sampleAddresses.valid,
            to: sampleAddresses.validPQC,
            amount: '1000000',
            fee: '1000',
        },
    ],
};

/**
 * Sample transaction
 */
export const sampleTransaction = {
    hash: '0x' + 'c'.repeat(64),
    from: sampleAddresses.valid,
    to: sampleAddresses.validPQC,
    amount: '500000',
    fee: '500',
    nonce: 1,
    status: 'confirmed',
};

/**
 * Sample node status response
 */
export const sampleNodeStatus = {
    network: 'dytallix-testnet-1',
    height: 12345,
    source: 'dytallix-node',
};

/**
 * Sample API status response
 */
export const sampleApiStatus = {
    ok: true,
    status: 'healthy',
    network: 'dytallix-local',
    latest_height: 12345,
    height: 12345,
    metrics: {
        tps: 10,
        avgLatency: 2.5,
        networkLoad: 15,
        activeValidators: 4,
    },
    redis: false,
    uptime: 3600,
    timestamp: '2026-01-19T14:00:00.000Z',
};
