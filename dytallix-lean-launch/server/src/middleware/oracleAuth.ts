/**
 * Oracle HMAC authentication middleware
 * Validates X-Oracle-Signature header using HMAC-SHA256
 */

import { Request, Response, NextFunction } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';

export interface OracleAuthRequest extends Request {
  rawBody?: Buffer;
  oracleAuth?: {
    verified: boolean;
    source?: string;
  };
}

/**
 * HMAC-SHA256 signature verification for Oracle submissions
 * Requires DLX_ORACLE_INGEST_SECRET environment variable
 */
export function oracleAuthMiddleware(req: OracleAuthRequest, res: Response, next: NextFunction): void {
  const secret = process.env.DLX_ORACLE_INGEST_SECRET;
  
  // Skip auth in development if secret not set
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({
        error: 'Oracle authentication not configured',
        code: 'AUTH_CONFIG_MISSING'
      });
    }
    
    console.warn('Oracle HMAC auth disabled - DLX_ORACLE_INGEST_SECRET not set');
    req.oracleAuth = { verified: false };
    return next();
  }
  
  const signature = req.headers['x-oracle-signature'] as string;
  
  if (!signature) {
    return res.status(401).json({
      error: 'Missing X-Oracle-Signature header',
      code: 'MISSING_SIGNATURE'
    });
  }
  
  if (!req.rawBody) {
    return res.status(400).json({
      error: 'Raw body not available for signature verification',
      code: 'NO_RAW_BODY'
    });
  }
  
  try {
    // Validate signature format (should be hex string)
    if (!/^[a-fA-F0-9]{64}$/.test(signature)) {
      return res.status(401).json({
        error: 'Invalid signature format - expected 64 character hex string',
        code: 'INVALID_SIGNATURE_FORMAT'
      });
    }
    
    // Calculate expected signature
    const hmac = createHmac('sha256', secret);
    hmac.update(req.rawBody);
    const expectedSignature = hmac.digest('hex');
    
    // Timing-safe comparison
    const providedBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    
    if (providedBuffer.length !== expectedBuffer.length || 
        !timingSafeEqual(providedBuffer, expectedBuffer)) {
      
      // Log failed attempt (but not the actual signatures for security)
      console.warn('Oracle authentication failed', {
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        contentLength: req.rawBody.length
      });
      
      return res.status(401).json({
        error: 'Invalid signature',
        code: 'SIGNATURE_MISMATCH'
      });
    }
    
    // Extract source from headers if provided
    const source = req.headers['x-oracle-source'] as string || 'unknown';
    
    req.oracleAuth = {
      verified: true,
      source: source
    };
    
    next();
    
  } catch (error) {
    console.error('Oracle authentication error:', error);
    return res.status(500).json({
      error: 'Authentication verification failed',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Create HMAC signature for testing/client use
 */
export function createOracleSignature(payload: string | Buffer, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  return hmac.digest('hex');
}

/**
 * Validate Oracle environment configuration
 */
export function validateOracleConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.DLX_ORACLE_INGEST_SECRET) {
      errors.push('DLX_ORACLE_INGEST_SECRET is required in production');
    } else if (process.env.DLX_ORACLE_INGEST_SECRET.length < 32) {
      errors.push('DLX_ORACLE_INGEST_SECRET should be at least 32 characters');
    }
  }
  
  const modelId = process.env.DLX_ORACLE_MODEL_ID;
  if (modelId && !/^[a-zA-Z0-9_-]+$/.test(modelId)) {
    errors.push('DLX_ORACLE_MODEL_ID contains invalid characters');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}