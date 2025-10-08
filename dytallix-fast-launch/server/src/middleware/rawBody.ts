/**
 * Raw body parsing middleware for HMAC signature verification
 * Captures the raw request body before JSON parsing for signature validation
 */

import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

/**
 * Middleware to capture raw request body for HMAC verification
 * Must be applied before any JSON parsing middleware
 */
export function rawBodyMiddleware(req: Request, res: Response, next: NextFunction): void {
  let data = Buffer.alloc(0);
  
  req.on('data', (chunk: Buffer) => {
    data = Buffer.concat([data, chunk]);
  });
  
  req.on('end', () => {
    req.rawBody = data;
    next();
  });
  
  req.on('error', (err) => {
    console.error('Error reading request body:', err);
    next(err);
  });
}

/**
 * Alternative implementation using raw-body package if available
 * More robust but requires additional dependency
 */
export async function rawBodyMiddlewareAsync(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const chunks: Buffer[] = [];
    
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    
    req.rawBody = Buffer.concat(chunks);
    next();
  } catch (error) {
    console.error('Error reading request body:', error);
    next(error);
  }
}