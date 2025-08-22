const { runStartupSelfTest } = require('../security/selfTest');

describe('startup self-test', () => {
  const originalEnv = { ...process.env };
  
  // Reset the alreadyRan flag before each test by reloading the module
  beforeEach(() => {
    jest.resetModules();
  });
  
  afterEach(() => { 
    process.env = { ...originalEnv }; 
  });

  test('success path with empty manifest (non-production)', async () => {
    const { runStartupSelfTest } = require('../security/selfTest');
    const logs = [];
    await runStartupSelfTest({ manifestPath: 'artifacts/pqclean-manifest.json', vendorRoot: 'vendor/pqclean', logFn: o => logs.push(o) });
    expect(logs.some(l => l.level === 'info' && /All security self-tests passed/.test(l.msg))).toBe(true);
  });

  test('fail-closed triggers exit in production on PQC failure', async () => {
    const { runStartupSelfTest } = require('../security/selfTest');
    process.env.NODE_ENV = 'production';
    const exits = [];
    const badAdapter = { async generateKeyPair() { throw new Error('forced_failure'); } };
    let threw = false;
    try {
      await runStartupSelfTest({ pqcAdapter: badAdapter, manifestPath: 'artifacts/pqclean-manifest.json', vendorRoot: 'vendor/pqclean', exitFn: (code) => { exits.push(code); throw new Error('exit'); }, logFn: () => {} });
    } catch (e) { threw = true; }
    expect(threw).toBe(true);
    expect(exits).toEqual([1]);
  });
});