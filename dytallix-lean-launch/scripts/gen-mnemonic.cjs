const { DirectSecp256k1HdWallet } = require('@cosmjs/proto-signing');

const PREFIX = process.env.BECH32_PREFIX || 'cosmos';

(async () => {
  const wallet = await DirectSecp256k1HdWallet.generate(24, { prefix: PREFIX });
  const [account] = await wallet.getAccounts();
  const mnemonic = wallet.mnemonic;
  console.log('--- TEST MNEMONIC (WRITE DOWN, DO NOT COMMIT) ---');
  console.log(mnemonic);
  console.log('--- ADDRESS ---');
  console.log(account.address);
})();
