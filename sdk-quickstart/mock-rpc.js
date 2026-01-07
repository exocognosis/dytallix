#!/usr/bin/env node

/**
 * Mock RPC Server for Dytallix SDK Quickstart
 * 
 * This provides a fallback RPC endpoint for testing the SDK
 * when the live testnet RPC is unreachable.
 */

import express from 'express';

const app = express();
app.use(express.json());

const MOCK_BLOCK_HEIGHT = 12345;
const MOCK_CHAIN_ID = 'dyt-testnet-1';

// Mock /status endpoint (Cosmos SDK style)
app.get('/status', (req, res) => {
  console.log('📡 Mock RPC: Received /status request');
  res.json({
    block_height: MOCK_BLOCK_HEIGHT,
    chain_id: MOCK_CHAIN_ID,
    latest_block_hash: '0xABCDEF1234567890',
    latest_block_time: new Date().toISOString()
  });
});

// Mock JSON-RPC endpoint
app.post('/rpc', (req, res) => {
  console.log('📡 Mock RPC: Received JSON-RPC request:', req.body.method);
  
  const { method, id } = req.body;
  
  if (method === 'status') {
    res.json({
      jsonrpc: '2.0',
      id,
      result: {
        sync_info: {
          latest_block_height: String(MOCK_BLOCK_HEIGHT),
          catching_up: false
        }
      }
    });
  } else {
    res.json({
      jsonrpc: '2.0',
      id,
      result: {}
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mock RPC server is running' });
});

const PORT = process.env.PORT || 26657;

// Box formatting constants
const BOX_FIELD_WIDTH = 46; // Width for field values within the formatted box

app.listen(PORT, () => {
  const statusUrl = `http://localhost:${PORT}/status`;
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  🚀 Dytallix Mock RPC Server                              ║
║                                                            ║
║  Status:    RUNNING                                        ║
║  Port:      ${PORT.toString().padEnd(BOX_FIELD_WIDTH)}║
║  Endpoint:  ${statusUrl.padEnd(BOX_FIELD_WIDTH)}║
║                                                            ║
║  This server simulates a Dytallix node for SDK testing    ║
╚════════════════════════════════════════════════════════════╝
  `);
});
