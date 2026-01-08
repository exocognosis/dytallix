import { MlKem1024 } from 'crystals-kyber-js';
console.log('MlKem1024:', MlKem1024);
try {
    const kem = new MlKem1024();
    console.log('Instance methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(kem)));

    // Try to generate keys
    const keys = await kem.generateKeyPair();
    console.log('Generated keys:', Object.keys(keys));
} catch (e) {
    console.log('Error:', e);
}
