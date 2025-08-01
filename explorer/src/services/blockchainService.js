const axios = require('axios');
const winston = require('winston');
const moment = require('moment');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

class BlockchainService {
  constructor() {
    this.rpcEndpoint = process.env.RPC_ENDPOINT || 'http://127.0.0.1:26657';
    this.chainId = process.env.CHAIN_ID || 'dytallix-testnet-1';
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
  }

  async initialize() {
    try {
      const status = await this.getNetworkStatus();
      logger.info('Blockchain service initialized', {
        chainId: status.chainId,
        latestHeight: status.latestHeight
      });
    } catch (error) {
      logger.warn('Blockchain service initialization with simulated data', {
        error: error.message
      });
    }
  }

  async makeRpcCall(method, params = {}) {
    try {
      const response = await axios.post(this.rpcEndpoint, {
        jsonrpc: '2.0',
        method,
        params,
        id: Date.now()
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      logger.warn(`RPC call failed: ${method}`, { error: error.message });
      return null;
    }
  }

  async getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  async getNetworkStatus() {
    const cacheKey = 'network_status';
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.rpcEndpoint}/status`, { timeout: 5000 });
      
      if (response.data && response.data.result) {
        const result = response.data.result;
        const status = {
          chainId: result.node_info?.network || this.chainId,
          latestHeight: parseInt(result.sync_info?.latest_block_height) || 0,
          latestBlockTime: result.sync_info?.latest_block_time || new Date().toISOString(),
          catchingUp: result.sync_info?.catching_up || false,
          nodeInfo: {
            moniker: result.node_info?.moniker || 'unknown',
            version: result.node_info?.version || 'unknown'
          },
          validatorInfo: {
            address: result.validator_info?.address || '',
            pubKey: result.validator_info?.pub_key?.value || '',
            votingPower: parseInt(result.validator_info?.voting_power) || 0
          }
        };

        this.setCache(cacheKey, status);
        return status;
      }
    } catch (error) {
      logger.warn('Failed to get network status, using simulated data', { error: error.message });
    }

    // Return simulated data for development
    const simulatedStatus = {
      chainId: this.chainId,
      latestHeight: Math.floor(Date.now() / 5000), // Simulate block every 5 seconds
      latestBlockTime: new Date().toISOString(),
      catchingUp: false,
      nodeInfo: {
        moniker: 'dytallix-testnet-node',
        version: '0.1.0'
      },
      validatorInfo: {
        address: 'dyt1validator_address',
        pubKey: 'simulated_pubkey',
        votingPower: 1000000
      }
    };

    this.setCache(cacheKey, simulatedStatus);
    return simulatedStatus;
  }

  async getBlock(height) {
    const cacheKey = `block_${height}`;
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.makeRpcCall('block', { height: height.toString() });
      
      if (response && response.result) {
        const block = this.formatBlock(response.result);
        this.setCache(cacheKey, block);
        return block;
      }
    } catch (error) {
      logger.warn(`Failed to get block ${height}`, { error: error.message });
    }

    // Return simulated block data
    const simulatedBlock = this.generateSimulatedBlock(height);
    this.setCache(cacheKey, simulatedBlock);
    return simulatedBlock;
  }

  async getRecentBlocks(limit = 20) {
    const status = await this.getNetworkStatus();
    const blocks = [];
    const startHeight = Math.max(1, status.latestHeight - limit + 1);

    for (let height = status.latestHeight; height >= startHeight; height--) {
      const block = await this.getBlock(height);
      if (block) {
        blocks.push(block);
      }
    }

    return blocks;
  }

  async getTransaction(hash) {
    const cacheKey = `tx_${hash}`;
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.makeRpcCall('tx', { hash, prove: false });
      
      if (response && response.result) {
        const tx = this.formatTransaction(response.result);
        this.setCache(cacheKey, tx);
        return tx;
      }
    } catch (error) {
      logger.warn(`Failed to get transaction ${hash}`, { error: error.message });
    }

    // Return simulated transaction data
    const simulatedTx = this.generateSimulatedTransaction(hash);
    this.setCache(cacheKey, simulatedTx);
    return simulatedTx;
  }

  async getValidators() {
    const cacheKey = 'validators';
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.makeRpcCall('validators');
      
      if (response && response.result) {
        const validators = response.result.validators.map(v => ({
          address: v.address,
          pubKey: v.pub_key.value,
          votingPower: parseInt(v.voting_power),
          proposerPriority: parseInt(v.proposer_priority)
        }));

        this.setCache(cacheKey, validators);
        return validators;
      }
    } catch (error) {
      logger.warn('Failed to get validators', { error: error.message });
    }

    // Return simulated validators
    const simulatedValidators = this.generateSimulatedValidators();
    this.setCache(cacheKey, simulatedValidators);
    return simulatedValidators;
  }

  formatBlock(blockData) {
    const block = blockData.block;
    return {
      height: parseInt(block.header.height),
      hash: blockData.block_id.hash,
      time: block.header.time,
      proposer: block.header.proposer_address,
      txCount: block.data.txs ? block.data.txs.length : 0,
      size: JSON.stringify(block).length,
      chainId: block.header.chain_id
    };
  }

  formatTransaction(txData) {
    return {
      hash: txData.hash,
      height: parseInt(txData.height),
      code: txData.tx_result.code || 0,
      gasWanted: parseInt(txData.tx_result.gas_wanted) || 0,
      gasUsed: parseInt(txData.tx_result.gas_used) || 0,
      fee: '0udyt', // Simplified
      memo: '',
      timestamp: new Date().toISOString(),
      success: (txData.tx_result.code || 0) === 0
    };
  }

  generateSimulatedBlock(height) {
    const now = new Date();
    return {
      height: parseInt(height),
      hash: this.generateHash(),
      time: new Date(now.getTime() - ((Date.now() / 5000 - height) * 5000)).toISOString(),
      proposer: 'dyt1validator' + (height % 4),
      txCount: Math.floor(Math.random() * 10),
      size: 1024 + Math.floor(Math.random() * 4096),
      chainId: this.chainId
    };
  }

  generateSimulatedTransaction(hash) {
    return {
      hash: hash || this.generateHash(),
      height: Math.floor(Date.now() / 5000) - Math.floor(Math.random() * 100),
      code: 0,
      gasWanted: 100000,
      gasUsed: 75000 + Math.floor(Math.random() * 20000),
      fee: '1000udyt',
      memo: 'Simulated transaction',
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      success: true
    };
  }

  generateSimulatedValidators() {
    return Array.from({ length: 4 }, (_, i) => ({
      address: `dyt1validator${i}address`,
      pubKey: this.generateHash(),
      votingPower: 1000000 + Math.floor(Math.random() * 500000),
      proposerPriority: Math.floor(Math.random() * 1000000)
    }));
  }

  generateHash() {
    const chars = '0123456789ABCDEF';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

module.exports = new BlockchainService();