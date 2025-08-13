import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import { getBalances, sendTokens, subscribeTxAndBlocks, waitForTx, getChainId, getLatestHeight } from '../utils/cosmos';

dotenv.config({ path: '.env.staging', override: false });

const faucetUrl = process.env.FAUCET_URL || '';
const testMnemonic = process.env.TEST_MNEMONIC || '';
const chainIdEnv = process.env.VITE_CHAIN_ID || '';

// New env check (runtime skip only if mnemonic entirely absent)
const words = testMnemonic.trim().split(/\s+/).filter(Boolean);
console.log('E2E ENV CHECK',
  'words=', words.length,
  'url=', process.env.APP_URL,
  'lcd=', process.env.VITE_LCD_HTTP_URL,
  'faucet=', process.env.FAUCET_URL,
  'hrp=', process.env.BECH32_PREFIX,
  'chain=', process.env.VITE_CHAIN_ID
);
if (words.length === 0) {
  console.warn('TEST_MNEMONIC missing; e2e skipped');
  test.skip(true);
}

// Helper to request faucet
async function requestFaucet(address: string) {
  if (!faucetUrl) throw new Error('FAUCET_URL not set');
  const res = await fetch(faucetUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address }) });
  if (!res.ok) throw new Error('Faucet request failed');
  return res.json();
}

// Single test covering lifecycle
test('wallet balance -> faucet -> tx lifecycle', async () => {
  // 1. Initial balance snapshot
  const walletAddr = (await (await import('../utils/cosmos')).buildWallet(testMnemonic)).getAccounts().then(a=>a[0].address);
  const address = await walletAddr;
  const initial = await getBalances(address);
  console.log('Initial balances', initial);

  // Validate chain id
  const onChainId = await getChainId();
  expect(onChainId).toBe(chainIdEnv);

  const h0 = await getLatestHeight();

  // 2. Faucet request
  await requestFaucet(address);
  // Wait for balance increase
  let afterFaucet;
  for (let i=0;i<20;i++) {
    afterFaucet = await getBalances(address);
    const initAmt = initial.find(b=>b.denom==='udrt')?.amount || '0';
    const aftAmt = afterFaucet.find(b=>b.denom==='udrt')?.amount || '0';
    if (BigInt(aftAmt) > BigInt(initAmt)) break;
    await new Promise(r=>setTimeout(r, 2000));
  }
  expect(BigInt(afterFaucet!.find(b=>b.denom==='udrt')?.amount || '0')).toBeGreaterThan(BigInt(initial.find(b=>b.denom==='udrt')?.amount || '0'));

  // 3. Send a tx to self
  const sendRes = await sendTokens(testMnemonic, address, '1');
  const txHash = sendRes.transactionHash;
  expect(txHash).toBeTruthy();

  // 4. Subscribe WS for tx + new block while polling LCD
  const subPromise = subscribeTxAndBlocks(txHash);
  const txResult = await waitForTx(txHash);
  const wsRes = await subPromise;
  expect(wsRes.sawTx).toBeTruthy();
  expect(wsRes.sawBlock).toBeTruthy();
  expect(txResult.tx_result.code).toBe(0);

  const h1 = await getLatestHeight();
  expect(h1).toBeGreaterThanOrEqual(h0);

  // 5. Final balance delta
  const finalBalances = await getBalances(address);
  const initialAmt = BigInt(initial.find(b=>b.denom==='udrt')?.amount || '0');
  const finalAmt = BigInt(finalBalances.find(b=>b.denom==='udrt')?.amount || '0');
  expect(finalAmt).toBeLessThan(BigInt(afterFaucet!.find(b=>b.denom==='udrt')?.amount || '0')); // spent fees+1
});
