import express from 'express';
import faucetRouter from './routes/faucet.js';

const app = express();
const PORT = process.env.FAUCET_API_PORT || 3001;

app.use(express.json());

// Mount the faucet routes
app.use('/api/faucet', faucetRouter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Faucet API server running on port ${PORT}`);
});

export default app;