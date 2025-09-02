const assert = require('assert');

class Staking {
  constructor() {
    this.stakes = {};
  }
  stake(user, amount) {
    this.stakes[user] = (this.stakes[user] || 0) + amount;
  }
}

const s = new Staking();
s.stake('alice', 100);
assert.strictEqual(s.stakes['alice'], 100);

console.log('Staking tests passed');
