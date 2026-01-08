import { MlKem1024 } from 'crystals-kyber-js';
try {
    const kem = new MlKem1024();
    const keys = await kem.generateKeyPair();
    console.log('Keys:', keys);
    console.log('Public Key type:', typeof keys.publicKey);
    console.log('Private Key type:', typeof keys.privateKey);
} catch (e) {
    console.log('Error:', e);
}
