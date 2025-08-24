const client = require('prom-client');
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics (process metrics, GC metrics, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['path', 'method', 'status'],
  registers: [register]
});

const faucetRequestsTotal = new client.Counter({
  name: 'faucet_requests_total',
  help: 'Total number of faucet token requests',
  labelNames: ['result'], // success, error, rate_limited
  registers: [register]
});

const rateLimitHitsTotal = new client.Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  registers: [register]
});

const http5xxResponsesTotal = new client.Counter({
  name: 'http_5xx_responses_total',
  help: 'Total number of 5xx HTTP responses',
  labelNames: ['path', 'method'],
  registers: [register]
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['path', 'method'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10], // response time buckets in seconds
  registers: [register]
});

const inFlightRequests = new client.Gauge({
  name: 'in_flight_requests',
  help: 'Number of in-flight HTTP requests',
  registers: [register]
});

// Middleware to track metrics
const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Increment in-flight requests
  inFlightRequests.inc();
  
  // Clean path for metrics (remove dynamic segments, avoid PII)
  const cleanPath = getCleanPath(req.path);
  
  // Override res.end to capture metrics
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds
    const statusCode = res.statusCode;
    
    // Record metrics
    httpRequestsTotal.labels(cleanPath, req.method, statusCode).inc();
    httpRequestDuration.labels(cleanPath, req.method).observe(duration);
    
    // Track 5xx errors
    if (statusCode >= 500) {
      http5xxResponsesTotal.labels(cleanPath, req.method).inc();
    }
    
    // Decrement in-flight requests
    inFlightRequests.dec();
    
    // Log request (redact sensitive data)
    logger.info('HTTP request completed', {
      method: req.method,
      path: cleanPath, // Use clean path, not original
      status: statusCode,
      duration: duration,
      // Don't log IP address or user agent for privacy
    });
    
    originalEnd.apply(this, args);
  };
  
  next();
};

// Function to clean paths and avoid PII in metrics
function getCleanPath(originalPath) {
  // Remove dynamic segments and potential PII
  return originalPath
    .replace(/\/[a-zA-Z0-9]{20,}/, '/[address]') // Replace long alphanumeric strings (addresses)
    .replace(/\/\d+/, '/[id]') // Replace numeric IDs
    .replace(/\/dyt[a-zA-Z0-9]+/, '/[address]') // Replace dytallix addresses
    .replace(/\/0x[a-fA-F0-9]+/, '/[hash]'); // Replace hex hashes
}

// Middleware to track rate limit hits
const trackRateLimit = (req, res, next) => {
  const originalJson = res.json;
  res.json = function(data) {
    if (res.statusCode === 429) {
      rateLimitHitsTotal.inc();
      logger.warn('Rate limit hit', {
        path: getCleanPath(req.path),
        method: req.method,
        // Don't log IP address for privacy
      });
    }
    return originalJson.call(this, data);
  };
  next();
};

// Middleware to track faucet-specific metrics
const trackFaucetMetrics = (req, res, next) => {
  if (req.path === '/api/faucet' && req.method === 'POST') {
    const originalJson = res.json;
    res.json = function(data) {
      let result = 'error';
      
      if (res.statusCode === 200 && data.success) {
        result = 'success';
      } else if (res.statusCode === 429) {
        result = 'rate_limited';
      }
      
      faucetRequestsTotal.labels(result).inc();
      
      logger.info('Faucet request tracked', {
        result,
        status: res.statusCode,
        // Don't log sensitive user data
      });
      
      return originalJson.call(this, data);
    };
  }
  next();
};

// Expose metrics endpoint
const metricsEndpoint = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error('Error generating metrics', { error: error.message });
    res.status(500).end('Error generating metrics');
  }
};

module.exports = {
  metricsMiddleware,
  trackRateLimit,
  trackFaucetMetrics,
  metricsEndpoint,
  // Export individual metrics for testing
  httpRequestsTotal,
  faucetRequestsTotal,
  rateLimitHitsTotal,
  http5xxResponsesTotal,
  httpRequestDuration,
  inFlightRequests,
  // Export registry for testing
  register
};