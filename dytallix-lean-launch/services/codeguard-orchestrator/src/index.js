const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { ScanOrchestrator } = require('./orchestrator');
const { ContractClient } = require('./contract-client');

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Initialize services
const contractClient = new ContractClient({
  rpcEndpoint: process.env.CODEGUARD_CHAIN_RPC || 'http://localhost:26657',
  contractAddress: process.env.CODEGUARD_CONTRACT_ADDRESS,
});

const orchestrator = new ScanOrchestrator({
  contractClient,
  workersEndpoint: process.env.CODEGUARD_WORKERS_ENDPOINT || 'http://localhost:8081',
  rulesEndpoint: process.env.CODEGUARD_RULES_ENDPOINT || 'http://localhost:8082',
});

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'codeguard-orchestrator' });
});

app.post('/scan', async (req, res) => {
  try {
    const { contractAddress, codeHash } = req.body;
    
    if (!contractAddress || !codeHash) {
      return res.status(400).json({ 
        error: 'Missing required fields: contractAddress, codeHash' 
      });
    }

    const scanId = await orchestrator.submitScan({
      contractAddress,
      codeHash,
      requestId: Date.now().toString(),
    });

    res.json({ scanId, status: 'submitted' });
  } catch (error) {
    console.error('Scan submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/scan/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await orchestrator.getScanResult(id);
    
    if (!result) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    res.json(result);
  } catch (error) {
    console.error('Scan query error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/contracts/:address/verify', async (req, res) => {
  try {
    const { address } = req.params;
    const verification = await contractClient.verifyContract(address);
    res.json(verification);
  } catch (error) {
    console.error('Contract verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  console.log(`CodeGuard Orchestrator running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});

module.exports = app;