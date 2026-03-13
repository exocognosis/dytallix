/**
 * SDK API Introspection
 * Discover what's actually exported from @dytallix/sdk
 */

const sdk = require('@dytallix/sdk');

console.log('='.repeat(60));
console.log('📦 @dytallix/sdk API INTROSPECTION');
console.log('='.repeat(60));
console.log('');

console.log('Top-level exports:');
console.log('-'.repeat(40));
for (const key of Object.keys(sdk)) {
    const type = typeof sdk[key];
    console.log(`  ${key}: ${type}`);

    // If it's a class/function, show its prototype methods
    if (type === 'function') {
        const proto = sdk[key].prototype;
        if (proto) {
            const methods = Object.getOwnPropertyNames(proto).filter(n => n !== 'constructor');
            if (methods.length > 0) {
                console.log(`    Methods: ${methods.join(', ')}`);
            }
        }

        // Show static methods
        const statics = Object.getOwnPropertyNames(sdk[key]).filter(n =>
            !['length', 'name', 'prototype', 'arguments', 'caller'].includes(n)
        );
        if (statics.length > 0) {
            console.log(`    Static: ${statics.join(', ')}`);
        }
    }
}

console.log('');

// Try to instantiate client and inspect
console.log('DytallixClient instance methods:');
console.log('-'.repeat(40));
try {
    const client = new sdk.DytallixClient({ rpcUrl: 'https://dytallix.com/api' });
    const clientMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(client))
        .filter(n => n !== 'constructor');
    clientMethods.forEach(m => console.log(`  ${m}()`));

    console.log('');
    console.log('Client properties:');
    console.log('-'.repeat(40));
    for (const [k, v] of Object.entries(client)) {
        console.log(`  ${k}: ${typeof v}`);
    }
} catch (e) {
    console.log('  Error:', e.message);
}

console.log('');
console.log('='.repeat(60));
