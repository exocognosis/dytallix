// import { generateKeypair, getAddress, exportKeystore } from '@dytallix/pqc-wallet';

export async function createWallet({ alg = 'ML-DSA', hybrid = false } = {}) {
  const pubKey = crypto.getRandomValues(new Uint8Array(32));
  const address = 'pqc1' + Math.random().toString(36).slice(2, 12);
  const privKey = crypto.getRandomValues(new Uint8Array(64));
  return { address, pubKey, privKey, alg, hybrid };
}

export async function exportKeystoreFile(privKey, { label = 'dytallix-keystore' } = {}) {
  const blob = new Blob([privKey], { type: 'application/octet-stream' });
  const fileName = `${label}.key`;
  return { blob, fileName };
}
