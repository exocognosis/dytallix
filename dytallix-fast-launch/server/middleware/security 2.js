/**
 * Security Headers Middleware
 * Applies security headers including CSP, HSTS, and other protections
 */

import { CONFIG, collectConnectSrc } from '../config/environment.js';
import { logInfo } from '../logger.js';

export function securityHeaders(req, res, next) {
    if (!CONFIG.security.enableHeaders) {
        return next();
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');

    // HSTS header for HTTPS (31536000 seconds = 1 year)
    if (req.protocol === 'https' || req.get('x-forwarded-proto') === 'https') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    if (CONFIG.security.enableCSP) {
        const connectSrc = collectConnectSrc();
        // No inline/eval scripts; no remote scripts/styles; images/fonts inherit default-src self.
        // Add additional origins ONLY via env vars – do not edit the string directly.
        const csp = [
            "default-src 'self'", // strict baseline
            "script-src 'self'", // bundler outputs only
            `connect-src ${connectSrc} ws: wss:`, // ws:/wss: needed for local dev + Tendermint events
            "img-src 'self' data:", // allow data for small inline icons / QR codes
            "style-src 'self' 'unsafe-inline'", // React inlined styles (can be tightened with hashing later)
            "object-src 'none'",
            "base-uri 'none'",
            "frame-ancestors 'none'",
            "form-action 'self'",
        ].join('; ');
        res.setHeader('Content-Security-Policy', csp);
    }

    next();
}

/**
 * Log security headers initialization
 */
export function logSecurityInit() {
    if (CONFIG.security.enableHeaders) {
        logInfo('Security headers enabled', { ENABLE_CSP: CONFIG.security.enableCSP });
    }
}
