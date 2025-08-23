import Ajv from 'ajv'
import addFormats from 'ajv-formats'

// Import the schema as a JSON object
const faucetResponseSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://dytallix.io/schemas/faucet-response.json",
  "title": "Dytallix Faucet API Response Schema",
  "description": "Schema for validating faucet API responses from the Dytallix dual-token faucet system",
  "type": "object",
  "required": ["success"],
  "properties": {
    "success": {
      "type": "boolean",
      "description": "Indicates whether the faucet request was successful"
    },
    "dispensed": {
      "type": "array",
      "description": "Array of tokens that were dispensed (only present on success)",
      "items": {
        "type": "object",
        "required": ["symbol", "amount", "txHash"],
        "properties": {
          "symbol": {
            "type": "string",
            "enum": ["DGT", "DRT"],
            "description": "Token symbol (DGT for governance, DRT for rewards)"
          },
          "amount": {
            "type": "string",
            "pattern": "^[0-9]+(\\.?[0-9]+)?$",
            "description": "Amount of tokens dispensed as a string"
          },
          "txHash": {
            "type": "string",
            "pattern": "^0x[a-fA-F0-9]{64}$",
            "description": "Transaction hash for the dispense operation"
          }
        },
        "additionalProperties": false
      }
    },
    "message": {
      "type": "string",
      "description": "Human-readable message about the operation"
    },
    "error": {
      "type": "string",
      "enum": ["INVALID_ADDRESS", "INVALID_TOKEN", "RATE_LIMIT_EXCEEDED", "SERVER_ERROR"],
      "description": "Error code (only present on failure)"
    },
    "ok": {
      "type": "boolean",
      "description": "Legacy compatibility field for single token requests"
    },
    "token": {
      "type": "string",
      "enum": ["DGT", "DRT"],
      "description": "Legacy compatibility field for single token requests"
    },
    "amount": {
      "type": "string",
      "pattern": "^[0-9]+(\\.?[0-9]+)?$",
      "description": "Legacy compatibility field for single token requests"
    },
    "txHash": {
      "type": "string",
      "pattern": "^0x[a-fA-F0-9]{64}$",
      "description": "Legacy compatibility field for single token requests"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "RFC3339 timestamp of the response (optional)"
    }
  },
  "if": {
    "properties": {
      "success": { "const": true }
    }
  },
  "then": {
    "required": ["success", "dispensed", "message"]
  },
  "else": {
    "required": ["success", "error", "message"]
  },
  "additionalProperties": true
}

/**
 * Faucet API client with schema validation
 * Provides type-safe requests to the Dytallix faucet API with comprehensive validation
 */

// Initialize Ajv validator with format support
const ajv = new Ajv({ allErrors: true })
addFormats(ajv)

// Compile the faucet response schema
const validateFaucetResponse = ajv.compile(faucetResponseSchema)

/**
 * Faucet request parameters for dual-token system
 */
export interface FaucetRequest {
  address: string
  tokens?: ('DGT' | 'DRT')[]  // New dual-token format
  token?: 'DGT' | 'DRT'       // Legacy single-token format
}

/**
 * Validated faucet response structure
 */
export interface FaucetResponse {
  success: boolean
  dispensed?: Array<{
    symbol: 'DGT' | 'DRT'
    amount: string
    txHash: string
  }>
  message: string
  error?: 'INVALID_ADDRESS' | 'INVALID_TOKEN' | 'RATE_LIMIT_EXCEEDED' | 'SERVER_ERROR'
  // Legacy compatibility fields
  ok?: boolean
  token?: 'DGT' | 'DRT'
  amount?: string
  txHash?: string
  timestamp?: string
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string
  message: string
  value: any
}

/**
 * Faucet client with built-in schema validation
 */
export class FaucetClient {
  private readonly baseUrl: string

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl.replace(/\/$/, '') // Remove trailing slash
  }

  /**
   * Request tokens from the faucet with schema validation
   */
  async requestTokens(request: FaucetRequest): Promise<FaucetResponse> {
    // Validate request parameters
    this.validateRequest(request)

    try {
      const response = await fetch(`${this.baseUrl}/faucet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      // Parse response
      const data = await response.json()

      // Validate response schema
      if (!validateFaucetResponse(data)) {
        const errors = this.formatValidationErrors(validateFaucetResponse.errors || [])
        throw new FaucetValidationError('Invalid faucet API response schema', errors, data)
      }

      return data as FaucetResponse
    } catch (error) {
      if (error instanceof FaucetValidationError) {
        throw error
      }
      
      // Network or other errors
      throw new FaucetRequestError(
        `Faucet request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }

  /**
   * Validate request parameters
   */
  private validateRequest(request: FaucetRequest): void {
    if (!request.address || typeof request.address !== 'string') {
      throw new FaucetRequestError('Address is required and must be a string')
    }

    if (!request.address.startsWith('dytallix1')) {
      throw new FaucetRequestError('Address must be a valid Dytallix bech32 address')
    }

    // Validate token specification
    const hasTokens = request.tokens && Array.isArray(request.tokens) && request.tokens.length > 0
    const hasToken = request.token && typeof request.token === 'string'

    if (!hasTokens && !hasToken) {
      throw new FaucetRequestError('Either tokens array or token string must be specified')
    }

    if (hasTokens && hasToken) {
      throw new FaucetRequestError('Cannot specify both tokens array and token string')
    }

    // Validate token values
    if (hasTokens) {
      const validTokens = ['DGT', 'DRT']
      const invalidTokens = request.tokens!.filter(t => !validTokens.includes(t))
      if (invalidTokens.length > 0) {
        throw new FaucetRequestError(`Invalid tokens: ${invalidTokens.join(', ')}. Valid tokens are: ${validTokens.join(', ')}`)
      }
    }

    if (hasToken && !['DGT', 'DRT'].includes(request.token!)) {
      throw new FaucetRequestError('Invalid token. Valid tokens are: DGT, DRT')
    }
  }

  /**
   * Format Ajv validation errors into a more readable format
   */
  private formatValidationErrors(errors: any[]): ValidationError[] {
    return errors.map(error => ({
      field: error.instancePath || error.schemaPath || 'unknown',
      message: error.message || 'Validation failed',
      value: error.data
    }))
  }
}

/**
 * Error thrown when faucet request fails
 */
export class FaucetRequestError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message)
    this.name = 'FaucetRequestError'
  }
}

/**
 * Error thrown when faucet response fails schema validation
 */
export class FaucetValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: ValidationError[],
    public readonly responseData: any
  ) {
    super(message)
    this.name = 'FaucetValidationError'
  }
}

/**
 * Default faucet client instance
 */
export const faucetClient = new FaucetClient()

/**
 * Convenience function for requesting tokens
 */
export async function requestFaucetTokens(request: FaucetRequest): Promise<FaucetResponse> {
  return faucetClient.requestTokens(request)
}

/**
 * Validate a faucet response against the schema
 */
export function validateFaucetResponseSchema(data: any): { valid: boolean; errors: ValidationError[] } {
  const valid = validateFaucetResponse(data)
  const errors = valid ? [] : (validateFaucetResponse.errors || []).map(error => ({
    field: error.instancePath || error.schemaPath || 'unknown',
    message: error.message || 'Validation failed',
    value: error.data
  }))
  
  return { valid, errors }
}