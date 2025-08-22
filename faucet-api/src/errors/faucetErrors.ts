export interface FaucetErrorDefinition {
  code: string;
  httpStatus: number;
  message: string;
}

export class FaucetError extends Error {
  public httpStatus: number;
  public code: string;
  public details?: Record<string, unknown>;
  constructor(def: FaucetErrorDefinition, details?: Record<string, unknown>) {
    super(def.message);
    this.code = def.code;
    this.httpStatus = def.httpStatus;
    this.details = details;
  }
  with(details?: Record<string, unknown>) {
    return new FaucetError({ code: this.code, httpStatus: this.httpStatus, message: this.message }, details);
  }
}

function def(code: string, httpStatus: number, message: string): FaucetErrorDefinition { return { code, httpStatus, message }; }

export const FaucetErrorDefs = {
  INVALID_REQUEST: def('FAUCET_INVALID_REQUEST', 400, 'Invalid faucet request.'),
  INVALID_ADDRESS: def('FAUCET_INVALID_ADDRESS', 400, 'Address format is invalid.'),
  UNSUPPORTED_TOKEN: def('FAUCET_UNSUPPORTED_TOKEN', 400, 'Unsupported token(s) requested.'),
  DUPLICATE_SYMBOL: def('FAUCET_DUPLICATE_SYMBOL', 400, 'Duplicate token symbols in request.'),
  AMOUNT_INVALID: def('FAUCET_AMOUNT_INVALID', 400, 'Token amount is invalid.'),
  RATE_LIMIT_IP: def('FAUCET_RATE_LIMIT_IP', 429, 'IP rate limit exceeded.'),
  RATE_LIMIT_ADDRESS: def('FAUCET_RATE_LIMIT_ADDRESS', 429, 'Address rate limit exceeded.'),
  COOLDOWN_ACTIVE: def('FAUCET_COOLDOWN_ACTIVE', 429, 'Cooldown active.'),
  NOTHING_TO_DISPENSE: def('FAUCET_NOTHING_TO_DISPENSE', 400, 'Nothing to dispense.'),
  TX_SIGNING_FAILED: def('FAUCET_TX_SIGNING_FAILED', 502, 'Transaction signing failed.'),
  TX_SUBMISSION_FAILED: def('FAUCET_TX_SUBMISSION_FAILED', 502, 'Transaction submission failed.'),
  INTERNAL: def('FAUCET_INTERNAL', 500, 'Internal faucet error.'),
  CONFIGURATION_ERROR: def('FAUCET_CONFIGURATION_ERROR', 500, 'Faucet misconfiguration.'),
};