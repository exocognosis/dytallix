import dilithiumPromise from 'dilithium-crystals-js';
try {
    const dilithium = await dilithiumPromise;
    const keys = dilithium.generateKeys(5);
    console.log('Keys keys:', Object.keys(keys));
    console.log('Public Key type:', typeof keys.publicKey);
} catch (e) {
    console.log('Error:', e);
}
