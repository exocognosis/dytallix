import * as crypto from 'crypto';

export const ML_DSA_65_ALGORITHM = 'ML-DSA-65';

export type MlDsaKeyPair = { publicKey: Uint8Array; secretKey: Uint8Array };

export type MlDsa65 = {
    generateKeyPair(): Promise<MlDsaKeyPair>;
    sign(message: Uint8Array, secretKey: Uint8Array): Promise<Uint8Array>;
    verify(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean>;
};

let sigPromise: Promise<MlDsa65> | null = null;

async function importOqsSig(): Promise<any> {
    // TS compiles NestJS as CommonJS; liboqs is ESM-only.
    // Using Function(...) preserves a real dynamic import at runtime.
    // eslint-disable-next-line no-new-func
    return new Function('return import("@openforge-sh/liboqs/sig")')();
}

export async function getMlDsa65(): Promise<MlDsa65> {
    if (!sigPromise) {
        sigPromise = (async () => {
            const sigMod = await importOqsSig();
            if (typeof sigMod.createMLDSA65 !== 'function') {
                throw new Error('liboqs SIG export createMLDSA65 is missing');
            }
            return (await sigMod.createMLDSA65()) as MlDsa65;
        })();
    }

    return sigPromise;
}
