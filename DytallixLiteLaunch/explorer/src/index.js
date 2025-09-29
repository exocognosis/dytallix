import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';

const app = express();
const PORT = process.env.EXPLORER_PORT || 3000;
const HOST = process.env.EXPLORER_HOST || '0.0.0.0';

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'dytallix-explorer',
    version: '0.1.0',
    timestamp: new Date().toISOString()
  });
});

// Basic explorer endpoints (placeholder)
app.get('/', (req, res) => {
  res.json({
    service: 'Dytallix Explorer',
    version: '0.1.0',
    description: 'Blockchain explorer for Dytallix testnet',
    endpoints: [
      'GET /health',
      'GET /api/blocks',
      'GET /api/transactions',
      'GET /api/accounts'
    ]
  });
});

// API endpoints (simplified for demo)
app.get('/api/blocks', (req, res) => {
  res.json({
    message: 'Explorer API coming soon',
    endpoint: 'blocks'
  });
});

app.get('/api/transactions', (req, res) => {
  res.json({
    message: 'Explorer API coming soon',
    endpoint: 'transactions'
  });
});

app.get('/api/accounts', (req, res) => {
  res.json({
    message: 'Explorer API coming soon',
    endpoint: 'accounts'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`🔍 Dytallix Explorer running on http://${HOST}:${PORT}`);
});

export default app;