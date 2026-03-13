import { faucetConfig } from '../../config/faucetConfig.js';

interface CooldownEntry { nextAllowedAt: number; }
const store = new Map<string, CooldownEntry>(); // key = address|symbol

export function checkCooldown(address: string, symbols: string[], now = Date.now()) {
  const blocked: { symbol: string; secondsRemaining: number }[] = [];
  for (const sym of symbols) {
    const key = `${address.toLowerCase()}|${sym}`;
    const entry = store.get(key);
    if (entry && entry.nextAllowedAt > now) {
      blocked.push({ symbol: sym, secondsRemaining: Math.ceil((entry.nextAllowedAt - now) / 1000) });
    }
  }
  return blocked;
}

export function recordCooldown(address: string, symbol: string, now = Date.now()) {
  const cfg = faucetConfig.allowedTokens[symbol];
  if (!cfg) return;
  const key = `${address.toLowerCase()}|${symbol}`;
  store.set(key, { nextAllowedAt: now + cfg.cooldownSeconds * 1000 });
}

export function buildCooldownPayload(address: string, symbols: string[], now = Date.now()) {
  const tokens: Record<string, { nextAllowedAt: number }> = {};
  for (const sym of symbols) {
    const key = `${address.toLowerCase()}|${sym}`;
    const entry = store.get(key);
    if (entry) tokens[sym] = { nextAllowedAt: entry.nextAllowedAt };
  }
  return { tokens };
}