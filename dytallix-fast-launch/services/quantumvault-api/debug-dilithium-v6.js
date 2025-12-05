import dilithiumPromise from 'dilithium-crystals-js';
try {
    const dilithium = await dilithiumPromise;
    console.log('Params:', dilithium.DILITHIUM_PARAMS);
    const keys = dilithium.generateKeys(3);
    console.log('Keys (level 3):', keys);
} catch (e) {
    console.log('Error:', e);
}
