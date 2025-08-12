import express from 'express';
import cors from 'cors';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Cosmos network configuration from environment
const COSMOS_CONFIG = {
  lcdUrl: process.env.VITE_LCD_HTTP_URL || 'https://lcd-testnet.dytallix.com',
  rpcUrl: process.env.VITE_RPC_HTTP_URL || 'https://rpc-testnet.dytallix.com',
  chainId: process.env.VITE_CHAIN_ID || 'dytallix-testnet-1'
};

// Store for simple rate limiting (in production, use Redis or DB)
const requestLog = new Map();

// Helper function to check rate limits
function checkRateLimit(address, tokenType) {
  const key = `${address}_${tokenType}`;
  const now = Date.now();
  const lastRequest = requestLog.get(key);
  
  const cooldownPeriods = {
    DGT: 24 * 60 * 60 * 1000, // 24 hours
    DRT: 6 * 60 * 60 * 1000   // 6 hours
  };
  
  const cooldown = cooldownPeriods[tokenType] || cooldownPeriods.DRT;
  
  if (lastRequest && (now - lastRequest) < cooldown) {
    const remainingTime = Math.ceil((cooldown - (now - lastRequest)) / (60 * 1000));
    return { allowed: false, remainingMinutes: remainingTime };
  }
  
  return { allowed: true };
}

// Faucet endpoint
app.post('/api/faucet', async (req, res) => {
  try {
    const { address, token, chainId } = req.body;
    
    // Validate request
    if (!address || !token) {
      return res.status(400).json({
        error: 'Missing required fields: address and token'
      });
    }
    
    // Validate address format (basic bech32 check)
    if (!address.startsWith('dytallix1') || address.length < 39) {
      return res.status(400).json({
        error: 'Invalid address format. Must be a valid Dytallix bech32 address starting with dytallix1'
      });
    }
    
    // Validate token type
    if (!['DGT', 'DRT'].includes(token)) {
      return res.status(400).json({
        error: 'Invalid token type. Must be DGT or DRT'
      });
    }
    
    // Check rate limiting
    const rateCheck = checkRateLimit(address, token);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Rate limit exceeded. Please wait ${rateCheck.remainingMinutes} more minutes before requesting ${token} again.`
      });
    }
    
    // TODO: Implement actual Cosmos faucet logic using CosmJS
    // For now, simulate the faucet operation
    console.log(`Faucet request: ${address} requesting ${token} on chain ${chainId || COSMOS_CONFIG.chainId}`);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate success rate (90% success for demo)
    const success = Math.random() > 0.1;
    
    if (success) {
      // Record successful request for rate limiting
      requestLog.set(`${address}_${token}`, Date.now());
      
      const amounts = { DGT: 2, DRT: 5 };
      
      res.json({
        success: true,
        message: `Successfully sent ${amounts[token]} ${token} to ${address}`,
        txHash: `mock_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: amounts[token],
        token: token,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        error: 'Faucet service temporarily unavailable. Please try again later.'
      });
    }
    
  } catch (error) {
    console.error('Faucet error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Optional dashboard API endpoints (stubs as mentioned in requirements)
app.get('/api/dashboard/stats', (req, res) => {
  // Stub endpoint for dashboard statistics
  res.json({
    networkStatus: 'active',
    blockHeight: Math.floor(Math.random() * 1000000) + 500000,
    validators: 25,
    activeNodes: 42,
    avgBlockTime: '6.2s',
    chainId: COSMOS_CONFIG.chainId
  });
});

app.get('/api/dashboard/health', (req, res) => {
  res.json({
    status: 'healthy',
    endpoints: {
      lcd: COSMOS_CONFIG.lcdUrl,
      rpc: COSMOS_CONFIG.rpcUrl,
      chainId: COSMOS_CONFIG.chainId
    },
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Dytallix lean launch server running on port ${PORT}`);
  console.log(`Cosmos configuration:`, COSMOS_CONFIG);
});

export default app;