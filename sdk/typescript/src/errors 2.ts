/**
 * Error codes for Dytallix SDK operations
 */
export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  
  // PQC errors
  PQC_NOT_INITIALIZED = 'PQC_NOT_INITIALIZED',
  PQC_KEYGEN_FAILED = 'PQC_KEYGEN_FAILED',
  PQC_SIGN_FAILED = 'PQC_SIGN_FAILED',
  PQC_VERIFY_FAILED = 'PQC_VERIFY_FAILED',
  
  // Wallet errors
  INVALID_KEYSTORE = 'INVALID_KEYSTORE',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  
  // Transaction errors
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  INVALID_TRANSACTION = 'INVALID_TRANSACTION',
}

/**
 * Custom error class for Dytallix SDK
 */
export class DytallixError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'DytallixError';
    this.code = code;
    this.details = details;
    
    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DytallixError);
    }
  }
}
