import { describe, it, expect } from 'vitest';
import { EnvelopeBuilder } from '../src/envelope';
import { getMlDsa65 } from '../src/crypto';
import { computeDAddr } from '../src/types';

describe('EnvelopeBuilder', () => {
    it('should format and sign envelopes deterministically', async () => {
        const mlDsa = await getMlDsa65();
        const delegatorKey = await mlDsa.generateKeyPair();
        const delegatorDAddr = computeDAddr(delegatorKey.publicKey);

        const delegateeKey = await mlDsa.generateKeyPair();
        const delegateeDAddr = computeDAddr(delegateeKey.publicKey);

        const payload = {
            delegator: delegatorDAddr,
            delegatee: delegateeDAddr,
            scopes: [{ contractAddress: '0x123', maxAmount: '100' }],
            ttl: { validUntilTimestamp: Math.floor(Date.now() / 1000) + 3600 },
            nonce: 1
        };

        const builder = new EnvelopeBuilder(payload);
        const envelope = await builder.sign(delegatorKey.secretKey);

        expect(envelope.payload).toEqual(payload);
        expect(envelope.signature).toBeInstanceOf(Uint8Array);

        const isValid = await EnvelopeBuilder.verify(envelope, delegatorKey.publicKey);
        expect(isValid).toBe(true);
    });
});
