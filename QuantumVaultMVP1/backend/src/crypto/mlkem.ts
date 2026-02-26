import * as crypto from 'crypto';

export const ML_KEM_512_ALGORITHM = 'ML-KEM-512';
export const ML_KEM_768_ALGORITHM = 'ML-KEM-768';
export const ML_KEM_1024_ALGORITHM = 'ML-KEM-1024';
export const ML_KEM_512_WRAP_SUITE = 'ML-KEM-512-HKDF-SHA256-AES-256-GCM';
export const ML_KEM_768_WRAP_SUITE = 'ML-KEM-768-HKDF-SHA256-AES-256-GCM';
export const ML_KEM_1024_WRAP_SUITE = 'ML-KEM-1024-HKDF-SHA256-AES-256-GCM';

export const SUPPORTED_ML_KEM_ALGORITHMS = [
  ML_KEM_512_ALGORITHM,
  ML_KEM_768_ALGORITHM,
  ML_KEM_1024_ALGORITHM,
] as const;

export type MlKemKeyPair = { publicKey: Uint8Array; secretKey: Uint8Array };
export type MlKemEncapsulation = { ciphertext: Uint8Array; sharedSecret: Uint8Array };

export type MlKem = {
  generateKeyPair(): Promise<MlKemKeyPair>;
  encapsulate(publicKey: Uint8Array): Promise<MlKemEncapsulation>;
  decapsulate(ciphertext: Uint8Array, secretKey: Uint8Array): Promise<Uint8Array>;
};

export type MlKem1024 = MlKem;

const kemPromises = new Map<string, Promise<MlKem>>();

async function importOqsKem(): Promise<any> {
  // TS compiles NestJS as CommonJS; liboqs is ESM-only.
  // Using Function(...) preserves a real dynamic import at runtime.
  // eslint-disable-next-line no-new-func
  return new Function('return import("@openforge-sh/liboqs/kem")')();
}

export function normalizeKemAlgorithmName(value: unknown, fallback = ML_KEM_1024_ALGORITHM): string {
  const normalized = String(value || '').trim().toUpperCase();

  if (!normalized) return fallback;

  if (normalized.includes('1024')) return ML_KEM_1024_ALGORITHM;
  if (normalized.includes('768')) return ML_KEM_768_ALGORITHM;
  if (normalized.includes('512')) return ML_KEM_512_ALGORITHM;

  if (normalized.includes('KYBER1024') || normalized.includes('KYBER-1024')) return ML_KEM_1024_ALGORITHM;
  if (normalized.includes('KYBER768') || normalized.includes('KYBER-768')) return ML_KEM_768_ALGORITHM;
  if (normalized.includes('KYBER512') || normalized.includes('KYBER-512')) return ML_KEM_512_ALGORITHM;

  if (normalized.includes('ML-KEM') || normalized.includes('MLKEM') || normalized.includes('KYBER')) {
    return fallback;
  }

  return fallback;
}

export function wrapSuiteForKemAlgorithm(algorithm: unknown): string {
  const normalized = normalizeKemAlgorithmName(algorithm);
  if (normalized === ML_KEM_512_ALGORITHM) return ML_KEM_512_WRAP_SUITE;
  if (normalized === ML_KEM_768_ALGORITHM) return ML_KEM_768_WRAP_SUITE;
  return ML_KEM_1024_WRAP_SUITE;
}

export async function getMlKemByAlgorithm(algorithm: unknown): Promise<MlKem> {
  const normalized = normalizeKemAlgorithmName(algorithm);
  const existing = kemPromises.get(normalized);
  if (existing) return existing;

  const kemPromise = (async () => {
    const kemMod = await importOqsKem();

    if (normalized === ML_KEM_512_ALGORITHM) {
      if (typeof kemMod.createMLKEM512 !== 'function') {
        throw new Error('liboqs KEM export createMLKEM512 is missing');
      }
      return (await kemMod.createMLKEM512()) as MlKem;
    }

    if (normalized === ML_KEM_768_ALGORITHM) {
      if (typeof kemMod.createMLKEM768 !== 'function') {
        throw new Error('liboqs KEM export createMLKEM768 is missing');
      }
      return (await kemMod.createMLKEM768()) as MlKem;
    }

    if (typeof kemMod.createMLKEM1024 !== 'function') {
      throw new Error('liboqs KEM export createMLKEM1024 is missing');
    }
    return (await kemMod.createMLKEM1024()) as MlKem;
  })();

  kemPromises.set(normalized, kemPromise);
  return kemPromise;
}

export async function getMlKem1024(): Promise<MlKem1024> {
  return getMlKemByAlgorithm(ML_KEM_1024_ALGORITHM) as Promise<MlKem1024>;
}

export function deriveAes256Key(sharedSecret: Uint8Array, salt: Uint8Array, kemAlgorithm: unknown = ML_KEM_1024_ALGORITHM): Buffer {
  const normalized = normalizeKemAlgorithmName(kemAlgorithm);
  const info = Buffer.from(`QuantumVaultMVP:wrap:v1:${normalized}`, 'utf8');
  return Buffer.from(
    crypto.hkdfSync('sha256', Buffer.from(sharedSecret), Buffer.from(salt), info, 32),
  );
}
