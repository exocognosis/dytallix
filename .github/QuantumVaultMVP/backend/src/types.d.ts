declare module 'crystals-kyber' {
    export class Kyber1024 {
        static keyPair(): Promise<{ pk: Uint8Array, sk: Uint8Array }>;
        static encapsulate(pk: Uint8Array): Promise<{ ct: Uint8Array, ss: Uint8Array }>;
        static decapsulate(ct: Uint8Array, sk: Uint8Array): Promise<Uint8Array>;
    }
}
