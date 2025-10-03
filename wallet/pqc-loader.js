// Lightweight ESM loader to expose PQC keygen/sign/verify in the browser using pqc-wasm
// Falls back to existing wallet.js simulation if loading fails.

(async () => {
  try {
    // Prefer local workspace build in DytallixLiteLaunch
    let wasm;
    try {
      wasm = await import('../DytallixLiteLaunch/crates/pqc-wasm/pkg-web');
    } catch (e) {
      // Fallback to installed aliases if available
      wasm = await import('pqc-wasm-web');
    }

    function zeroize(u8) {
      if (!u8) return;
      for (let i = 0; i < u8.length; i++) u8[i] = 0;
    }

    // Expose a minimal API to window for wallet.js to detect
    window.DytPQC = {
      keygen: () => wasm.keygen(),
      sign: (msg, sk) => wasm.sign(msg, sk),
      verify: (msg, sig, pk) => wasm.verify(msg, sig, pk),
      pubkeyToAddress: (pk_b64, hrp = 'dyt') => wasm.pubkey_to_address(pk_b64, hrp),
      zeroize,
    };
  } catch (_) {
    // silent fallback
  }
})();
