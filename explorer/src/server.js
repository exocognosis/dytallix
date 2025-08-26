const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const path = require('path');
const dotenv = require('dotenv');

const explorerController = require('./controllers/explorerController');
const blockchainService = require('./services/blockchainService');

// Metrics setup
let metricsEnabled = false;
let metricsApp = null;
let prometheus = null;
let explorerMetrics = {};

if (process.env.ENABLE_METRICS === 'true') {
  metricsEnabled = true;
  prometheus = require('prom-client');
  
  // Create metrics registry
  const register = new prometheus.Registry();
  prometheus.collectDefaultMetrics({ register });
  
  // Explorer-specific metrics with dyt_ prefix
  explorerMetrics = {
    apiRequestDuration: new prometheus.Histogram({
      name: 'dyt_api_request_duration_seconds',
      help: 'API request duration',
      labelNames: ['route', 'method', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
      registers: [register]
    }),
    
    oracleRequestLatency: new prometheus.Histogram({
      name: 'dyt_oracle_request_latency_seconds',
      help: 'Oracle request latency',
      labelNames: ['source'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [register]
    }),
    
    explorerRequestsTotal: new prometheus.Counter({
      name: 'dyt_explorer_requests_total',
      help: 'Total explorer requests',
      labelNames: ['endpoint', 'status'],
      registers: [register]
    })
  };
  
  // Create separate metrics server
  metricsApp = express();
  metricsApp.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (err) {
      res.status(500).end(err);
    }
  });
}

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/explorer.log' })
  ]
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.RPC_ENDPOINT || "http://127.0.0.1:26657"]
    }
  }
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Request logging and metrics middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Metrics collection
  if (metricsEnabled) {
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      explorerMetrics.apiRequestDuration
        .labels(req.route?.path || req.path, req.method, res.statusCode.toString())
        .observe(duration);
        
      explorerMetrics.explorerRequestsTotal
        .labels(req.path, res.statusCode.toString())
        .inc();
    });
  }
  
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'dytallix-explorer',
    version: '1.0.0'
  });
});

// API Routes
app.get('/api/info', explorerController.getInfo);
app.get('/api/status', explorerController.getNetworkStatus);
app.get('/api/blocks', explorerController.getBlocks);
app.get('/api/blocks/:height', explorerController.getBlock);
app.get('/api/transactions', explorerController.getTransactions);
app.get('/api/transactions/:hash', explorerController.getTransaction);
app.get('/api/addresses/:address', explorerController.getAddress);
app.get('/api/addresses/:address/transactions', explorerController.getAddressTransactions);
app.get('/api/validators', explorerController.getValidators);
app.get('/api/search/:query', explorerController.search);

// Governance Routes
app.get('/api/governance/proposals', explorerController.getGovernanceProposals);
app.post('/api/governance', explorerController.createGovernanceProposal);
app.get('/api/governance/proposals/:id', explorerController.getGovernanceProposal);
app.post('/api/governance/proposals/:id/vote', explorerController.voteOnProposal);

// Contracts Routes
app.post('/api/contracts/deploy', explorerController.deployContract);
app.post('/api/contracts/:address/execute', explorerController.executeContract);
app.get('/api/contracts/:address/state', explorerController.getContractState);
app.get('/api/contracts/:address', explorerController.getContract);
app.get('/api/contracts', explorerController.getContracts);

// Accounts Routes  
app.get('/api/accounts/:addr', explorerController.getAccountDetails);

// Staking Routes
app.get('/api/staking/validators', explorerController.getStakingValidators);
app.get('/api/staking/delegations/:address', explorerController.getStakingDelegations);
app.get('/api/staking/rewards/:address', explorerController.getStakingRewards);
app.post('/api/staking/delegate', explorerController.delegateStake);
app.post('/api/staking/claim-rewards', explorerController.claimStakingRewards);

// Serve explorer UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    ip: req.ip,
    path: req.path
  });

  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

// Initialize blockchain service and start server
blockchainService.initialize().then(() => {
  app.listen(PORT, () => {
    logger.info(`Dytallix Explorer running on port ${PORT}`, {
      port: PORT,
      environment: process.env.NODE_ENV || 'development'
    });
  });
  
  // Start metrics server if enabled
  if (metricsEnabled && metricsApp) {
    const metricsPort = process.env.METRICS_PORT || 9102;
    metricsApp.listen(metricsPort, () => {
      logger.info(`Explorer metrics server running on port ${metricsPort}`);
    });
  }
}).catch(err => {
  logger.error('Failed to initialize blockchain service', { error: err.message });
  process.exit(1);
});

// Export metrics for use in controllers and services
if (metricsEnabled) {
  module.exports.metrics = explorerMetrics;
}

module.exports = app;