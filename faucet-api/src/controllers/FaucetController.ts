import { Request, Response, NextFunction } from 'express';
import { FaucetError, FaucetErrorDefs } from '../errors/faucetErrors.js';
import { faucetConfig } from '../config/faucetConfig.js';
import { checkCooldown, recordCooldown, buildCooldownPayload } from '../services/faucet/cooldownStore.js';
import { ITokenDispenser } from '../services/faucet/tokenDispenser.js';
import { FaucetRequestBody, DispensedToken } from '../types/faucet.js';

export class FaucetController {
  constructor(private dispenser: ITokenDispenser) {}

  dispense = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body: FaucetRequestBody = req.body;
      const { address, tokens } = body;
      const symbols = tokens.map(t => t.symbol);
      const blocked = checkCooldown(address, symbols);
      if (blocked.length) {
        const maxRemain = Math.max(...blocked.map(b => b.secondsRemaining));
        throw new FaucetError(FaucetErrorDefs.COOLDOWN_ACTIVE, { blocked });
      }
      const results: DispensedToken[] = [];
      for (const t of tokens) {
        const cfg = faucetConfig.allowedTokens[t.symbol];
        if (!cfg) throw new FaucetError(FaucetErrorDefs.UNSUPPORTED_TOKEN, { symbol: t.symbol });
        try {
          const { txHash } = await this.dispenser.dispense({ symbol: t.symbol, amount: t.amount, address });
          results.push({ symbol: t.symbol, amount: t.amount, txHash });
          recordCooldown(address, t.symbol);
        } catch (e: any) {
          if (e instanceof FaucetError) throw e;
          throw new FaucetError(FaucetErrorDefs.TX_SUBMISSION_FAILED, { symbol: t.symbol });
        }
      }
      const cooldowns = buildCooldownPayload(address, symbols);
      res.json({ success: true, dispensed: results, cooldowns, message: 'Dispense successful.' });
    } catch (err) {
      next(err);
    }
  };
}