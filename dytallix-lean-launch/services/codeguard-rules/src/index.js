const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { RulesEngine } = require('./rules-engine');
const { RuleSetManager } = require('./ruleset-manager');

const app = express();
const port = process.env.RULES_PORT || 8082;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Initialize services
const ruleSetManager = new RuleSetManager({
  configPath: process.env.RULES_CONFIG_PATH || './config/rules.json',
});

const rulesEngine = new RulesEngine({
  ruleSetManager,
  strictMode: process.env.RULES_STRICT_MODE === 'true',
});

// Routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'codeguard-rules',
    rulesLoaded: rulesEngine.getRulesCount(),
    strictMode: rulesEngine.isStrictMode(),
  });
});

app.post('/evaluate', async (req, res) => {
  try {
    const { analysis, ruleSet } = req.body;
    
    if (!analysis) {
      return res.status(400).json({ 
        error: 'Missing analysis data' 
      });
    }

    const evaluation = await rulesEngine.evaluate(analysis, ruleSet);
    res.json(evaluation);
  } catch (error) {
    console.error('Rules evaluation error:', error);
    res.status(500).json({ 
      error: 'Evaluation failed', 
      details: error.message 
    });
  }
});

app.get('/rules', async (req, res) => {
  try {
    const { category, severity } = req.query;
    const rules = await rulesEngine.getRules({ category, severity });
    res.json({ rules });
  } catch (error) {
    console.error('Rules query error:', error);
    res.status(500).json({ error: 'Failed to get rules' });
  }
});

app.post('/rules', async (req, res) => {
  try {
    const rule = req.body;
    const result = await rulesEngine.addCustomRule(rule);
    res.status(201).json(result);
  } catch (error) {
    console.error('Rule creation error:', error);
    res.status(400).json({ 
      error: 'Failed to create rule', 
      details: error.message 
    });
  }
});

app.get('/rulesets', async (req, res) => {
  try {
    const ruleSets = await ruleSetManager.getAvailableRuleSets();
    res.json({ ruleSets });
  } catch (error) {
    console.error('RuleSets query error:', error);
    res.status(500).json({ error: 'Failed to get rule sets' });
  }
});

app.get('/rulesets/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const ruleSet = await ruleSetManager.getRuleSet(name);
    
    if (!ruleSet) {
      return res.status(404).json({ error: 'Rule set not found' });
    }
    
    res.json(ruleSet);
  } catch (error) {
    console.error('RuleSet query error:', error);
    res.status(500).json({ error: 'Failed to get rule set' });
  }
});

app.get('/stats', async (req, res) => {
  try {
    const stats = await rulesEngine.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Stats query error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize and start server
async function startServer() {
  try {
    await ruleSetManager.initialize();
    await rulesEngine.initialize();
    
    app.listen(port, () => {
      console.log(`CodeGuard Rules Engine running on port ${port}`);
      console.log(`Health check: http://localhost:${port}/health`);
      console.log(`Rules loaded: ${rulesEngine.getRulesCount()}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;