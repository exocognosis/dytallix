import helmet from 'helmet';
export function securityHeaders(app) {
  if (process.env.ENABLE_SEC_HEADERS) {
    app.use(helmet({
      contentSecurityPolicy: process.env.ENABLE_CSP ? undefined : false,
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginOpenerPolicy: { policy: 'same-origin' }
    }));
  }
}