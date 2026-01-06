import * as crypto from 'crypto';

export const ML_KEM_1024_ALGORITHM = 'ML-KEM-1024';
export const ML_KEM_1024_WRAP_SUITE = 'ML-KEM-1024-HKDF-SHA256-AES-256-GCM';

export type MlKemKeyPair = { publicKey: Uint8Array; secretKey: Uint8Array };
export type MlKemEncapsulation = { ciphertext: Uint8Array; sharedSecret: Uint8Array };

export type MlKem1024 = {
  generateKeyPair(): Promise<MlKemKeyPair>;
  encapsulate(publicKey: Uint8Array): Promise<MlKemEncapsulation>;
  decapsulate(ciphertext: Uint8Array, secretKey: Uint8Array): Promise<Uint8Array>;
};

let kemPromise: Promise<MlKem1024> | null = null;

async function importOqsKem(): Promise<any> {
  // TS compiles NestJS as CommonJS; liboqs is ESM-only.
  // Using Function(...) preserves a real dynamic import at runtime.
  // eslint-disable-next-line no-new-func
  return new Function('return import("@openforge-sh/liboqs/kem")')();
}

export async function getMlKem1024(): Promise<MlKem1024> {
  if (!kemPromise) {
    kemPromise = (async () => {
      const kemMod = await importOqsKem();
      if (typeof kemMod.createMLKEM1024 !== 'function') {
        throw new Error('liboqs KEM export createMLKEM1024 is missing');
      }
      return (await kemMod.createMLKEM1024()) as MlKem1024;
    })();
  }

  return kemPromise;
}

export function deriveAes256Key(sharedSecret: Uint8Array, salt: Uint8Array): Buffer {
  const info = Buffer.from('QuantumVaultMVP:wrap:v1:ML-KEM-1024', 'utf8');
  return Buffer.from(
    crypto.hkdfSync('sha256', Buffer.from(sharedSecret), Buffer.from(salt), info, 32),
  );
}
