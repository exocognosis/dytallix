const { DirectSecp256k1HdWallet } = require('@cosmjs/proto-signing');

const mnemonic = process.env.TEST_MNEMONIC;
const prefix = process.env.BECH32_PREFIX || 'cosmos';
if (!mnemonic) { console.error('Set TEST_MNEMONIC'); process.exit(1); }

(async () => {
  const w = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix });
  const [acc] = await w.getAccounts();
  console.log(acc.address);
})();
