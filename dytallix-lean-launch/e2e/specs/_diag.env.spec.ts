import { test } from '@playwright/test';
test('env diag', async () => {
  const m = process.env.TEST_MNEMONIC || '';
  const words = m.trim().split(/\s+/).filter(Boolean);
  console.log('DIAG TEST_MNEMONIC_WORDS=', words.length);
  console.log('DIAG BECH32_PREFIX=', process.env.BECH32_PREFIX);
  console.log('DIAG APP_URL=', process.env.APP_URL);
  console.log('DIAG LCD=', process.env.VITE_LCD_HTTP_URL);
  console.log('DIAG API_URL=', process.env.VITE_API_URL);
  console.log('DIAG FAUCET_URL=', process.env.VITE_FAUCET_URL || (process.env.VITE_API_URL ? process.env.VITE_API_URL + '/faucet' : 'not configured'));
  console.log('DIAG CHAIN_ID=', process.env.VITE_CHAIN_ID);
});
