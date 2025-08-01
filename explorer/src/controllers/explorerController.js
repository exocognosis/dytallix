const blockchainService = require('../services/blockchainService');
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

class ExplorerController {
  async getInfo(req, res) {
    try {
      res.json({
        name: 'Dytallix Testnet Explorer',
        version: '1.0.0',
        chainId: process.env.CHAIN_ID || 'dytallix-testnet-1',
        rpcEndpoint: process.env.RPC_ENDPOINT || 'http://127.0.0.1:26657',
        features: [
          'Block exploration',
          'Transaction viewing',
          'Address lookup',
          'Validator information',
          'Network status',
          'Search functionality'
        ],
        endpoints: {
          blocks: '/api/blocks',
          block: '/api/blocks/:height',
          transactions: '/api/transactions',
          transaction: '/api/transactions/:hash',
          address: '/api/addresses/:address',
          validators: '/api/validators',
          search: '/api/search/:query'
        }
      });
    } catch (error) {
      logger.error('Error getting explorer info', { error: error.message });
      res.status(500).json({ error: 'Failed to get explorer info' });
    }
  }

  async getNetworkStatus(req, res) {
    try {
      const status = await blockchainService.getNetworkStatus();
      res.json(status);
    } catch (error) {
      logger.error('Error getting network status', { error: error.message });
      res.status(500).json({ error: 'Failed to get network status' });
    }
  }

  async getBlocks(req, res) {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const blocks = await blockchainService.getRecentBlocks(limit);
      
      res.json({
        blocks,
        total: blocks.length,
        limit
      });
    } catch (error) {
      logger.error('Error getting blocks', { error: error.message });
      res.status(500).json({ error: 'Failed to get blocks' });
    }
  }

  async getBlock(req, res) {
    try {
      const height = parseInt(req.params.height);
      
      if (isNaN(height) || height < 1) {
        return res.status(400).json({ 
          error: 'Invalid block height',
          message: 'Block height must be a positive number'
        });
      }

      const block = await blockchainService.getBlock(height);
      
      if (!block) {
        return res.status(404).json({ 
          error: 'Block not found',
          message: `Block at height ${height} not found`
        });
      }

      res.json(block);
    } catch (error) {
      logger.error('Error getting block', { 
        error: error.message, 
        height: req.params.height 
      });
      res.status(500).json({ error: 'Failed to get block' });
    }
  }

  async getTransactions(req, res) {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      
      // Get recent blocks and extract transactions
      const blocks = await blockchainService.getRecentBlocks(limit);
      const transactions = [];
      
      for (const block of blocks) {
        // Simulate transactions for each block
        const txCount = block.txCount || 0;
        for (let i = 0; i < txCount; i++) {
          transactions.push({
            hash: blockchainService.generateHash(),
            height: block.height,
            time: block.time,
            success: Math.random() > 0.1, // 90% success rate
            gasUsed: 75000 + Math.floor(Math.random() * 20000),
            fee: '1000udyt'
          });
        }
      }

      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedTxs = transactions.slice(startIndex, endIndex);

      res.json({
        transactions: paginatedTxs,
        total: transactions.length,
        page,
        limit,
        totalPages: Math.ceil(transactions.length / limit)
      });
    } catch (error) {
      logger.error('Error getting transactions', { error: error.message });
      res.status(500).json({ error: 'Failed to get transactions' });
    }
  }

  async getTransaction(req, res) {
    try {
      const hash = req.params.hash;
      
      if (!hash || hash.length !== 64) {
        return res.status(400).json({ 
          error: 'Invalid transaction hash',
          message: 'Transaction hash must be 64 characters long'
        });
      }

      const transaction = await blockchainService.getTransaction(hash);
      
      if (!transaction) {
        return res.status(404).json({ 
          error: 'Transaction not found',
          message: `Transaction with hash ${hash} not found`
        });
      }

      res.json(transaction);
    } catch (error) {
      logger.error('Error getting transaction', { 
        error: error.message, 
        hash: req.params.hash 
      });
      res.status(500).json({ error: 'Failed to get transaction' });
    }
  }

  async getAddress(req, res) {
    try {
      const address = req.params.address;
      
      if (!address || !address.startsWith('dyt')) {
        return res.status(400).json({ 
          error: 'Invalid address format',
          message: 'Address must start with "dyt"'
        });
      }

      // Simulate address information
      const addressInfo = {
        address,
        balance: (Math.random() * 10000000).toFixed(0) + 'udyt',
        sequence: Math.floor(Math.random() * 1000),
        accountNumber: Math.floor(Math.random() * 10000),
        transactionCount: Math.floor(Math.random() * 100),
        firstSeen: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
        lastSeen: new Date(Date.now() - Math.random() * 86400000).toISOString()
      };

      res.json(addressInfo);
    } catch (error) {
      logger.error('Error getting address', { 
        error: error.message, 
        address: req.params.address 
      });
      res.status(500).json({ error: 'Failed to get address information' });
    }
  }

  async getAddressTransactions(req, res) {
    try {
      const address = req.params.address;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      
      if (!address || !address.startsWith('dyt')) {
        return res.status(400).json({ 
          error: 'Invalid address format',
          message: 'Address must start with "dyt"'
        });
      }

      // Simulate transactions for the address
      const transactions = Array.from({ length: Math.floor(Math.random() * 50) }, (_, i) => ({
        hash: blockchainService.generateHash(),
        height: Math.floor(Date.now() / 5000) - i,
        time: new Date(Date.now() - i * 300000).toISOString(), // Every 5 minutes
        type: Math.random() > 0.5 ? 'send' : 'receive',
        amount: (Math.random() * 1000000).toFixed(0) + 'udyt',
        from: Math.random() > 0.5 ? address : 'dyt1other_address',
        to: Math.random() > 0.5 ? address : 'dyt1another_address',
        success: Math.random() > 0.1,
        fee: '1000udyt'
      }));

      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedTxs = transactions.slice(startIndex, endIndex);

      res.json({
        address,
        transactions: paginatedTxs,
        total: transactions.length,
        page,
        limit,
        totalPages: Math.ceil(transactions.length / limit)
      });
    } catch (error) {
      logger.error('Error getting address transactions', { 
        error: error.message, 
        address: req.params.address 
      });
      res.status(500).json({ error: 'Failed to get address transactions' });
    }
  }

  async getValidators(req, res) {
    try {
      const validators = await blockchainService.getValidators();
      res.json({
        validators,
        total: validators.length,
        activeValidators: validators.length
      });
    } catch (error) {
      logger.error('Error getting validators', { error: error.message });
      res.status(500).json({ error: 'Failed to get validators' });
    }
  }

  async search(req, res) {
    try {
      const query = req.params.query?.trim();
      
      if (!query) {
        return res.status(400).json({ 
          error: 'Invalid search query',
          message: 'Search query cannot be empty'
        });
      }

      const results = {
        query,
        results: []
      };

      // Check if it's a block height
      if (/^\d+$/.test(query)) {
        const height = parseInt(query);
        if (height > 0) {
          const block = await blockchainService.getBlock(height);
          if (block) {
            results.results.push({
              type: 'block',
              data: block,
              match: 'height'
            });
          }
        }
      }

      // Check if it's a transaction hash
      if (/^[A-Fa-f0-9]{64}$/.test(query)) {
        const transaction = await blockchainService.getTransaction(query);
        if (transaction) {
          results.results.push({
            type: 'transaction',
            data: transaction,
            match: 'hash'
          });
        }
      }

      // Check if it's an address
      if (query.startsWith('dyt') && query.length >= 20) {
        results.results.push({
          type: 'address',
          data: {
            address: query,
            balance: (Math.random() * 10000000).toFixed(0) + 'udyt'
          },
          match: 'address'
        });
      }

      res.json(results);
    } catch (error) {
      logger.error('Error performing search', { 
        error: error.message, 
        query: req.params.query 
      });
      res.status(500).json({ error: 'Search failed' });
    }
  }
}

module.exports = new ExplorerController();