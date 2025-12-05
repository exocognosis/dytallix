import dilithiumPromise from 'dilithium-crystals-js';
try {
    const dilithium = await dilithiumPromise;
    console.log('Dilithium resolved:', Object.keys(dilithium));
} catch (e) {
    console.log('Error:', e);
}
