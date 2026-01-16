/**
 * Debug pqc-wasm loading
 */

console.log('Testing pqc-wasm directly...\n');

try {
    const pqc = require('pqc-wasm');
    console.log('pqc-wasm exports:', Object.keys(pqc));

    // Try to initialize
    if (pqc.init) {
        console.log('Calling pqc.init()...');
        pqc.init().then(() => {
            console.log('✅ pqc-wasm initialized');
            console.log('Available functions:', Object.keys(pqc).filter(k => typeof pqc[k] === 'function'));
        }).catch(err => {
            console.log('❌ init failed:', err.message);
        });
    } else if (pqc.default && pqc.default.init) {
        console.log('Calling pqc.default.init()...');
        pqc.default.init().then(() => {
            console.log('✅ pqc-wasm (default) initialized');
        }).catch(err => {
            console.log('❌ default.init failed:', err.message);
        });
    } else {
        console.log('No init function found. Available:', Object.keys(pqc));
    }
} catch (err) {
    console.log('❌ require pqc-wasm failed:', err.message);
}
