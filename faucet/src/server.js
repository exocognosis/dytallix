const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const dotenv = require('dotenv');

const faucetController = require('./controllers/faucetController-dual');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { validateRequest } = require('./middleware/validation');
const rateLimitMiddleware = require('./middleware/rateLimit');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: process.env.LOG_FILE || 'logs/faucet.log' })
  ]
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'dytallix-faucet',
    version: '1.0.0'
  });
});

// API info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    service: 'Dytallix Testnet Faucet - Dual Token System',
    version: '2.0.0',
    chainId: process.env.CHAIN_ID || 'dytallix-testnet-1',
    tokenSystem: 'Dual Token (DGT + DRT)',
    tokens: {
      DGT: {
        amount: process.env.DGT_FAUCET_AMOUNT || '10000000udgt',
        formatted: '10 DGT per request',
        purpose: 'Governance and voting',
        supply: 'Fixed (1B DGT)'
      },
      DRT: {
        amount: process.env.DRT_FAUCET_AMOUNT || '100000000udrt', 
        formatted: '100 DRT per request',
        purpose: 'Rewards and transaction fees',
        supply: 'Inflationary (~6% annual)'
      }
    },
    rateLimits: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 3600000,
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5,
      cooldownMs: parseInt(process.env.IP_COOLDOWN_MS) || 1800000
    },
    endpoints: {
      faucet: '/api/faucet (supports tokenType: DGT, DRT, or both)',
      status: '/api/status',
      balance: '/api/balance/:address'
    },
    tokenomics: {
      DGT: 'Governance token for voting and protocol decisions',
      DRT: 'Reward token for staking rewards and transaction fees'
    }
  });
});

// Faucet endpoints with rate limiting
app.post('/api/faucet', 
  rateLimitMiddleware,
  validateRequest,
  (req, res) => faucetController.sendTokens(req, res)
);

app.get('/api/status', (req, res) => faucetController.getStatus(req, res));
app.get('/api/balance/:address', (req, res) => faucetController.getBalance(req, res));

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Dytallix Faucet API server running on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    chainId: process.env.CHAIN_ID || 'dytallix-testnet-1'
  });
});

module.exports = app;