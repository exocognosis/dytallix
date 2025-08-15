/**
 * Usage:
 *   VITE_LCD_HTTP_URL=http://localhost:1317 \
 *   FAUCET_URL=http://localhost:8787/api/faucet \
 *   TEST_MNEMONIC="word1 ... word24" \
 *   TOKEN=DGT node scripts/fund-from-faucet.js
 */
const { DirectSecp256k1HdWallet } = require('@cosmjs/proto-signing');

const LCD = process.env.VITE_LCD_HTTP_URL || process.env.LCD_HTTP_URL || 'http://178.156.187.81:1317';
const FAUCET = process.env.FAUCET_URL || 'http://localhost:8787/api/faucet';
const MNEMONIC = process.env.TEST_MNEMONIC;
const PREFIX = process.env.BECH32_PREFIX || 'cosmos';
const TOKEN = (process.env.TOKEN || 'DGT').toUpperCase();
// Map symbol -> base denom (override with TEST_DENOM if provided explicitly)
const SYMBOL_TO_BASE = { DGT: 'uDGT', DRT: 'uDRT' };
const DENOM  = (process.env.TEST_DENOM || SYMBOL_TO_BASE[TOKEN] || 'uDGT').toLowerCase();

if (!MNEMONIC) {
  console.error('Missing TEST_MNEMONIC'); process.exit(1);
}

(async () => {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(MNEMONIC, { prefix: PREFIX });
  const [account] = await wallet.getAccounts();
  const addr = account.address;

  console.log('Address:', addr);
  console.log('LCD:', LCD);
  console.log('Faucet:', FAUCET);
  console.log('Denom (derived):', DENOM);
  console.log('Token:', TOKEN);

  const balUrl = `${LCD}/cosmos/bank/v1beta1/balances/${addr}`;
  const getBal = async () => {
    const r = await fetch(balUrl);
    if (!r.ok) throw new Error(`LCD ${r.status}`);
    const j = await r.json();
    const match = (j.balances || []).find(b => b.denom.toLowerCase() === DENOM);
    return Number(match?.amount || 0);
  };

  const before = await getBal().catch(() => 0);
  console.log('Balance before:', before, DENOM);

  console.log('Requesting faucet for token', TOKEN, '...');
  const fr = await fetch(FAUCET, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ address: addr, token: TOKEN })
  });
  if (!fr.ok) {
    const txt = await fr.text().catch(()=> '');
    throw new Error(`Faucet HTTP ${fr.status} ${txt}`);
  }

  const start = Date.now();
  let after = before;
  while (Date.now() - start < 30000) {
    await new Promise(r => setTimeout(r, 1500));
    after = await getBal().catch(() => after);
    process.stdout.write('.');
    if (after > before) break;
  }
  console.log('\nBalance after:', after, DENOM);
  if (after <= before) {
    console.error('Faucet did not fund within timeout'); process.exit(2);
  }
  console.log('Funded ✔');
})();
