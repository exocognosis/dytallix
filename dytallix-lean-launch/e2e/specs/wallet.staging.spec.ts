import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { getBalances, sendTokens, subscribeTxAndBlocks, waitForTx, getChainId, getLatestHeight, buildWallet } from '../utils/cosmos';

// Force load staging env (do not commit secrets) and allow CI to provide via env vars
const ENV_PATH = path.resolve(process.cwd(), '.env.staging');
if (fs.existsSync(ENV_PATH)) {
  dotenv.config({ path: ENV_PATH, override: true });
}

const faucetUrl = process.env.FAUCET_URL || '';
const testMnemonic = process.env.TEST_MNEMONIC || '';
const chainIdEnv = process.env.VITE_CHAIN_ID || '';

const OUTPUT_DIR = path.resolve(process.cwd(), 'e2e/output');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'latest-run.txt');

function append(line: string) {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.appendFileSync(OUTPUT_FILE, line + '\n');
  console.log(line);
}

const isPlaceholder = /REPLACE/i.test(testMnemonic);
const wordCount = testMnemonic.trim().split(/\s+/).filter(Boolean).length;
const isValidMnemonic = !isPlaceholder && (wordCount === 12 || wordCount === 24);

if (!isValidMnemonic) {
  console.warn('TEST_MNEMONIC not provided or invalid; e2e tests will be skipped');
}

async function requestFaucet(address: string, token='DRT') {
  if (!faucetUrl) throw new Error('FAUCET_URL not set');
  const res = await fetch(faucetUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address, token }) });
  if (!res.ok) throw new Error('Faucet request failed');
  return res.json();
}

(async () => { if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true }); if (!fs.existsSync(OUTPUT_FILE)) fs.writeFileSync(OUTPUT_FILE, ''); })();

(isValidMnemonic ? test : test.skip)('staging wallet end-to-end (balances -> faucet -> send -> ws)', async () => {
  append('--- E2E RUN START ' + new Date().toISOString() + ' ---');
  append('Chain (env) ' + chainIdEnv);

  const wallet = await buildWallet(testMnemonic);
  const address = (await wallet.getAccounts())[0].address;
  append('Using address ' + address);

  const initial = await getBalances(address);
  append('Initial balances: ' + JSON.stringify(initial));

  const onChainId = await getChainId();
  append('On-chain chainId: ' + onChainId);
  expect(onChainId).toBe(chainIdEnv);

  const h0 = await getLatestHeight();
  append('Starting height: ' + h0);

  await requestFaucet(address, 'DRT');
  append('Requested faucet (DRT)');

  let afterFaucet;
  for (let i=0;i<25;i++) {
    afterFaucet = await getBalances(address);
    const initAmt = initial.find(b=>b.denom==='udrt')?.amount || '0';
    const aftAmt = afterFaucet.find(b=>b.denom==='udrt')?.amount || '0';
    if (BigInt(aftAmt) > BigInt(initAmt)) break;
    await new Promise(r=>setTimeout(r, 2000));
  }
  append('Post-faucet balances: ' + JSON.stringify(afterFaucet));
  expect(BigInt(afterFaucet!.find(b=>b.denom==='udrt')?.amount || '0')).toBeGreaterThan(BigInt(initial.find(b=>b.denom==='udrt')?.amount || '0'));

  const sendRes = await sendTokens(testMnemonic, address, '1');
  const txHash = sendRes.transactionHash;
  append('Broadcast self-transfer txHash=' + txHash);
  expect(txHash).toBeTruthy();

  const subPromise = subscribeTxAndBlocks(txHash);
  const txResult = await waitForTx(txHash);
  append('Tx result code=' + txResult.tx_result.code + ' height=' + txResult.height);
  expect(txResult.tx_result.code).toBe(0);

  const wsRes = await subPromise;
  append('WS events: sawTx=' + wsRes.sawTx + ' sawBlock=' + wsRes.sawBlock);
  expect(wsRes.sawTx).toBeTruthy();
  expect(wsRes.sawBlock).toBeTruthy();

  const h1 = await getLatestHeight();
  append('Ending height: ' + h1);
  append('Tx included at height: ' + txResult.height);
  expect(h1).toBeGreaterThanOrEqual(h0);

  const finalBalances = await getBalances(address);
  append('Final balances: ' + JSON.stringify(finalBalances));
  append('--- E2E RUN END ---');
});
