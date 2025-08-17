const { DirectSecp256k1HdWallet } = require('@cosmjs/proto-signing');

const PREFIX = process.env.BECH32_PREFIX || 'cosmos';

console.warn('⚠️  DEPRECATED: This script uses legacy secp256k1 cryptography');
console.warn('⚠️  For new wallets, use PQC with: npm run gen-pqc-mnemonic');
console.warn('⚠️  This script will be removed in a future version');
console.warn('');

(async () => {
  const wallet = await DirectSecp256k1HdWallet.generate(24, { prefix: PREFIX });
  const [account] = await wallet.getAccounts();
  const mnemonic = wallet.mnemonic;
  console.log('--- LEGACY TEST MNEMONIC (WRITE DOWN, DO NOT COMMIT) ---');
  console.log(mnemonic);
  console.log('--- LEGACY ADDRESS ---');
  console.log(account.address);
  console.log('');
  console.log('NOTE: This is a legacy secp256k1 address.');
  console.log('For production use, generate a PQC wallet instead.');
})();
