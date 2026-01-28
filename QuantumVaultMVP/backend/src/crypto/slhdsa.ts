import * as crypto from 'crypto';

export const SLH_DSA_SHAKE_128S_ALGORITHM = 'SLH-DSA-SHAKE-128s';

export type SlhDsaKeyPair = { publicKey: Uint8Array; secretKey: Uint8Array };

export type SlhDsaShake128s = {
    generateKeyPair(): Promise<SlhDsaKeyPair>;
    sign(message: Uint8Array, secretKey: Uint8Array): Promise<Uint8Array>;
    verify(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean>;
};

let sigPromise: Promise<SlhDsaShake128s> | null = null;

async function importOqsSig(): Promise<any> {
    // TS compiles NestJS as CommonJS; liboqs is ESM-only.
    // Using Function(...) preserves a real dynamic import at runtime.
    // eslint-disable-next-line no-new-func
    return new Function('return import("@openforge-sh/liboqs/sig")')();
}

export async function getSlhDsaShake128s(): Promise<SlhDsaShake128s> {
    if (!sigPromise) {
        sigPromise = (async () => {
            const sigMod = await importOqsSig();
            // Note: Function name based on probe script output: createSlhDsaShake128s
            if (typeof sigMod.createSlhDsaShake128s !== 'function') {
                throw new Error('liboqs SIG export createSlhDsaShake128s is missing');
            }
            return (await sigMod.createSlhDsaShake128s()) as SlhDsaShake128s;
        })();
    }

    return sigPromise;
}
