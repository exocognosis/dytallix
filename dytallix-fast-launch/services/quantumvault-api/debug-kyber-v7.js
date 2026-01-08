import { MlKem1024 } from 'crystals-kyber-js';
try {
    const kem = new MlKem1024();
    const [pk, sk] = await kem.generateKeyPair();

    console.log('Encapsulating with encap...');
    const result = await kem.encap(pk);
    console.log('Result type:', typeof result);
    console.log('Result is array?', Array.isArray(result));
    if (Array.isArray(result)) {
        console.log('Result length:', result.length);
        console.log('Item 0 length:', result[0].length);
        console.log('Item 1 length:', result[1].length);
    }
} catch (e) {
    console.log('Error:', e);
}
