import { Request, Response, NextFunction } from 'express';
import { faucetConfig } from '../config/faucetConfig.js';
import { FaucetError, FaucetErrorDefs } from '../errors/faucetErrors.js';
import { FaucetRequestBody } from '../types/faucet.js';

const addressRegex = /^0x[a-fA-F0-9]{40}$/; // Replace if chain differs

export function validateFaucetRequest(req: Request, _res: Response, next: NextFunction) {
  const body: FaucetRequestBody = req.body;
  if (!body || typeof body !== 'object') return next(new FaucetError(FaucetErrorDefs.INVALID_REQUEST));
  const { address, tokens } = body;
  if (!address || typeof address !== 'string' || !addressRegex.test(address)) {
    return next(new FaucetError(FaucetErrorDefs.INVALID_ADDRESS));
  }
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return next(new FaucetError(FaucetErrorDefs.INVALID_REQUEST, { reason: 'tokens array required' }));
  }
  if (tokens.length > faucetConfig.maxTokensPerRequest) {
    return next(new FaucetError(FaucetErrorDefs.INVALID_REQUEST, { reason: 'too many tokens' }));
  }
  const seen = new Set<string>();
  for (const t of tokens) {
    if (!t || typeof t.symbol !== 'string' || typeof t.amount !== 'string') {
      return next(new FaucetError(FaucetErrorDefs.INVALID_REQUEST));
    }
    if (seen.has(t.symbol)) return next(new FaucetError(FaucetErrorDefs.DUPLICATE_SYMBOL, { symbol: t.symbol }));
    seen.add(t.symbol);
    const cfg = faucetConfig.allowedTokens[t.symbol];
    if (!cfg) return next(new FaucetError(FaucetErrorDefs.UNSUPPORTED_TOKEN, { symbol: t.symbol }));
    if (!/^\d+(\.\d+)?$/.test(t.amount)) return next(new FaucetError(FaucetErrorDefs.AMOUNT_INVALID, { symbol: t.symbol }));
    // Simple numeric compare (integer/decimal safe only for small numbers). Real impl: use BigInt / BN.
    if (parseFloat(t.amount) <= 0 || parseFloat(t.amount) > parseFloat(cfg.maxPerRequest)) {
      return next(new FaucetError(FaucetErrorDefs.AMOUNT_INVALID, { symbol: t.symbol }));
    }
  }
  return next();
}