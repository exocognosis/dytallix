import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import { getBalances, sendTokens, subscribeTxAndBlocks, waitForTx, getChainId, getLatestHeight } from '../utils/cosmos';

dotenv.config({ path: '.env.staging', override: false });

const faucetUrl = process.env.FAUCET_URL || '';
const testMnemonic = process.env.TEST_MNEMONIC || '';
const chainIdEnv = process.env.VITE_CHAIN_ID || '';
const TEST_DENOM_BASE = process.env.TEST_DENOM_BASE || 'uDGT'; // default governance token
const ALT_TEST_DENOM_BASE = process.env.ALT_TEST_DENOM_BASE || 'uDRT';

const isPlaceholder = /REPLACE/i.test(testMnemonic);
const wordCount = testMnemonic.trim().split(/\s+/).filter(Boolean).length;
const isValidMnemonic = !isPlaceholder && (wordCount === 12 || wordCount === 24);

if (!isValidMnemonic) {
  console.warn('TEST_MNEMONIC not provided or invalid; e2e tests will be skipped');
}

// Helper to request faucet for a specific token symbol inferred from denom
async function requestFaucet(address: string, baseDenom: string) {
  if (!faucetUrl) throw new Error('FAUCET_URL not set');
  const token = baseDenom === 'uDGT' ? 'DGT' : baseDenom === 'uDRT' ? 'DRT' : '';
  if (!token) throw new Error('Unsupported test denom');
  const res = await fetch(faucetUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address, token }) });
  if (!res.ok) throw new Error('Faucet request failed');
  return res.json();
}

async function getAmountFor(addr: string, denom: string) {
  const bals = await getBalances(addr);
  return BigInt(bals.find(b => b.denom === denom)?.amount || '0');
}

async function runLifecycle(baseDenom: string) {
  const walletAddr = (await (await import('../utils/cosmos')).buildWallet(testMnemonic)).getAccounts().then(a=>a[0].address);
  const address = await walletAddr;
  const initialAmt = await getAmountFor(address, baseDenom);

  // Chain id consistency
  const onChainId = await getChainId();
  expect(onChainId).toBe(chainIdEnv);
  const h0 = await getLatestHeight();

  // Faucet fund
  await requestFaucet(address, baseDenom);
  let fundedAmt = initialAmt;
  for (let i=0;i<25;i++) {
    fundedAmt = await getAmountFor(address, baseDenom);
    if (fundedAmt > initialAmt) break;
    await new Promise(r=>setTimeout(r, 2000));
  }
  expect(fundedAmt).toBeGreaterThan(initialAmt);

  // Self transfer 1 micro-unit for simplicity (use DRT denom for fee if needed inside sendTokens util)
  const sendRes = await sendTokens(testMnemonic, address, '1');
  const txHash = sendRes.transactionHash;
  expect(txHash).toBeTruthy();

  const subPromise = subscribeTxAndBlocks(txHash);
  const txResult = await waitForTx(txHash);
  const wsRes = await subPromise;
  expect(wsRes.sawTx).toBeTruthy();
  expect(wsRes.sawBlock).toBeTruthy();
  expect(txResult.tx_result.code).toBe(0);

  const h1 = await getLatestHeight();
  expect(h1).toBeGreaterThanOrEqual(h0);

  const finalAmt = await getAmountFor(address, baseDenom);
  expect(finalAmt).toBeLessThan(fundedAmt); // fee spent
}

// Primary test (governance token)
(isValidMnemonic ? test : test.skip)(`wallet lifecycle faucet -> tx (${TEST_DENOM_BASE})`, async () => {
  await runLifecycle(TEST_DENOM_BASE);
});

// Optional secondary test (rewards token) if env flag provided
if (process.env.RUN_DRT_TEST === '1') {
  (isValidMnemonic ? test : test.skip)(`wallet lifecycle faucet -> tx (${ALT_TEST_DENOM_BASE})`, async () => {
    await runLifecycle(ALT_TEST_DENOM_BASE);
  });
}
