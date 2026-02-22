import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// IMPORTANT: Load .env from project root BEFORE any imports that depend on environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import express from 'express';
import cors from 'cors';

// Configuration
import { CONFIG, validateProductionConfig } from './config/environment.js';

// Middleware
import { requestLogger, logError, logInfo } from './logger.js';
import { securityHeaders, logSecurityInit } from './middleware/security.js';
import { __testResetRateLimiter, shutdownRateLimiter } from './rateLimit.js';

// Services
import { ContractScanner } from './src/scanner/index.js';
import { saveLead, saveContactLead } from './leadsDatabase.js';
import { register } from './metrics.js';

// Routes
import faucetRoutes from './routes/faucet.js';
import blockchainRoutes from './routes/blockchain.js';
import explorerRoutes from './routes/explorer.js';
import aiOracleRoutes from './routes/ai-oracle.js';
import apiStatusRoutes from './routes/api-status.js';
import aegisRoutes from './routes/aegis.js';
import quantumRiskRoutes from './routes/quantum-risk.js';
import consulRoutes from './routes/consul.js';
import garrisonRoutes from './routes/garrison.js';
import horizonRoutes from './routes/horizon.js';

// WebSocket services
import { aegisWebSocket } from './services/aegis/websocket.js';
import { initializeKeys as initializeAegisKeys } from './services/aegis/crypto.js';
import { startExpirationWorker, closeReviewQueueDb } from './services/aegis/review-queue.js';
import { closeThrottleDb } from './services/aegis/throttle.js';
import { closeAegisDatabase } from './services/aegis/database.js';
import { closeAegisPostureDb } from './services/aegis/posture.js';
import { startConsulAgent, stopConsulAgent } from './services/consul/agent.js';
import { startGarrisonAgent, stopGarrisonAgent } from './services/garrison/agent.js';
import { startHorizonAgent, shutdownHorizonAgent } from './services/horizon/agent.js';
import { createRuntimeSupervisor } from './runtime.js';

/*
 * Dytallix Unified Server
 * Modular architecture with separated concerns
 */

// Reset in-memory rate limiter between test runs
if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
  try {
    __testResetRateLimiter();
  } catch {
    // best-effort for tests
  }
}

// Production environment validation
try {
  validateProductionConfig();
  if (CONFIG.server.nodeEnv === 'production') {
    logInfo('Production environment validation passed');
  }
  logInfo('Environment Variables Check', {
    VITE_FRONTEND_URL: process.env.VITE_FRONTEND_URL,
    FRONTEND_PORT: process.env.FRONTEND_PORT,
    PWD: process.cwd(),
  });
} catch (err) {
  logError(err?.message || String(err));
  process.exit(1);
}

// Initialize Express app
const app = express();

// Initialize contract scanner
const contractScanner = new ContractScanner({
  timeout: 30000,
  maxConcurrency: 3,
  useMocks: true,
});

// Mock anomaly detection engine for fast-launch
const anomalyEngine = {
  start: () => {
    logInfo('Anomaly detection engine stubbed (fast-launch mode)');
    return Promise.resolve();
  },
  getRecentAnomalies: () => [],
  forceDetection: () => {
    logInfo('Anomaly detection triggered (stubbed)');
  },
  getStats: () => ({
    detections: 0,
    alerts: 0,
    collectors: {
      mempool: { enabled: false },
      validator: { enabled: false },
    },
  }),
  testAlerting: () =>
    Promise.resolve({
      success: true,
      message: 'Anomaly detection stubbed in fast-launch mode',
    }),
  sendTestAlert: () =>
    Promise.resolve({
      success: true,
      message: 'Alert system stubbed in fast-launch mode',
    }),
};

// Start anomaly detection engine
anomalyEngine.start().catch((err) => {
  logError('Failed to start anomaly detection engine', err);
});

// Load tokenomics metadata (non-fatal if missing)
let tokenomicsMeta = null;
try {
  tokenomicsMeta = JSON.parse(
    fs.readFileSync(new URL('./tokenomics.json', import.meta.url), 'utf8'),
  );
} catch {
  /* optional */
}

// Apply middleware
app.use(securityHeaders);
app.use(cors({ origin: CONFIG.server.allowedOrigin }));
app.use(express.json({ limit: '110kb' }));
app.use(requestLogger);

// Log security initialization
logSecurityInit();

// Mount route modules
app.use('/api/faucet', faucetRoutes);
// Canonical blockchain proxy namespace (used by the Build wallet UI).
app.use('/api/blockchain', blockchainRoutes);
app.use('/', blockchainRoutes); // Wallet compatibility routes at root
app.use('/api', explorerRoutes); // Explorer routes
app.use('/api/ai', aiOracleRoutes); // AI Oracle routes
app.use('/api', apiStatusRoutes); // Status and node cluster routes
app.use('/api/aegis', aegisRoutes); // Aegis AI routes
app.use('/api/quantum-risk', quantumRiskRoutes); // Quantum Risk routes
app.use('/api/consul', consulRoutes); // Consul governance diplomat routes
app.use('/api', garrisonRoutes); // Garrison contract compliance + agentic routes
app.use('/api/horizon', horizonRoutes); // Horizon network/DeFi monitor routes

// Prometheus metrics endpoint
app.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// Lead capture endpoints
app.post('/api/leads/submit', async (req, res) => {
  try {
    const { email, source } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    await saveLead(email, source || 'unknown');
    res.json({ success: true });
  } catch (err) {
    logError('Lead submission failed', err);
    res.status(500).json({ error: 'Failed to save lead' });
  }
});

app.post('/api/contact/submit', async (req, res) => {
  try {
    const { name, email, company, context } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    await saveContactLead(name, email, company, context);
    res.json({ success: true });
  } catch (err) {
    logError('Contact submission failed', err);
    res.status(500).json({ error: 'Failed to save contact' });
  }
});

// Contract scanner endpoints
app.post('/api/scan/contract', async (req, res) => {
  try {
    const { address, network } = req.body;
    if (!address) {
      return res.status(400).json({ error: 'Contract address required' });
    }
    const result = await contractScanner.scanContract(address, network);
    res.json(result);
  } catch (err) {
    logError('Contract scan failed', err);
    res.status(500).json({ error: 'Scan failed', message: err.message });
  }
});

// Anomaly detection endpoints
app.get('/api/anomalies/recent', (_req, res) => {
  res.json({ anomalies: anomalyEngine.getRecentAnomalies() });
});

app.post('/api/anomalies/detect', (_req, res) => {
  anomalyEngine.forceDetection();
  res.json({ success: true, message: 'Detection triggered' });
});

app.get('/api/anomalies/stats', (_req, res) => {
  res.json(anomalyEngine.getStats());
});

// Error handling middleware
app.use((err, req, res, _next) => {
  const statusCode = err.status || 500;
  const message = err.message || 'Internal Server Error';

  logError('Request error', {
    statusCode,
    message,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({
    error: message,
    ...(CONFIG.server.nodeEnv === 'development' && { stack: err.stack }),
  });
});

let server = null;
let serverRuntime = null;
let signalHandlersInstalled = false;

export function startServer() {
  if (server) return server;
  if (serverRuntime) {
    serverRuntime = null;
  }

  serverRuntime = createRuntimeSupervisor('dytallix-server');

  server = app.listen(CONFIG.server.port, CONFIG.server.host, () => {
    logInfo(`Server running on port ${CONFIG.server.port}`, {
      nodeEnv: CONFIG.server.nodeEnv,
      demoMode: CONFIG.demoMode,
      host: CONFIG.server.host,
    });
  });

  // Initialize Aegis WebSocket server
  aegisWebSocket.initialize(server);
  logInfo('Aegis WebSocket server initialized');

  // Start review queue expiration worker only when the server runtime is active
  startExpirationWorker();

  // Runtime cleanups (reverse-order execution on stop).
  serverRuntime.addCleanup('aegis_posture_db', () => closeAegisPostureDb());
  serverRuntime.addCleanup('aegis_throttle_db', () => closeThrottleDb());
  serverRuntime.addCleanup('aegis_review_queue_db', () => closeReviewQueueDb());
  serverRuntime.addCleanup('aegis_database', () => closeAegisDatabase());
  serverRuntime.addCleanup('rate_limiter', () => shutdownRateLimiter());
  serverRuntime.addCleanup('aegis_websocket', () => aegisWebSocket.close?.());
  serverRuntime.addCleanup(
    'http_server',
    () =>
      new Promise((resolve) => {
        if (!server) return resolve();
        const srv = server;
        server = null;
        try {
          srv.close(() => resolve());
        } catch {
          resolve();
        }
      }),
  );

  initializeAegisKeys().catch((err) => {
    logError('Failed to initialize Aegis cryptography', {
      error: err?.message || String(err),
    });
  });

  startConsulAgent();
  serverRuntime.addCleanup('consul_agent', () => stopConsulAgent());

  startGarrisonAgent();
  serverRuntime.addCleanup('garrison_agent', () => stopGarrisonAgent());

  startHorizonAgent();
  serverRuntime.addCleanup('horizon_agent', () => shutdownHorizonAgent());

  const shutdown = (signal) => {
    logInfo(`${signal} received, shutting down gracefully`);
    stopServer({ reason: signal })
      .then(() => process.exit(0))
      .catch((error) => {
        logError('Server shutdown failed', {
          signal,
          error: error?.message || String(error),
        });
        process.exit(1);
      });
  };

  if (!signalHandlersInstalled) {
    signalHandlersInstalled = true;
    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));
  }

  return server;
}

export async function stopServer({ reason = 'manual_stop' } = {}) {
  if (!serverRuntime) {
    if (!server) return;
    const srv = server;
    server = null;
    await new Promise((resolve) => srv.close(() => resolve()));
    return;
  }

  const runtime = serverRuntime;
  serverRuntime = null;
  const result = await runtime.stop({ reason });
  if (!result.ok) {
    logError('Server runtime stopped with cleanup errors', {
      errors: result.errors,
    });
  } else {
    logInfo('Server runtime stopped cleanly', { reason });
  }
}

// Only listen when this file is the entrypoint.
const isMain = (() => {
  try {
    if (
      !!process.argv[1] &&
      import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
    ) {
      return true;
    }

    // PM2 executes apps through its own wrapper, so process.argv[1] points to PM2 internals.
    // In that case, compare pm_exec_path to this file path.
    if (process.env.pm_exec_path) {
      const thisFile = fileURLToPath(import.meta.url);
      return path.resolve(process.env.pm_exec_path) === path.resolve(thisFile);
    }

    return false;
  } catch {
    return false;
  }
})();

if (isMain) {
  startServer();
}

export default app;
