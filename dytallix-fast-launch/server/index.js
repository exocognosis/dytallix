import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// IMPORTANT: Load .env from project root BEFORE any imports that depend on environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import fs from 'fs';

// Configuration
import { CONFIG, validateProductionConfig } from './config/environment.js';

// Middleware
import { requestLogger, logError, logInfo } from './logger.js';
import { securityHeaders, logSecurityInit } from './middleware/security.js';
import { __testResetRateLimiter } from './rateLimit.js';

// Services
import { ContractScanner } from './src/scanner/index.js';
import { sendQuantumRiskEmail } from './emailService.js';
import { saveLead, saveContactLead } from './leadsDatabase.js';
import { generatePDFReport } from './pdf/pdfkit-report.js';

// Routes
import faucetRoutes from './routes/faucet.js';
import blockchainRoutes from './routes/blockchain.js';
import explorerRoutes from './routes/explorer.js';
import aiOracleRoutes from './routes/ai-oracle.js';
import apiStatusRoutes from './routes/api-status.js';
import aegisRoutes from './routes/aegis.js';
import { aegisWebSocket } from './services/aegis/websocket.js';

// Metrics
import { register } from './metrics.js';

/*
 * Dytallix Unified Server
 * Modular architecture with separated concerns
 */

// Reset in-memory rate limiter between test runs
if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
  try {
    __testResetRateLimiter();
  } catch { }
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
    PWD: process.cwd()
  });
} catch (err) {
  logError(err.message);
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
  testAlerting: () => Promise.resolve({
    success: true,
    message: 'Anomaly detection stubbed in fast-launch mode',
  }),
  sendTestAlert: () => Promise.resolve({
    success: true,
    message: 'Alert system stubbed in fast-launch mode',
  }),
};

// Start anomaly detection engine
anomalyEngine.start().catch(err => {
  logError('Failed to start anomaly detection engine', err);
});

// Load tokenomics metadata (non-fatal if missing)
let tokenomicsMeta = null;
try {
  tokenomicsMeta = JSON.parse(fs.readFileSync(new URL('./tokenomics.json', import.meta.url), 'utf8'));
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
app.use('/', blockchainRoutes); // Wallet compatibility routes at root
app.use('/api', explorerRoutes); // Explorer routes
app.use('/api/ai', aiOracleRoutes); // AI Oracle routes
app.use('/api', apiStatusRoutes); // Status and node cluster routes
app.use('/api/aegis', aegisRoutes); // Aegis AI routes

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// Quantum Risk Email endpoint
app.post('/api/quantum-risk/email', async (req, res) => {
  try {
    const { email, formData, riskScores } = req.body;

    if (!email || !formData || !riskScores) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'formData', 'riskScores'],
      });
    }

    await sendQuantumRiskEmail(email, formData, riskScores);

    res.json({
      success: true,
      message: 'Quantum risk analysis report sent successfully',
    });
  } catch (err) {
    logError('Quantum risk email failed', err);
    res.status(500).json({
      error: 'Failed to send report',
      message: err.message,
    });
  }
});

// Quantum Risk PDF Download endpoint (new - no email, direct download)
app.post('/api/quantum-risk/report', async (req, res) => {
  try {
    const { email, formData, riskScores } = req.body;

    if (!email || !formData || !riskScores) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'formData', 'riskScores'],
      });
    }

    // Save lead to database
    const leadResult = saveLead({
      email,
      formData,
      riskScores,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logInfo('Quantum risk lead captured', { email, leadId: leadResult.id });

    // Generate PDF
    const pdfBuffer = await generatePDFReport(formData, riskScores);

    logInfo('PDF report generated', { email, size: pdfBuffer.length });

    // Send PDF as download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="quantum-risk-analysis.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (err) {
    logError('Quantum risk report generation failed', err);
    res.status(500).json({
      error: 'Failed to generate report',
      message: err.message,
    });
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
app.get('/api/anomalies/recent', (req, res) => {
  res.json({ anomalies: anomalyEngine.getRecentAnomalies() });
});

app.post('/api/anomalies/detect', (req, res) => {
  anomalyEngine.forceDetection();
  res.json({ success: true, message: 'Detection triggered' });
});

app.get('/api/anomalies/stats', (req, res) => {
  res.json(anomalyEngine.getStats());
});

// Error handling middleware
app.use((err, req, res, next) => {
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

// Start server
const server = app.listen(CONFIG.server.port, () => {
  logInfo(`Server running on port ${CONFIG.server.port}`, {
    nodeEnv: CONFIG.server.nodeEnv,
    demoMode: CONFIG.demoMode,
  });
});

// Initialize Aegis WebSocket server
aegisWebSocket.initialize(server);
logInfo('Aegis WebSocket server initialized');


// Graceful shutdown
process.on('SIGTERM', () => {
  logInfo('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logInfo('Server closed');
    process.exit(0);
  });
});

export default app;
