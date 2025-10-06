import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { loadConfig, getConfig } from './config.js';
import { initDb, runMigrations } from './db.js';
import { logger } from './util/logger.js';
import { healthRoutes } from './routes/health.js';
import { statusRoutes } from './routes/status.js';
import { balanceRoutes } from './routes/balance.js';
import { faucetRoutes } from './routes/faucet.js';
import { rpcRoutes } from './routes/rpc.js';
import { governanceRoutes } from './routes/governance.js';
import { contractsRoutes } from './routes/contracts.js';
import { adminRoutes } from './routes/admin.js';
import { register, Counter, Histogram } from 'prom-client';

// Load configuration
loadConfig();
const config = getConfig();

// Initialize database
initDb();
runMigrations();

// Create Fastify instance
const fastify = Fastify({
  logger: false, // Use pino logger instead
  bodyLimit: config.ENABLE_BODY_LIMIT ? config.REQUEST_SIZE_LIMIT : undefined,
});

// Prometheus metrics (declared but used for registration)
/* eslint-disable @typescript-eslint/no-unused-vars */
const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

const faucetBalance = new Counter({
  name: 'dytallix_faucet_balance',
  help: 'Current faucet balance',
  registers: [register],
});

const blockLag = new Counter({
  name: 'dytallix_block_lag',
  help: 'Block sync lag',
  registers: [register],
});
/* eslint-enable @typescript-eslint/no-unused-vars */

// Request timing middleware
fastify.addHook('onRequest', async (request, _reply) => {
  request.startTime = Date.now();
});

fastify.addHook('onResponse', async (request, reply) => {
  const duration = (Date.now() - (request.startTime || Date.now())) / 1000;
  const path = request.routeOptions?.url || request.url;
  
  httpRequestsTotal.labels(request.method, path, reply.statusCode.toString()).inc();
  httpRequestDuration.labels(request.method, path, reply.statusCode.toString()).observe(duration);
  
  logger.info({
    method: request.method,
    url: request.url,
    status: reply.statusCode,
    duration: duration.toFixed(3),
    ip: request.ip,
  }, 'Request completed');
});

// CORS configuration
await fastify.register(cors, {
  origin: config.FRONTEND_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});

// Rate limiting
await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  errorResponseBuilder: () => ({
    code: 'RATE_LIMIT',
    message: 'Too many requests, please try again later',
  }),
});

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  logger.error({ error, url: request.url }, 'Request error');
  
  if (error.statusCode === 413) {
    return reply.code(413).send({
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Request payload too large',
    });
  }
  
  if (error.statusCode === 429) {
    return reply.code(429).send({
      code: 'RATE_LIMIT',
      message: 'Too many requests',
    });
  }
  
  return reply.code(error.statusCode || 500).send({
    code: 'INTERNAL_ERROR',
    message: error.message || 'Internal server error',
  });
});

// Register routes
await healthRoutes(fastify);
await statusRoutes(fastify);
await balanceRoutes(fastify);
await faucetRoutes(fastify);
await rpcRoutes(fastify);
await governanceRoutes(fastify);
await contractsRoutes(fastify);
await adminRoutes(fastify);

// 404 handler
fastify.setNotFoundHandler((_request, reply) => {
  return reply.code(404).send({
    code: 'NOT_FOUND',
    message: 'Route not found',
  });
});

// Start server
const start = async () => {
  try {
    await fastify.listen({
      port: config.PORT,
      host: '0.0.0.0',
    });
    
    logger.info({
      port: config.PORT,
      frontend: config.FRONTEND_ORIGIN,
      rpc: config.RPC_URL,
    }, 'Server started');
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  await fastify.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  await fastify.close();
  process.exit(0);
});

start();

// Extend FastifyRequest type
declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
  }
}
