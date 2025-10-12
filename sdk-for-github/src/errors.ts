export enum ErrorCode {
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  NONCE_MISMATCH = 'NONCE_MISMATCH',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class DytallixError extends Error {
  public code: ErrorCode;
  public details?: any;

  constructor(code: ErrorCode, message: string, details?: any) {
    super(message);
    this.name = 'DytallixError';
    this.code = code;
    this.details = details;
  }

  static fromResponse(error: any): DytallixError {
    const message = error.response?.data?.error || error.message || 'Unknown error';
    
    // Parse error code from message
    if (message.includes('insufficient') || message.includes('INSUFFICIENT_FUNDS')) {
      return new DytallixError(
        ErrorCode.INSUFFICIENT_FUNDS,
        message,
        error.response?.data
      );
    }

    if (message.includes('signature') || message.includes('INVALID_SIGNATURE')) {
      return new DytallixError(
        ErrorCode.INVALID_SIGNATURE,
        message,
        error.response?.data
      );
    }

    if (message.includes('nonce')) {
      return new DytallixError(
        ErrorCode.NONCE_MISMATCH,
        message,
        error.response?.data
      );
    }

    if (message.includes('address')) {
      return new DytallixError(
        ErrorCode.INVALID_ADDRESS,
        message,
        error.response?.data
      );
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return new DytallixError(
        ErrorCode.NETWORK_ERROR,
        'Cannot connect to Dytallix node',
        { originalError: error.message }
      );
    }

    return new DytallixError(
      ErrorCode.UNKNOWN_ERROR,
      message,
      error.response?.data
    );
  }
}
