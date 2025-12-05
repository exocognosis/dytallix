import { MlKem1024 } from 'crystals-kyber-js';
try {
    const kem = new MlKem1024();
    const [pk, sk] = await kem.generateKeyPair();

    console.log('Encapsulating with encaps...');
    const result = await kem.encaps(pk);
    console.log('Result type:', typeof result);
    console.log('Result keys:', Object.keys(result));
    console.log('Result:', result);
} catch (e) {
    console.log('Error:', e);
}
