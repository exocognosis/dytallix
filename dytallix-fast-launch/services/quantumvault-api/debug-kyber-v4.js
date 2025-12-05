import { MlKem1024 } from 'crystals-kyber-js';
try {
    const kem = new MlKem1024();
    const [pk, sk] = await kem.generateKeyPair();

    console.log('Encapsulating...');
    const result = await kem.encapsulate(pk);
    console.log('Encapsulate result keys:', Object.keys(result));
    console.log('Result:', result);

    // Check decapsulate too
    // const sharedSecret = await kem.decapsulate(result[0], sk);
} catch (e) {
    console.log('Error:', e);
}
