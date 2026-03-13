import { DelegatedEnvelopePayload, DelegatedSigningEnvelope } from './types.js';
import { getMlDsa65 } from './crypto.js';

export class EnvelopeBuilder {
    private payload: DelegatedEnvelopePayload;

    constructor(payload: DelegatedEnvelopePayload) {
        this.payload = payload;
    }

    /**
     * Deterministically stringify the payload object so signatures are consistent.
     */
    private deterministicStringify(obj: any): string {
        if (obj === null || typeof obj !== 'object') {
            return JSON.stringify(obj);
        }
        if (Array.isArray(obj)) {
            return '[' + obj.map((item) => this.deterministicStringify(item)).join(',') + ']';
        }
        const keys = Object.keys(obj).sort();
        const keyVals = keys.map((key) => {
            return JSON.stringify(key) + ':' + this.deterministicStringify(obj[key]);
        });
        return '{' + keyVals.join(',') + '}';
    }

    public serializePayload(): Uint8Array {
        const jsonStr = this.deterministicStringify(this.payload);
        return new TextEncoder().encode(jsonStr);
    }

    public async sign(secretKey: Uint8Array): Promise<DelegatedSigningEnvelope> {
        const message = this.serializePayload();
        const mlDsa = await getMlDsa65();
        const signature = await mlDsa.sign(message, secretKey);

        return {
            payload: this.payload,
            signature
        };
    }

    public static async verify(envelope: DelegatedSigningEnvelope, publicKey: Uint8Array): Promise<boolean> {
        const builder = new EnvelopeBuilder(envelope.payload);
        const message = builder.serializePayload();
        const mlDsa = await getMlDsa65();
        return mlDsa.verify(message, envelope.signature, publicKey);
    }
}
