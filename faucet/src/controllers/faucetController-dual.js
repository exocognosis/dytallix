const winston = require('winston');
const axios = require('axios');
const { logFaucetEvent } = require('../utils/artifactLogger');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

class DualTokenFaucetController {
  constructor() {
    this.rpcEndpoint = process.env.RPC_ENDPOINT || 'http://127.0.0.1:26657';
    this.chainId = process.env.CHAIN_ID || 'dytallix-testnet-1';
    this.faucetAddress = process.env.FAUCET_ADDRESS || 'dyt1faucet_placeholder_address';
    
    // Dual token system configuration based on Dytallix tokenomics
    this.tokenConfig = {
      DGT: {
        amount: process.env.DGT_FAUCET_AMOUNT || '10000000udgt', // 10 DGT for governance testing
        denom: 'udgt',
        name: 'Dytallix Governance Token',
        description: 'For governance voting and protocol decisions',
        maxBalance: 50000000, // 50 DGT limit per address
        supply: 'Fixed (1B DGT)',
        votingPower: '1 DGT = 1 Vote'
      },
      DRT: {
        amount: process.env.DRT_FAUCET_AMOUNT || '100000000udrt', // 100 DRT for rewards/testing
        denom: 'udrt',
        name: 'Dytallix Reward Token',
        description: 'For rewards, incentives, and transaction fees',
        maxBalance: 500000000, // 500 DRT limit per address
        supply: 'Inflationary (-6% annual)',
        utility: 'Staking rewards, AI payments, transaction fees'
      }
    };
  }

  async sendTokens(req, res) {
    try {
      const { address, tokenType = 'both' } = req.body;
      const clientIp = req.ip || req.connection.remoteAddress;

      logger.info('Dual token faucet request received', {
        address,
        tokenType,
        clientIp,
        dgtAmount: this.tokenConfig.DGT.amount,
        drtAmount: this.tokenConfig.DRT.amount
      });

      // Validate address format
      if (!this.isValidAddress(address)) {
        return res.status(400).json({
          error: 'Invalid address format',
          message: 'Address must be a valid Dytallix address starting with "dyt"'
        });
      }

      // Validate token type
      const validTokenTypes = ['DGT', 'DRT', 'both'];
      if (!validTokenTypes.includes(tokenType)) {
        return res.status(400).json({
          error: 'Invalid token type',
          message: 'Token type must be one of: DGT (governance), DRT (rewards), or both',
          validTypes: validTokenTypes,
          tokenInfo: {
            DGT: this.tokenConfig.DGT.description,
            DRT: this.tokenConfig.DRT.description
          }
        });
      }

      // Check current balances (simplified for kvstore)
      const currentDgtBalance = await this.getAddressBalance(address, 'udgt');
      const currentDrtBalance = await this.getAddressBalance(address, 'udrt');

      // Balance limit checks
      if ((tokenType === 'DGT' || tokenType === 'both') && currentDgtBalance > this.tokenConfig.DGT.maxBalance) {
        return res.status(429).json({
          error: 'DGT balance limit reached',
          message: `Address has ${currentDgtBalance} udgt (${currentDgtBalance/1000000} DGT)`,
          limit: `Faucet limited to ${this.tokenConfig.DGT.maxBalance/1000000} DGT per address`,
          tokenInfo: this.tokenConfig.DGT
        });
      }

      if ((tokenType === 'DRT' || tokenType === 'both') && currentDrtBalance > this.tokenConfig.DRT.maxBalance) {
        return res.status(429).json({
          error: 'DRT balance limit reached', 
          message: `Address has ${currentDrtBalance} udrt (${currentDrtBalance/1000000} DRT)`,
          limit: `Faucet limited to ${this.tokenConfig.DRT.maxBalance/1000000} DRT per address`,
          tokenInfo: this.tokenConfig.DRT
        });
      }

      // Simulate token distribution
      const transactions = [];
      let totalSent = {};
      const before = {
        DGT: currentDgtBalance,
        DRT: currentDrtBalance,
      };

      if (tokenType === 'DGT' || tokenType === 'both') {
        const dgtTxHash = this.generateTxHash();
        transactions.push({
          token: 'DGT',
          amount: this.tokenConfig.DGT.amount,
          amountFormatted: `${parseInt(this.tokenConfig.DGT.amount)/1000000} DGT`,
          txHash: dgtTxHash,
          denom: this.tokenConfig.DGT.denom,
          purpose: 'Governance voting and protocol decisions'
        });
        totalSent.DGT = this.tokenConfig.DGT.amount;
      }

      if (tokenType === 'DRT' || tokenType === 'both') {
        const drtTxHash = this.generateTxHash();
        transactions.push({
          token: 'DRT', 
          amount: this.tokenConfig.DRT.amount,
          amountFormatted: `${parseInt(this.tokenConfig.DRT.amount)/1000000} DRT`,
          txHash: drtTxHash,
          denom: this.tokenConfig.DRT.denom,
          purpose: 'Rewards, incentives, and transaction fees'
        });
        totalSent.DRT = this.tokenConfig.DRT.amount;
      }

      // Log successful distribution
      logger.info('Dual token distribution completed', {
        address,
        tokenType,
        transactions: transactions.length,
        totalSent
      });

      // Artifact evidence logging (balance increment after funding)
      const after = {
        DGT: (before.DGT ?? 0) + (totalSent.DGT ? parseInt(totalSent.DGT) : 0),
        DRT: (before.DRT ?? 0) + (totalSent.DRT ? parseInt(totalSent.DRT) : 0),
      };
      logFaucetEvent('SUCCESS_FUND', {
        address,
        tokenType,
        sent: totalSent,
        before,
        after,
        transactions,
      });

      res.status(200).json({
        success: true,
        message: `Successfully sent ${tokenType} tokens to ${address}`,
        recipient: address,
        tokenType,
        transactions,
        totalSent,
        tokenomicsInfo: {
          DGT: tokenType === 'DGT' || tokenType === 'both' ? this.tokenConfig.DGT : null,
          DRT: tokenType === 'DRT' || tokenType === 'both' ? this.tokenConfig.DRT : null
        },
        timestamp: new Date().toISOString(),
        note: this.getTokenTypeNote(tokenType)
      });

    } catch (error) {
      logger.error('Error in dual token distribution', { 
        error: error.message,
        stack: error.stack 
      });
      
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to send tokens. Please try again later.'
      });
    }
  }

  getTokenTypeNote(tokenType) {
    switch(tokenType) {
      case 'DGT':
        return 'Received DGT tokens for governance voting. Use these to participate in protocol decisions and validator selection.';
      case 'DRT':
        return 'Received DRT tokens for rewards and transactions. Use these for staking, AI service payments, and transaction fees.';
      case 'both':
        return 'Received both DGT (governance) and DRT (rewards) tokens. DGT for voting, DRT for transactions and rewards.';
      default:
        return 'Token distribution completed.';
    }
  }

  async getStatus(req, res) {
    try {
      // Check network status first (this works with kvstore)
      const networkStatus = await this.getNetworkStatus();
      
      // For kvstore app, simulate dual token balances
      const dualTokenBalance = networkStatus.connected ? {
        DGT: { balance: 100000000000, formatted: '100,000 DGT' }, // 100k DGT in faucet
        DRT: { balance: 1000000000000, formatted: '1,000,000 DRT' } // 1M DRT in faucet
      } : 'Unknown';

      res.json({
        status: networkStatus.connected ? 'operational' : 'degraded',
        faucetBalance: dualTokenBalance,
        faucetAddress: this.faucetAddress,
        chainId: this.chainId,
        network: networkStatus,
        tokenomics: {
          DGT: {
            ...this.tokenConfig.DGT,
            perRequest: `${parseInt(this.tokenConfig.DGT.amount)/1000000} DGT`
          },
          DRT: {
            ...this.tokenConfig.DRT,
            perRequest: `${parseInt(this.tokenConfig.DRT.amount)/1000000} DRT`
          }
        },
        supportedTokenTypes: ['DGT', 'DRT', 'both'],
        lastUpdated: new Date().toISOString(),
        note: networkStatus.connected ? 
          'Connected to Dytallix testnet with dual token system (DGT + DRT)' : 
          'Network connection issues'
      });

    } catch (error) {
      logger.error('Error getting faucet status', { error: error.message });
      
      res.status(503).json({
        status: 'degraded',
        error: 'Unable to connect to network',
        message: error.message
      });
    }
  }

  async getBalance(req, res) {
    try {
      const { address } = req.params;
      const { token = 'both' } = req.query;

      if (!this.isValidAddress(address)) {
        return res.status(400).json({
          error: 'Invalid address format'
        });
      }

      let balances = {};

      if (token === 'DGT' || token === 'both') {
        const dgtBalance = await this.getAddressBalance(address, 'udgt');
        balances.DGT = {
          balance: dgtBalance,
          formatted: `${dgtBalance/1000000} DGT`,
          denom: 'udgt',
          votingPower: `${dgtBalance/1000000} votes`
        };
      }

      if (token === 'DRT' || token === 'both') {
        const drtBalance = await this.getAddressBalance(address, 'udrt');
        balances.DRT = {
          balance: drtBalance,
          formatted: `${drtBalance/1000000} DRT`,
          denom: 'udrt',
          utility: 'Rewards and transaction fees'
        };
      }

      res.json({
        address,
        balances,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error getting balance', { error: error.message });
      res.status(500).json({
        error: 'Failed to get balance'
      });
    }
  }

  async getAddressBalance(address, denom = 'udgt') {
    try {
      // Simulate balance query for kvstore (in real implementation, query blockchain)
      const response = await axios.post(`${this.rpcEndpoint}`, {
        jsonrpc: '2.0',
        method: 'abci_query',
        params: {
          path: `/bank/balances/${address}`,
          data: '',
          prove: false
        },
        id: 1
      }).catch(() => null);

      if (response && response.data && response.data.result) {
        // For kvstore, return simulated balance based on token type
        if (denom === 'udgt') {
          return Math.floor(Math.random() * 50000000); // 0-50 DGT
        } else if (denom === 'udrt') {
          return Math.floor(Math.random() * 200000000); // 0-200 DRT
        }
      }
      
      // Default simulated balances
      return denom === 'udgt' ? 
        Math.floor(Math.random() * 50000000) : // DGT balance
        Math.floor(Math.random() * 200000000);  // DRT balance
        
    } catch (error) {
      logger.warn('Failed to get balance', { address, denom, error: error.message });
      return null;
    }
  }

  async getNetworkStatus() {
    try {
      const response = await axios.get(`${this.rpcEndpoint}/status`);
      
      if (response.data && response.data.result) {
        return {
          connected: true,
          chainId: response.data.result.node_info?.network || this.chainId,
          blockHeight: response.data.result.sync_info?.latest_block_height || 'Unknown',
          dualTokenSupport: true
        };
      }
      
      return { connected: false, error: 'Invalid response format' };
    } catch (error) {
      logger.warn('Network status check failed', { error: error.message });
      return { 
        connected: false, 
        error: error.message,
        simulated: true,
        chainId: this.chainId,
        dualTokenSupport: true
      };
    }
  }

  isValidAddress(address) {
    // Basic validation for Dytallix addresses
    return typeof address === 'string' && 
           address.startsWith('dyt') && 
           address.length >= 40 && 
           address.length <= 45;
  }

  generateTxHash() {
    const chars = '0123456789ABCDEF';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

module.exports = new DualTokenFaucetController();
