import * as kyber from 'crystals-kyber-js';
console.log('Kyber exports:', kyber);
try {
    console.log('KeyGen1024 type:', typeof kyber.KeyGen1024);
} catch (e) {
    console.log('Error accessing KeyGen1024:', e);
}
