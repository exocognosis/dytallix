const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { ContractAnalyzer } = require('./contract-analyzer');

const app = express();
const port = process.env.WORKER_PORT || 8081;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize analyzer
const analyzer = new ContractAnalyzer({
  aiModelEndpoint: process.env.AI_MODEL_ENDPOINT,
  staticAnalyzerEnabled: process.env.STATIC_ANALYZER_ENABLED !== 'false',
  dynamicAnalyzerEnabled: process.env.DYNAMIC_ANALYZER_ENABLED !== 'false',
});

// Routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'codeguard-worker',
    analyzers: {
      static: analyzer.isStaticEnabled(),
      dynamic: analyzer.isDynamicEnabled(),
    }
  });
});

app.post('/analyze', async (req, res) => {
  try {
    const { contractAddress, codeHash, sourceCode, bytecode } = req.body;
    
    if (!contractAddress || !codeHash) {
      return res.status(400).json({ 
        error: 'Missing required fields: contractAddress, codeHash' 
      });
    }

    const analysisResult = await analyzer.analyzeContract({
      contractAddress,
      codeHash,
      sourceCode,
      bytecode,
    });

    res.json(analysisResult);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Analysis failed', 
      details: error.message 
    });
  }
});

app.get('/models', async (req, res) => {
  try {
    const models = await analyzer.getAvailableModels();
    res.json({ models });
  } catch (error) {
    console.error('Models query error:', error);
    res.status(500).json({ error: 'Failed to get models' });
  }
});

app.get('/capabilities', (req, res) => {
  res.json({
    staticAnalysis: {
      enabled: analyzer.isStaticEnabled(),
      features: [
        'Vulnerability detection',
        'Code pattern analysis',
        'Access control verification',
        'Reentrancy detection'
      ]
    },
    dynamicAnalysis: {
      enabled: analyzer.isDynamicEnabled(),
      features: [
        'Execution flow analysis',
        'State mutation testing',
        'Gas usage analysis',
        'Edge case detection'
      ]
    },
    codeQuality: {
      enabled: true,
      features: [
        'Complexity metrics',
        'Documentation coverage',
        'Best practices checking',
        'Code maintainability'
      ]
    }
  });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  console.log(`CodeGuard Worker running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});

module.exports = app;