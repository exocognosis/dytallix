import * as crypto from 'crypto';

export const ML_KEM_512_ALGORITHM = 'ML-KEM-512';
export const ML_KEM_768_ALGORITHM = 'ML-KEM-768';
export const ML_KEM_1024_ALGORITHM = 'ML-KEM-1024';

export const ML_KEM_512_WRAP_SUITE = 'ML-KEM-512-HKDF-SHA256-AES-256-GCM';
export const ML_KEM_768_WRAP_SUITE = 'ML-KEM-768-HKDF-SHA256-AES-256-GCM';
export const ML_KEM_1024_WRAP_SUITE = 'ML-KEM-1024-HKDF-SHA256-AES-256-GCM';

export type MlKemKeyPair = { publicKey: Uint8Array; secretKey: Uint8Array };
export type MlKemEncapsulation = { ciphertext: Uint8Array; sharedSecret: Uint8Array };

export type MlKem = {
  generateKeyPair(): Promise<MlKemKeyPair>;
  encapsulate(publicKey: Uint8Array): Promise<MlKemEncapsulation>;
  decapsulate(ciphertext: Uint8Array, secretKey: Uint8Array): Promise<Uint8Array>;
};
export type MlKem1024 = MlKem;

let kem512Promise: Promise<MlKem> | null = null;
let kem768Promise: Promise<MlKem> | null = null;
let kem1024Promise: Promise<MlKem> | null = null;

async function importOqsKem(): Promise<any> {
  // eslint-disable-next-line no-new-func
  return new Function('return import("@openforge-sh/liboqs/kem")')();
}

export async function getMlKem512(): Promise<MlKem> {
  if (!kem512Promise) {
    kem512Promise = (async () => {
      const kemMod = await importOqsKem();
      if (typeof kemMod.createMLKEM512 !== 'function') throw new Error('liboqs KEM export createMLKEM512 is missing');
      return (await kemMod.createMLKEM512()) as MlKem;
    })();
  }
  return kem512Promise;
}

export async function getMlKem768(): Promise<MlKem> {
  if (!kem768Promise) {
    kem768Promise = (async () => {
      const kemMod = await importOqsKem();
      if (typeof kemMod.createMLKEM768 !== 'function') throw new Error('liboqs KEM export createMLKEM768 is missing');
      return (await kemMod.createMLKEM768()) as MlKem;
    })();
  }
  return kem768Promise;
}

export async function getMlKem1024(): Promise<MlKem> {
  if (!kem1024Promise) {
    kem1024Promise = (async () => {
      const kemMod = await importOqsKem();
      if (typeof kemMod.createMLKEM1024 !== 'function') throw new Error('liboqs KEM export createMLKEM1024 is missing');
      return (await kemMod.createMLKEM1024()) as MlKem;
    })();
  }
  return kem1024Promise;
}

export function normalizeKemAlgorithmName(algo: unknown, fallback?: string): string {
  const val = (typeof algo === 'string' ? algo : fallback) || '';
  return val.toUpperCase().replace(/_/g, '-');
}

export async function getMlKemByAlgorithm(algo: string): Promise<MlKem> {
  const normalized = normalizeKemAlgorithmName(algo);
  switch (normalized) {
    case ML_KEM_512_ALGORITHM: return getMlKem512();
    case ML_KEM_768_ALGORITHM: return getMlKem768();
    case ML_KEM_1024_ALGORITHM: return getMlKem1024();
    default: throw new Error(`Unsupported KEM algorithm: ${algo}`);
  }
}

export function wrapSuiteForKemAlgorithm(algo: string): string {
  const normalized = normalizeKemAlgorithmName(algo);
  switch (normalized) {
    case ML_KEM_512_ALGORITHM: return ML_KEM_512_WRAP_SUITE;
    case ML_KEM_768_ALGORITHM: return ML_KEM_768_WRAP_SUITE;
    case ML_KEM_1024_ALGORITHM: return ML_KEM_1024_WRAP_SUITE;
    default: throw new Error(`Unsupported KEM algorithm: ${algo}`);
  }
}

export function deriveAes256Key(sharedSecret: Uint8Array, salt: Uint8Array, kemAlgorithm: string = ML_KEM_1024_ALGORITHM): Buffer {
  const normAlgo = normalizeKemAlgorithmName(kemAlgorithm);
  const info = Buffer.from(`QuantumVaultMVP:wrap:v1:${normAlgo}`, 'utf8');
  return Buffer.from(
    crypto.hkdfSync('sha256', Buffer.from(sharedSecret), Buffer.from(salt), info, 32),
  );
}
