const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3004;
const BLOCKCHAIN_NODE = process.env.BLOCKCHAIN_NODE || 'http://localhost:3003';

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting storage (in-memory for now, use Redis in production)
const rateLimits = new Map();
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown
const MAX_REQUESTS_PER_HOUR = 3;

// Faucet configuration
const FAUCET_CONFIG = {
  DGT: {
    amount: 1000,
    denom: 'udgt',
    microAmount: 1_000_000_000 // 1000 DGT
  },
  DRT: {
    amount: 10000,
    denom: 'udrt',
    microAmount: 10_000_000_000 // 10000 DRT
  }
};

// Helper: Check rate limit
function checkRateLimit(address) {
  const now = Date.now();
  const userRequests = rateLimits.get(address) || [];

  // Remove old requests outside cooldown window
  const recentRequests = userRequests.filter(time => now - time < COOLDOWN_MS);

  if (recentRequests.length >= MAX_REQUESTS_PER_HOUR) {
    const oldestRequest = Math.min(...recentRequests);
    const timeUntilNext = COOLDOWN_MS - (now - oldestRequest);
    return {
      allowed: false,
      timeUntilNext: Math.ceil(timeUntilNext / 1000 / 60), // minutes
      requestCount: recentRequests.length
    };
  }

  return { allowed: true };
}

// Helper: Record request
function recordRequest(address) {
  const now = Date.now();
  const userRequests = rateLimits.get(address) || [];
  const recentRequests = userRequests.filter(time => now - time < COOLDOWN_MS);
  recentRequests.push(now);
  rateLimits.set(address, recentRequests);
}

// Helper: Fund address via blockchain
async function fundAddress(address, dgtAmount, drtAmount) {
  try {
    // Call blockchain faucet with both DGT and DRT in a single request
    const response = await fetch(`${BLOCKCHAIN_NODE}/dev/faucet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address,
        udgt: dgtAmount * 1_000_000, // Convert to micro-units
        udrt: drtAmount * 1_000_000  // Convert to micro-units
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Blockchain faucet failed: ${errorText}`);
    }

    const result = await response.json();
    console.log('[Faucet] ✅ Blockchain credited:', result);

    return {
      success: true,
      funded: { dgt: dgtAmount, drt: drtAmount }
    };
    const allSucceeded = responses.every(r => r.ok);

    return {
      success: allSucceeded,
      results,
      funded: {
        dgt: dgtAmount,
        drt: drtAmount
      }
    };
  } catch (error) {
    console.error('[Faucet] Error funding address:', error);
    throw error;
  }
}

// POST /api/faucet/request - Request tokens from faucet
app.post('/api/faucet/request', async (req, res) => {
  try {
    const { address, dgt_amount, drt_amount } = req.body;

    // Validation
    if (!address || !address.startsWith('dyt')) {
      return res.status(400).json({
        error: 'INVALID_ADDRESS',
        message: 'Address must start with "dyt"'
      });
    }

    const dgtAmount = dgt_amount || 0;
    const drtAmount = drt_amount || 0;

    if (dgtAmount <= 0 && drtAmount <= 0) {
      return res.status(400).json({
        error: 'INVALID_AMOUNT',
        message: 'Must request at least one token type'
      });
    }

    // Check amounts don't exceed limits
    if (dgtAmount > FAUCET_CONFIG.DGT.amount) {
      return res.status(400).json({
        error: 'AMOUNT_TOO_HIGH',
        message: `Maximum DGT per request: ${FAUCET_CONFIG.DGT.amount}`
      });
    }

    if (drtAmount > FAUCET_CONFIG.DRT.amount) {
      return res.status(400).json({
        error: 'AMOUNT_TOO_HIGH',
        message: `Maximum DRT per request: ${FAUCET_CONFIG.DRT.amount}`
      });
    }

    // Check rate limit
    const rateCheck = checkRateLimit(address);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Please wait ${rateCheck.timeUntilNext} minutes`,
        timeUntilNext: rateCheck.timeUntilNext,
        requestCount: rateCheck.requestCount,
        maxRequests: MAX_REQUESTS_PER_HOUR
      });
    }

    // Fund the address
    console.log(`[Faucet] Funding ${address} with ${dgtAmount} DGT and ${drtAmount} DRT`);
    const result = await fundAddress(address, dgtAmount, drtAmount);

    if (result.success) {
      // Record successful request
      recordRequest(address);

      // Fetch updated balance
      const balanceResponse = await fetch(`${BLOCKCHAIN_NODE}/balance/${address}`);
      const balances = balanceResponse.ok ? await balanceResponse.json() : {};

      res.json({
        success: true,
        message: 'Tokens sent successfully',
        address,
        funded: result.funded,
        balances: {
          dgt: parseInt(balances.udgt || 0) / 1_000_000,
          drt: parseInt(balances.udrt || 0) / 1_000_000
        },
        cooldown: {
          duration: COOLDOWN_MS / 1000 / 60, // minutes
          maxRequests: MAX_REQUESTS_PER_HOUR
        }
      });
    } else {
      res.status(500).json({
        error: 'FUNDING_FAILED',
        message: 'Failed to fund address',
        details: result.results
      });
    }
  } catch (error) {
    console.error('[Faucet] Request error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message
    });
  }
});

// GET /api/faucet/status - Get faucet status and configuration
app.get('/api/faucet/status', (req, res) => {
  res.json({
    status: 'operational',
    limits: {
      dgt: FAUCET_CONFIG.DGT.amount,
      drt: FAUCET_CONFIG.DRT.amount,
      cooldown: COOLDOWN_MS / 1000 / 60, // minutes
      maxRequestsPerHour: MAX_REQUESTS_PER_HOUR
    },
    blockchain: BLOCKCHAIN_NODE,
    activeUsers: rateLimits.size
  });
});

// GET /api/faucet/check/:address - Check rate limit status for address
app.get('/api/faucet/check/:address', (req, res) => {
  const { address } = req.params;
  const rateCheck = checkRateLimit(address);

  res.json({
    address,
    canRequest: rateCheck.allowed,
    ...(!rateCheck.allowed && {
      timeUntilNext: rateCheck.timeUntilNext,
      requestCount: rateCheck.requestCount
    })
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'faucet-api' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚰 Dytallix Faucet API running on port ${PORT}`);
  console.log(`📡 Connected to blockchain: ${BLOCKCHAIN_NODE}`);
  console.log(`⏱️  Cooldown: ${COOLDOWN_MS / 1000 / 60} minutes`);
  console.log(`💰 DGT per request: ${FAUCET_CONFIG.DGT.amount}`);
  console.log(`💎 DRT per request: ${FAUCET_CONFIG.DRT.amount}`);
});
