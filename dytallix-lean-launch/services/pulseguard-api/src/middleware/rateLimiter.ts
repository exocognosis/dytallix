import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { config } from '../config';
import { logger } from '../utils/logger';

// Helper to derive a stable client key
const clientKey = (req: Request): string => {
  const xfwd = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
  const ra = (req.socket?.remoteAddress || req.ip || 'unknown').toString();
  return xfwd || ra || 'unknown';
};

// In-memory rate limiter instance
const ipLimiter = new RateLimiterMemory({
  points: config.rateLimit.maxRequests,
  duration: Math.max(1, Math.floor(config.rateLimit.windowMs / 1000)), // seconds
});

// Express middleware
export const rateLimiter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await ipLimiter.consume(clientKey(req));
    next();
  } catch (rejRes: any) {
    const remainingPoints = rejRes?.remainingPoints ?? 0;
    const msBeforeNext = rejRes?.msBeforeNext ?? 0;

    res.set({
      'X-RateLimit-Limit': String(config.rateLimit.maxRequests),
      'X-RateLimit-Remaining': String(remainingPoints),
      'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString(),
      'Retry-After': String(Math.ceil(msBeforeNext / 1000)),
    });

    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent'),
    });

    res.status(429).json({
      error: {
        message: 'Too many requests',
        statusCode: 429,
        timestamp: new Date().toISOString(),
        retryAfter: Math.ceil(msBeforeNext / 1000),
      },
    });
  }
};