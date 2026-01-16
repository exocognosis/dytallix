// Type declarations for pqc-wasm module
// This file provides types for the optional pqc-wasm peer dependency

declare module 'pqc-wasm' {
    /**
     * Generate a new ML-DSA keypair
     * @returns JSON string containing publicKey and privateKey as hex strings
     */
    export function generate_keypair(): string;

    /**
     * Sign a message with a private key
     * @param private_key - The private key as Uint8Array
     * @param message - The message to sign as Uint8Array
     * @returns The signature as Uint8Array
     */
    export function sign(private_key: Uint8Array, message: Uint8Array): Uint8Array;

    /**
     * Verify a signature
     * @param public_key - The public key as Uint8Array
     * @param message - The original message as Uint8Array
     * @param signature - The signature to verify as Uint8Array
     * @returns true if valid, false otherwise
     */
    export function verify(public_key: Uint8Array, message: Uint8Array, signature: Uint8Array): boolean;

    /**
     * Convert a public key to a Dytallix address
     * @param public_key - The public key as Uint8Array
     * @returns The dyt1... address string
     */
    export function public_key_to_address(public_key: Uint8Array): string;

    /**
     * Derive the public key from a private key
     * @param private_key - The private key as Uint8Array
     * @returns The public key as Uint8Array
     */
    export function derive_public_key(private_key: Uint8Array): Uint8Array;

    /**
     * Synchronously initialize the WASM module
     * @param input - The WASM binary as ArrayBuffer or Uint8Array
     */
    export function initSync(input: ArrayBuffer | Uint8Array): void;

    /**
     * Default export for async browser initialization
     */
    export default function init(): Promise<void>;
}
