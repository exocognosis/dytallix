import { blake3 } from '@noble/hashes/blake3';

export type DAddr = string;

export interface Scope {
    contractAddress?: string;
    method?: string;
    maxAmount?: string;
}

export interface TTL {
    validUntilTimestamp: number; // Unix timestamp in seconds
}

export interface DelegatedEnvelopePayload {
    delegator: DAddr;
    delegatee: DAddr;
    scopes: Scope[];
    ttl: TTL;
    nonce: number;
}

export interface DelegatedSigningEnvelope {
    payload: DelegatedEnvelopePayload;
    signature: Uint8Array; // ML-DSA-65 signature
}

export function computeDAddr(publicKeyBytes: Uint8Array): DAddr {
    const hash = blake3(publicKeyBytes);
    // In a full implementation we would encode using Bech32m
    // For the MVP SDK, we'll return a hex string prefixed with 'dyt'
    return 'dyt1' + Buffer.from(hash).toString('hex').substring(0, 32);
}
