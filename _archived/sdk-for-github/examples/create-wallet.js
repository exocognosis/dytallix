// Create a PQC wallet
import { PQCWallet } from '@dytallix/sdk';

async function main() {
  // Generate ML-DSA (Dilithium) wallet
  const wallet = await PQCWallet.generate('ML-DSA');
  
  console.log('Wallet created!');
  console.log('Address:', wallet.address);
  console.log('Algorithm:', wallet.algorithm);
  
  // Export keys for backup
  const publicKey = await wallet.getPublicKey();
  const privateKey = await wallet.exportPrivateKeyRaw();
  
  console.log('Public key length:', publicKey.length, 'bytes');
  console.log('Private key length:', privateKey.length, 'bytes');
  
  // IMPORTANT: Store private key securely!
  console.log('\n⚠️  Keep your private key safe and never share it!');
}

main().catch(console.error);
