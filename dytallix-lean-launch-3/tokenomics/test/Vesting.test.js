const assert = require('assert');
const cfg = require('../AllocationConfig.json');

function calculateRemaining(total, released) {
  return total - released;
}

assert.strictEqual(calculateRemaining(1000, 200), 800);
assert.strictEqual(cfg.allocations.devTeam + cfg.allocations.validators, 0.25);

console.log('Vesting tests passed');
