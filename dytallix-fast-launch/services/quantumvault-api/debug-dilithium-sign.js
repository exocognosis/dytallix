import dilithiumPromise from 'dilithium-crystals-js';
import { randomBytes } from 'crypto';

try {
    const dilithium = await dilithiumPromise;
    const keys = dilithium.generateKeys(3);
    const message = randomBytes(32);

    console.log('Signing...');
    const signature = dilithium.sign(message, keys.privateKey, 3);

    console.log('Signature type:', typeof signature);
    console.log('Is Array?', Array.isArray(signature));
    console.log('Is Buffer?', Buffer.isBuffer(signature));
    console.log('Is Uint8Array?', signature instanceof Uint8Array);
    console.log('Value:', signature);

} catch (e) {
    console.log('Error:', e);
}
