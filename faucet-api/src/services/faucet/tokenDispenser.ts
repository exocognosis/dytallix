// Simplified abstraction. Real implementation would integrate an ethers / viem signer.
import crypto from 'crypto';
import { FaucetError, FaucetErrorDefs } from '../../errors/faucetErrors.js';

export interface DispenseParams { symbol: string; amount: string; address: string; }
export interface DispenseResult { txHash: string; }

export interface ITokenDispenser {
  dispense(p: DispenseParams): Promise<DispenseResult>;
}

export class MockTokenDispenser implements ITokenDispenser {
  private counter = 0;
  async dispense(p: DispenseParams): Promise<DispenseResult> {
    // Deterministic pseudo tx hash
    const hash = crypto.createHash('sha256').update(`${p.symbol}:${p.amount}:${p.address}:${this.counter++}`).digest('hex');
    return { txHash: '0x' + hash.slice(0, 64) };
  }
}

export class FailingTokenDispenser implements ITokenDispenser {
  async dispense(): Promise<DispenseResult> { throw new FaucetError(FaucetErrorDefs.TX_SIGNING_FAILED); }
}