const assert = require('assert');

function annualEmission(supply, rate) {
  return (supply * rate) / 100;
}

assert.strictEqual(annualEmission(1000, 5), 50);

console.log('Emission tests passed');
