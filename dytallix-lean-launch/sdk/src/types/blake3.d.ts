declare module 'blake3' {
  export function hash(input: Uint8Array | ArrayBuffer | string): { digest(): Uint8Array };
}
