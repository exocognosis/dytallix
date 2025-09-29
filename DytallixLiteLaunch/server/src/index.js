import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { register } from 'prom-client';
import fs from 'fs/promises';
import path from 'path';

const app = express();
const PORT = process.env.SERVER_PORT || 8080;
const HOST = process.env.SERVER_HOST || '0.0.0.0';

// Load tokenomics configuration
let tokenomicsConfig = {};
try {
  const tokenomicsData = await fs.readFile('./tokenomics.json', 'utf8');
  tokenomicsConfig = JSON.parse(tokenomicsData);
} catch (error) {
  console.error('Failed to load tokenomics.json:', error.message);
}

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.API_RATE_LIMIT || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Metrics storage (in-memory for demo)
const metrics = {
  oracleRequests: 0,
  oracleErrors: 0,
  totalResponseTime: 0,
  averageResponseTime: 0,
  aiModelCalls: {
    'gpt-4': 0,
    'claude-3': 0,
    'llama-2': 0
  },
  tokenMetrics: {
    DGT: {
      totalSupply: tokenomicsConfig.tokens?.DGT?.total_supply || '1000000000000000',
      circulatingSupply: tokenomicsConfig.tokens?.DGT?.circulating_supply || '600000000000000'
    },
    DRT: {
      totalSupply: '0', // Starts at 0, grows through inflation
      inflationRate: tokenomicsConfig.tokens?.DRT?.inflation_rate || 0.05
    }
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '0.1.0',
    services: {
      oracle: 'operational',
      metrics: 'operational',
      tokenomics: 'loaded'
    }
  });
});

// AI Oracle endpoint
app.post('/oracle', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { prompt, model = 'gpt-4', max_tokens = 150 } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        error: 'Missing required field: prompt'
      });
    }

    // Simulate AI model processing
    const response = await simulateAIResponse(prompt, model, max_tokens);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Update metrics
    metrics.oracleRequests++;
    metrics.totalResponseTime += responseTime;
    metrics.averageResponseTime = metrics.totalResponseTime / metrics.oracleRequests;
    metrics.aiModelCalls[model] = (metrics.aiModelCalls[model] || 0) + 1;
    
    res.json({
      response: response,
      model: model,
      tokens_used: max_tokens,
      response_time_ms: responseTime,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    metrics.oracleErrors++;
    console.error('Oracle error:', error);
    
    res.status(500).json({
      error: 'Oracle processing failed',
      message: error.message
    });
  }
});

// Metrics endpoint (Prometheus format)
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Custom metrics endpoint (JSON)
app.get('/metrics/json', (req, res) => {
  res.json({
    oracle: {
      total_requests: metrics.oracleRequests,
      total_errors: metrics.oracleErrors,
      average_response_time_ms: Math.round(metrics.averageResponseTime),
      model_usage: metrics.aiModelCalls
    },
    tokens: metrics.tokenMetrics,
    system: {
      uptime_seconds: Math.floor(process.uptime()),
      memory_usage: process.memoryUsage(),
      node_version: process.version
    },
    timestamp: new Date().toISOString()
  });
});

// Tokenomics endpoint
app.get('/tokenomics', (req, res) => {
  res.json(tokenomicsConfig);
});

// DRT emissions calculation endpoint
app.post('/emissions/calculate', (req, res) => {
  const { blocks = 1 } = req.body;
  const emissionConfig = tokenomicsConfig.emissions;
  
  if (!emissionConfig?.enabled) {
    return res.status(400).json({
      error: 'Emissions not enabled'
    });
  }
  
  const blocksPerYear = emissionConfig.blocks_per_year || 5256000;
  const drtPerYear = emissionConfig.drt_per_year || '52560000000000';
  const drtPerBlock = Math.floor(parseInt(drtPerYear) / blocksPerYear);
  
  const totalEmission = drtPerBlock * blocks;
  const distribution = emissionConfig.distribution || {};
  
  res.json({
    blocks_processed: blocks,
    drt_per_block: drtPerBlock.toString(),
    total_emission: totalEmission.toString(),
    distribution: {
      validators: Math.floor(totalEmission * (distribution.validators || 0.6)),
      delegators: Math.floor(totalEmission * (distribution.delegators || 0.25)),
      ai_services: Math.floor(totalEmission * (distribution.ai_services || 0.10)),
      bridge_ops: Math.floor(totalEmission * (distribution.bridge_ops || 0.05))
    },
    timestamp: new Date().toISOString()
  });
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({
    service: 'dytallix-server',
    status: 'running',
    version: '0.1.0',
    chain_id: process.env.CHAIN_ID || 'dytallix-testnet-1',
    endpoints: {
      health: '/health',
      oracle: '/oracle',
      metrics: '/metrics',
      tokenomics: '/tokenomics',
      emissions: '/emissions/calculate'
    },
    timestamp: new Date().toISOString()
  });
});

// Default route
app.get('/', (req, res) => {
  res.json({
    service: 'Dytallix Server',
    version: '0.1.0',
    description: 'AI Oracle and Metrics Server for Dytallix Testnet',
    documentation: '/status'
  });
});

// Simulate AI response (replace with actual AI service integration)
async function simulateAIResponse(prompt, model, maxTokens) {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 500));
  
  const responses = {
    'gpt-4': `AI Response (GPT-4): Processing "${prompt.substring(0, 50)}..." - This is a simulated response for testing purposes.`,
    'claude-3': `AI Response (Claude-3): Analyzing "${prompt.substring(0, 50)}..." - This is a simulated response for testing purposes.`,
    'llama-2': `AI Response (LLaMA-2): Understanding "${prompt.substring(0, 50)}..." - This is a simulated response for testing purposes.`
  };
  
  return responses[model] || responses['gpt-4'];
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`🚀 Dytallix Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Metrics available at http://${HOST}:${PORT}/metrics`);
  console.log(`🤖 AI Oracle available at http://${HOST}:${PORT}/oracle`);
  console.log(`💰 Tokenomics data at http://${HOST}:${PORT}/tokenomics`);
});

export default app;