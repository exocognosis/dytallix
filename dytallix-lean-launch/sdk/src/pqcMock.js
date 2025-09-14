import { hash } from 'blake3';
export const ALG = 'mock-blake3';
export function keypair() {
    // Derive a pseudo-random secret from crypto and hash to get pk
    const sk = crypto.getRandomValues(new Uint8Array(32));
    const pk = hash(sk).digest();
    return { sk, pk };
}
export function sign(sk, msg) {
    const data = new Uint8Array(sk.length + msg.length);
    data.set(sk, 0);
    data.set(msg, sk.length);
    return hash(data).digest();
}
export function verify(pk, msg, sig) {
    // We can't recover sk here; accept if re-derivation matches signature using unknown sk is impossible.
    // For mock purposes, we just check signature length.
    return pk.byteLength === 32 && sig.byteLength === 32 && msg.byteLength > 0;
}
export function toB64(u8) {
    return Buffer.from(u8).toString('base64');
}
//# sourceMappingURL=pqcMock.js.map