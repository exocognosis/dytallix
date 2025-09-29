import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import Joi from 'joi';
import fs from 'fs/promises';
import crypto from 'crypto';

const app = express();
const PORT = process.env.FAUCET_PORT || 8787;
const HOST = process.env.FAUCET_HOST || '0.0.0.0';

// Token configuration
const TOKENS = {
  DGT: {
    symbol: 'DGT',
    denom: 'udgt',
    decimals: 6,
    faucetAmount: parseInt(process.env.FAUCET_DGT_AMOUNT) || 1000000, // 1 DGT
    maxPerRequest: 10000000, // 10 DGT max
    cooldownSeconds: 3600
  },
  DRT: {
    symbol: 'DRT',
    denom: 'udrt',
    decimals: 6,
    faucetAmount: parseInt(process.env.FAUCET_DRT_AMOUNT) || 500000, // 0.5 DRT
    maxPerRequest: 5000000, // 5 DRT max
    cooldownSeconds: 3600
  }
};

// In-memory storage for demo (use Redis in production)
const requestLog = new Map();
const ipRequests = new Map();
const addressRequests = new Map();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: {
    error: 'Too many requests from this IP',
    retryAfter: '15 minutes'
  }
});

const faucetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    error: 'Too many faucet requests from this IP',
    retryAfter: '1 hour'
  }
});

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 2,
  delayMs: 500
});

app.use(generalLimiter);
app.use('/dispense', faucetLimiter, speedLimiter);

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request validation schema
const dispenseSchema = Joi.object({
  address: Joi.string().required().pattern(/^dytallix[a-z0-9]{39}$/),
  tokens: Joi.array().items(Joi.string().valid('DGT', 'DRT')).min(1).max(2).required(),
  captcha: Joi.string().optional() // For future captcha integration
});

// Health check
app.get('/health', (req, res) => {
  const stats = getRequestStats();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '0.1.0',
    faucet: {
      available_tokens: Object.keys(TOKENS),
      requests_served: stats.totalRequests,
      active_cooldowns: stats.activeCooldowns
    },
    tokens: TOKENS
  });
});

// Main faucet endpoint
app.post('/dispense', async (req, res) => {
  try {
    // Validate request
    const { error, value } = dispenseSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Invalid request',
        details: error.details.map(d => d.message)
      });
    }

    const { address, tokens } = value;
    const clientIP = req.ip || req.connection.remoteAddress;
    
    // Check cooldowns
    const cooldownCheck = checkCooldowns(address, clientIP, tokens);
    if (!cooldownCheck.allowed) {
      return res.status(429).json({
        error: 'Cooldown active',
        message: cooldownCheck.message,
        cooldowns: cooldownCheck.cooldowns
      });
    }

    // Simulate token dispensing (integrate with actual blockchain)
    const dispensedTokens = await dispenseTokens(address, tokens);
    
    // Record request
    recordRequest(address, clientIP, tokens);
    
    res.json({
      success: true,
      address: address,
      tokens: dispensedTokens,
      transaction_hashes: dispensedTokens.map(t => `0x${generateTxHash()}`),
      timestamp: new Date().toISOString(),
      message: 'Tokens successfully dispensed'
    });

  } catch (error) {
    console.error('Faucet error:', error);
    res.status(500).json({
      error: 'Faucet temporarily unavailable',
      message: 'Please try again later'
    });
  }
});

// Status endpoint
app.get('/status', (req, res) => {
  const stats = getRequestStats();
  
  res.json({
    service: 'dytallix-faucet',
    status: 'operational',
    version: '0.1.0',
    chain_id: process.env.CHAIN_ID || 'dytallix-testnet-1',
    available_tokens: TOKENS,
    statistics: stats,
    rate_limits: {
      per_ip: '10 requests per hour',
      per_address: '5 requests per hour',
      cooldown: '1 hour between requests'
    },
    endpoints: {
      dispense: 'POST /dispense',
      health: 'GET /health',
      status: 'GET /status'
    }
  });
});

// Token balance check
app.get('/balance/:address', async (req, res) => {
  const { address } = req.params;
  
  if (!address.match(/^dytallix[a-z0-9]{39}$/)) {
    return res.status(400).json({
      error: 'Invalid address format'
    });
  }

  try {
    // Simulate balance query (integrate with actual node)
    const balances = await queryBalance(address);
    
    res.json({
      address: address,
      balances: balances,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Balance query error:', error);
    res.status(500).json({
      error: 'Balance query failed'
    });
  }
});

// Request history (for debugging)
app.get('/requests/:address', (req, res) => {
  const { address } = req.params;
  const requests = getAddressRequests(address);
  
  res.json({
    address: address,
    request_count: requests.length,
    requests: requests.map(r => ({
      timestamp: r.timestamp,
      tokens: r.tokens,
      ip: r.ip.substring(0, 8) + '...' // Partial IP for privacy
    }))
  });
});

// Helper functions
function checkCooldowns(address, ip, tokens) {
  const now = Date.now();
  const result = {
    allowed: true,
    message: '',
    cooldowns: {}
  };

  // Check address cooldown
  if (addressRequests.has(address)) {
    const lastRequest = addressRequests.get(address);
    const timeSinceLastRequest = now - lastRequest.timestamp;
    const cooldownTime = Math.max(...tokens.map(t => TOKENS[t].cooldownSeconds)) * 1000;
    
    if (timeSinceLastRequest < cooldownTime) {
      const remainingTime = Math.ceil((cooldownTime - timeSinceLastRequest) / 1000);
      result.allowed = false;
      result.message = `Address cooldown active. Wait ${remainingTime} seconds.`;
      result.cooldowns.address = remainingTime;
    }
  }

  // Check IP cooldown (less strict)
  if (ipRequests.has(ip)) {
    const ipHistory = ipRequests.get(ip);
    const recentRequests = ipHistory.filter(r => now - r.timestamp < 3600000); // 1 hour
    
    if (recentRequests.length >= 10) {
      result.allowed = false;
      result.message = 'IP rate limit exceeded. Try again in 1 hour.';
      result.cooldowns.ip = 3600;
    }
  }

  return result;
}

async function dispenseTokens(address, tokens) {
  const dispensed = [];
  
  for (const tokenSymbol of tokens) {
    const token = TOKENS[tokenSymbol];
    if (!token) continue;
    
    // Simulate blockchain transaction
    await new Promise(resolve => setTimeout(resolve, 100));
    
    dispensed.push({
      symbol: tokenSymbol,
      denom: token.denom,
      amount: token.faucetAmount.toString(),
      formatted_amount: formatTokenAmount(token.faucetAmount, token.decimals, tokenSymbol)
    });
  }
  
  return dispensed;
}

async function queryBalance(address) {
  // Simulate balance query - replace with actual node query
  await new Promise(resolve => setTimeout(resolve, 50));
  
  return [
    {
      denom: 'udgt',
      amount: '1000000',
      formatted: '1.000000 DGT'
    },
    {
      denom: 'udrt',
      amount: '500000',
      formatted: '0.500000 DRT'
    }
  ];
}

function recordRequest(address, ip, tokens) {
  const timestamp = Date.now();
  const request = { timestamp, tokens, ip };
  
  // Record for address
  addressRequests.set(address, request);
  
  // Record for IP
  if (!ipRequests.has(ip)) {
    ipRequests.set(ip, []);
  }
  ipRequests.get(ip).push(request);
  
  // Global log
  const requestId = generateTxHash();
  requestLog.set(requestId, {
    ...request,
    address,
    id: requestId
  });
}

function getRequestStats() {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  let totalRequests = requestLog.size;
  let recentRequests = 0;
  let activeCooldowns = 0;
  
  for (const [, request] of requestLog) {
    if (now - request.timestamp < oneHour) {
      recentRequests++;
    }
  }
  
  for (const [, lastRequest] of addressRequests) {
    if (now - lastRequest.timestamp < oneHour) {
      activeCooldowns++;
    }
  }
  
  return {
    totalRequests,
    recentRequests,
    activeCooldowns,
    tokensDispensed: {
      DGT: totalRequests, // Simplified
      DRT: totalRequests
    }
  };
}

function getAddressRequests(address) {
  return Array.from(requestLog.values())
    .filter(r => r.address === address)
    .sort((a, b) => b.timestamp - a.timestamp);
}

function formatTokenAmount(amount, decimals, symbol) {
  const divisor = Math.pow(10, decimals);
  const formatted = (amount / divisor).toFixed(decimals);
  return `${formatted} ${symbol}`;
}

function generateTxHash() {
  return crypto.randomBytes(32).toString('hex');
}

// Error handling
app.use((error, req, res, next) => {
  console.error('Faucet error:', error);
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    available_endpoints: [
      'POST /dispense',
      'GET /health',
      'GET /status',
      'GET /balance/:address',
      'GET /requests/:address'
    ]
  });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`🚰 Dytallix Faucet running on http://${HOST}:${PORT}`);
  console.log(`💧 Dispensing DGT and DRT tokens for testnet`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
});

export default app;