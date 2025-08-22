import { Request, Response, NextFunction } from 'express';
import { FaucetError, FaucetErrorDefs } from '../errors/faucetErrors.js';
import { faucetConfig } from '../config/faucetConfig.js';

interface CounterEntry { count: number; expiresAt: number; }
const ipCounters = new Map<string, CounterEntry>();
const addrCounters = new Map<string, CounterEntry>();

function hit(map: Map<string, CounterEntry>, key: string, windowMs: number, max: number): { allowed: boolean; remainingMs: number } {
  const now = Date.now();
  let entry = map.get(key);
  if (!entry || entry.expiresAt <= now) {
    entry = { count: 0, expiresAt: now + windowMs };
    map.set(key, entry);
  }
  entry.count += 1;
  return { allowed: entry.count <= max, remainingMs: Math.max(0, entry.expiresAt - now) };
}

export function rateLimit(req: Request, _res: Response, next: NextFunction) {
  const ip = req.ip || 'unknown';
  const address = (req.body && req.body.address) || undefined;
  const ipCfg = faucetConfig.rateLimit.ip;
  const ipRes = hit(ipCounters, ip, ipCfg.windowMs, ipCfg.max);
  if (!ipRes.allowed) return next(new FaucetError(FaucetErrorDefs.RATE_LIMIT_IP, { retryAfterMs: ipRes.remainingMs }));
  if (address) {
    const addrCfg = faucetConfig.rateLimit.address;
    const addrRes = hit(addrCounters, address.toLowerCase(), addrCfg.windowMs, addrCfg.max);
    if (!addrRes.allowed) return next(new FaucetError(FaucetErrorDefs.RATE_LIMIT_ADDRESS, { retryAfterMs: addrRes.remainingMs }));
  }
  next();
}