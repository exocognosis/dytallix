export interface Keypair {
    sk: Uint8Array;
    pk: Uint8Array;
}
export declare const ALG = "dilithium5";
export declare function keypair(): Keypair;
export declare function sign(sk: Uint8Array, msg: Uint8Array): Uint8Array;
export declare function verify(pk: Uint8Array, msg: Uint8Array, sig: Uint8Array): boolean;
export declare function toB64(u8: Uint8Array): string;
//# sourceMappingURL=pqcMock.d.ts.map