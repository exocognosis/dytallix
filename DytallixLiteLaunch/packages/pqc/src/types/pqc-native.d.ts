/**
 * Type declarations for optional native addon
 */

declare module '@dyt/pqc-native' {
  export function keygen(): {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
  };

  export function sign(message: Uint8Array, secretKey: Uint8Array): Uint8Array;

  export function verify(
    message: Uint8Array,
    signature: Uint8Array,
    publicKey: Uint8Array
  ): boolean;

  export function addressFromPublicKey(
    publicKey: Uint8Array,
    hrp: string
  ): string;
}
