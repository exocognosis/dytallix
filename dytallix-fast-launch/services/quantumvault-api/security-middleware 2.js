/**
 * Security Middleware for QuantumVault
 * 
 * Production-grade security features:
 * - Rate limiting
 * - Request validation
 * - Security headers
 * - IP filtering
 * - Request sanitization
 */

import { createHash } from 'crypto';

class SecurityMiddleware {
  constructor(options = {}) {
    this.rateLimits = new Map(); // IP -> requests array
    this.rateLimit = options.rateLimit || {
      windowMs: 60000, // 1 minute
      maxRequests: 100  // 100 requests per minute
    };

    this.ipWhitelist = options.ipWhitelist || [];
    this.ipBlacklist = options.ipBlacklist || [];
    this.trustProxy = options.trustProxy || false;
  }

  /**
   * Rate limiting middleware
   */
  rateLimit() {
    return (req, res, next) => {
      const ip = this.getClientIp(req);
      const now = Date.now();

      // Get or create rate limit record for IP
      if (!this.rateLimits.has(ip)) {
        this.rateLimits.set(ip, []);
      }

      const requests = this.rateLimits.get(ip);

      // Remove old requests outside the time window
      const validRequests = requests.filter(
        time => now - time < this.rateLimit.windowMs
      );

      // Check if rate limit exceeded
      if (validRequests.length >= this.rateLimit.maxRequests) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil(this.rateLimit.windowMs / 1000),
          limit: this.rateLimit.maxRequests,
          window: `${this.rateLimit.windowMs / 1000}s`
        });
      }

      // Add current request
      validRequests.push(now);
      this.rateLimits.set(ip, validRequests);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', this.rateLimit.maxRequests);
      res.setHeader('X-RateLimit-Remaining', this.rateLimit.maxRequests - validRequests.length);
      res.setHeader('X-RateLimit-Reset', now + this.rateLimit.windowMs);

      next();
    };
  }

  /**
   * IP filtering middleware
   */
  ipFilter() {
    return (req, res, next) => {
      const ip = this.getClientIp(req);

      // Check blacklist
      if (this.ipBlacklist.includes(ip)) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Your IP address is blocked'
        });
      }

      // Check whitelist (if configured)
      if (this.ipWhitelist.length > 0 && !this.ipWhitelist.includes(ip)) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Your IP address is not whitelisted'
        });
      }

      next();
    };
  }

  /**
   * Security headers middleware
   */
  securityHeaders() {
    return (req, res, next) => {
      // Prevent clickjacking
      res.setHeader('X-Frame-Options', 'DENY');
      
      // Prevent MIME sniffing
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // Enable XSS protection
      res.setHeader('X-XSS-Protection', '1; mode=block');
      
      // Referrer policy
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      // Content Security Policy
      res.setHeader('Content-Security-Policy', "default-src 'self'");
      
      // Strict Transport Security (HTTPS only)
      if (req.secure) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      }

      // Remove sensitive headers
      res.removeHeader('X-Powered-By');
      
      next();
    };
  }

  /**
   * Request validation middleware
   */
  validateRequest() {
    return (req, res, next) => {
      // Validate content type for POST/PUT requests
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const contentType = req.get('Content-Type');
        
        if (!contentType) {
          return res.status(400).json({
            error: 'Content-Type header required'
          });
        }

        if (!contentType.includes('application/json') && 
            !contentType.includes('multipart/form-data')) {
          return res.status(415).json({
            error: 'Unsupported Media Type',
            supported: ['application/json', 'multipart/form-data']
          });
        }
      }

      // Validate request size
      const contentLength = parseInt(req.get('Content-Length') || '0');
      const maxSize = 100 * 1024 * 1024; // 100MB

      if (contentLength > maxSize) {
        return res.status(413).json({
          error: 'Payload too large',
          maxSize: '100MB'
        });
      }

      next();
    };
  }

  /**
   * Request sanitization middleware
   */
  sanitizeRequest() {
    return (req, res, next) => {
      // Sanitize query parameters
      if (req.query) {
        req.query = this.sanitizeObject(req.query);
      }

      // Sanitize body parameters
      if (req.body) {
        req.body = this.sanitizeObject(req.body);
      }

      next();
    };
  }

  /**
   * API key authentication middleware
   */
  authenticateApiKey(apiKeyService) {
    return async (req, res, next) => {
      const apiKey = req.get('X-API-Key') || req.query.apiKey;

      if (!apiKey) {
        return res.status(401).json({
          error: 'API key required',
          header: 'X-API-Key'
        });
      }

      try {
        const validation = await apiKeyService.validateKey(apiKey);

        if (!validation.valid) {
          return res.status(401).json({
            error: 'Invalid API key',
            message: validation.reason
          });
        }

        // Attach user info to request
        req.apiKey = validation.key;
        req.user = {
          id: validation.key.userId,
          tier: validation.key.tier
        };

        // Record API key usage
        await apiKeyService.recordUsage(apiKey, {
          endpoint: req.path,
          method: req.method,
          ip: this.getClientIp(req)
        });

        next();
      } catch (error) {
        return res.status(500).json({
          error: 'Authentication failed',
          details: error.message
        });
      }
    };
  }

  /**
   * Request logging middleware
   */
  requestLogger(monitoringService) {
    return (req, res, next) => {
      const startTime = Date.now();

      // Log request
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${this.getClientIp(req)}`);

      // Capture response
      const originalSend = res.send;
      res.send = function(data) {
        const duration = Date.now() - startTime;
        const success = res.statusCode < 400;

        // Record metrics
        if (monitoringService) {
          monitoringService.recordRequest(
            `${req.method} ${req.path}`,
            duration,
            success,
            success ? null : new Error(`HTTP ${res.statusCode}`)
          );
        }

        console.log(
          `[${new Date().toISOString()}] ${req.method} ${req.path} - ` +
          `${res.statusCode} - ${duration}ms`
        );

        return originalSend.call(this, data);
      };

      next();
    };
  }

  /**
   * Error handling middleware
   */
  errorHandler() {
    return (err, req, res, next) => {
      console.error('[SecurityMiddleware] Error:', err);

      // Don't leak error details in production
      const isDev = process.env.NODE_ENV !== 'production';

      res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(isDev && { stack: err.stack }),
        timestamp: new Date().toISOString()
      });
    };
  }

  /**
   * Get client IP address
   */
  getClientIp(req) {
    if (this.trustProxy) {
      return req.get('X-Forwarded-For')?.split(',')[0].trim() ||
             req.get('X-Real-IP') ||
             req.connection.remoteAddress;
    }
    
    return req.connection.remoteAddress;
  }

  /**
   * Sanitize object (remove potentially dangerous characters)
   */
  sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const sanitized = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key
      const cleanKey = this.sanitizeString(key);

      // Sanitize value
      if (typeof value === 'string') {
        sanitized[cleanKey] = this.sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[cleanKey] = this.sanitizeObject(value);
      } else {
        sanitized[cleanKey] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize string (basic XSS prevention)
   */
  sanitizeString(str) {
    return String(str)
      .replace(/[<>'"]/g, '') // Remove potential HTML/JS
      .trim();
  }

  /**
   * Generate request signature
   */
  generateSignature(data, secret) {
    const hash = createHash('sha256')
      .update(JSON.stringify(data) + secret)
      .digest('hex');
    return hash;
  }

  /**
   * Verify request signature
   */
  verifySignature(data, signature, secret) {
    const expected = this.generateSignature(data, secret);
    return this.constantTimeCompare(signature, expected);
  }

  /**
   * Constant-time string comparison
   */
  constantTimeCompare(a, b) {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Get rate limit stats
   */
  getRateLimitStats() {
    const stats = {
      totalIPs: this.rateLimits.size,
      activeRequests: 0
    };

    const now = Date.now();
    for (const [ip, requests] of this.rateLimits.entries()) {
      const active = requests.filter(
        time => now - time < this.rateLimit.windowMs
      );
      stats.activeRequests += active.length;
    }

    return stats;
  }

  /**
   * Clear rate limits (for testing/admin purposes)
   */
  clearRateLimits() {
    this.rateLimits.clear();
    console.log('[SecurityMiddleware] Rate limits cleared');
  }
}

// Create default instance
let securityInstance = null;

/**
 * Get security middleware instance
 */
export function getSecurityMiddleware(options) {
  if (!securityInstance) {
    securityInstance = new SecurityMiddleware(options);
  }
  return securityInstance;
}

export { SecurityMiddleware };
