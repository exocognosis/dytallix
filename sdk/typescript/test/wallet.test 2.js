import { describe, it } from 'node:test';
import assert from 'node:assert';

// Test that SDK exports are available
describe('SDK Exports', () => {
  it('exports main modules', async () => {
    const sdk = await import('../dist/index.js');
    
    assert.ok(sdk.DytallixClient, 'DytallixClient should be exported');
    assert.ok(sdk.DytallixError, 'DytallixError should be exported');
    assert.ok(sdk.TESTNET_RPC, 'TESTNET_RPC should be exported');
    assert.ok(sdk.TESTNET_CHAIN_ID, 'TESTNET_CHAIN_ID should be exported');
  });

  it('has correct testnet constants', async () => {
    const sdk = await import('../dist/index.js');
    
    assert.strictEqual(sdk.TESTNET_RPC, 'https://dytallix.com/rpc');
    assert.strictEqual(sdk.TESTNET_CHAIN_ID, 'dytallix-testnet-1');
  });
});

describe('DytallixClient', () => {
  it('creates client with testnet config', async () => {
    const { DytallixClient, TESTNET_RPC, TESTNET_CHAIN_ID } = await import('../dist/index.js');
    
    const client = new DytallixClient({
      rpcUrl: TESTNET_RPC,
      chainId: TESTNET_CHAIN_ID
    });
    assert.ok(client, 'Client should be created');
  });

  it('creates client with custom config', async () => {
    const { DytallixClient } = await import('../dist/index.js');
    
    const client = new DytallixClient({
      rpcUrl: 'http://localhost:26657',
      chainId: 'local-test',
      timeout: 5000
    });
    assert.ok(client, 'Client should be created with custom config');
  });
});

describe('DytallixError', () => {
  it('creates error with code and message', async () => {
    const { DytallixError, ErrorCode } = await import('../dist/index.js');
    
    const error = new DytallixError(ErrorCode.NetworkError, 'Connection failed');
    assert.strictEqual(error.code, ErrorCode.NetworkError);
    assert.ok(error.message.includes('Connection failed'));
  });
});
