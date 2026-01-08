import { MlKem1024 } from 'crystals-kyber-js';

function getAllFuncs(obj) {
    let props = [];
    let currentObj = obj;
    do {
        props = props.concat(Object.getOwnPropertyNames(currentObj));
    } while ((currentObj = Object.getPrototypeOf(currentObj)));

    return props.sort().filter((e, i, arr) => (e != arr[i + 1] && typeof obj[e] == 'function'));
}

try {
    const kem = new MlKem1024();
    console.log('All functions:', getAllFuncs(kem));
} catch (e) {
    console.log('Error:', e);
}
