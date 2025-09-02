const assert = require('assert');

function applyBurn(amount, fee, rate) {
  return amount - fee * rate;
}

assert.strictEqual(applyBurn(100, 10, 0.75), 92.5);

console.log('Burn tests passed');
