import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { config } from '../config';
import { logger } from '../utils/logger';

const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req: Request) => req.ip,
  points: config.rateLimit.maxRequests,
  duration: config.rateLimit.windowMs / 1000, // seconds
});

export const rateLimiter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes: any) {
    const remainingPoints = rejRes?.remainingPoints || 0;
    const msBeforeNext = rejRes?.msBeforeNext || 0;

    res.set({
      'X-RateLimit-Limit': config.rateLimit.maxRequests.toString(),
      'X-RateLimit-Remaining': remainingPoints.toString(),
      'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString(),
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