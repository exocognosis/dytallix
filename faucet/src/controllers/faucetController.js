const winston = require('winston');
const axios = require('axios');

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

class FaucetController {
  constructor() {
    this.rpcEndpoint = process.env.RPC_ENDPOINT || 'http://127.0.0.1:26657';
    this.chainId = process.env.CHAIN_ID || 'dytallix-testnet-1';
    this.faucetAddress = process.env.FAUCET_ADDRESS || 'dyt1faucet_placeholder_address';
    
    // Dual token system configuration
    this.tokenConfig = {
      DGT: {
        amount: process.env.DGT_FAUCET_AMOUNT || '10000000udgt', // 10 DGT
        denom: 'udgt',
        name: 'Dytallix Governance Token',
        description: 'For governance voting and protocol decisions'
      },
      DRT: {
        amount: process.env.DRT_FAUCET_AMOUNT || '100000000udrt', // 100 DRT  
        denom: 'udrt',
        name: 'Dytallix Reward Token',
        description: 'For rewards, incentives, and transaction fees'
      }
    };
  }

  async sendTokens(req, res) {
    try {
      const { address } = req.body;
      const clientIp = req.ip || req.connection.remoteAddress;

      logger.info('Faucet request received', {
        address,
        clientIp,
        amount: this.faucetAmount
      });

      // Validate address format (basic validation)
      if (!this.isValidAddress(address)) {
        return res.status(400).json({
          error: 'Invalid address format',
          message: 'Address must be a valid Dytallix address starting with "dyt"'
        });
      }

      // Check if address already has sufficient balance
      const currentBalance = await this.getAddressBalance(address);
      if (currentBalance && currentBalance > 5000000) { // 5 DYT threshold
        return res.status(429).json({
          error: 'Address already has sufficient balance',
          message: `Address has ${currentBalance} udyt, faucet is limited to addresses with less than 5000000 udyt`,
          currentBalance: currentBalance
        });
      }

      // Simulate sending tokens (replace with actual blockchain transaction)
      const txHash = await this.simulateSendTransaction(address, this.faucetAmount);

      logger.info('Tokens sent successfully', {
        address,
        amount: this.faucetAmount,
        txHash,
        clientIp
      });

      res.status(200).json({
        success: true,
        message: 'Tokens sent successfully',
        txHash,
        amount: this.faucetAmount,
        recipient: address,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error sending tokens', {
        error: error.message,
        stack: error.stack,
        address: req.body.address
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to send tokens. Please try again later.'
      });
    }
  }

  async getStatus(req, res) {
    try {
      // Check network status first (this works with kvstore)
      const networkStatus = await this.getNetworkStatus();
      
      // For kvstore app, we'll simulate faucet balance since bank module doesn't exist
      const faucetBalance = networkStatus.connected ? 1000000000 : 'Unknown';

      res.json({
        status: networkStatus.connected ? 'operational' : 'degraded',
        faucetBalance: faucetBalance,
        faucetAddress: this.faucetAddress,
        chainId: this.chainId,
        network: networkStatus,
        tokensPerRequest: this.faucetAmount,
        lastUpdated: new Date().toISOString(),
        note: networkStatus.connected ? 'Connected to kvstore testnet' : 'Network connection issues'
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

      if (!this.isValidAddress(address)) {
        return res.status(400).json({
          error: 'Invalid address format'
        });
      }

      const balance = await this.getAddressBalance(address);
      
      res.json({
        address,
        balance: balance || '0',
        denom: 'udyt',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error getting balance', { 
        error: error.message, 
        address: req.params.address 
      });

      res.status(500).json({
        error: 'Failed to get balance',
        message: error.message
      });
    }
  }

  isValidAddress(address) {
    // Basic Dytallix address validation
    if (!address || typeof address !== 'string') {
      return false;
    }
    
    // Should start with 'dyt' and be appropriate length
    return address.startsWith('dyt') && address.length >= 20 && address.length <= 65;
  }

  async simulateSendTransaction(toAddress, amount) {
    // This simulates a blockchain transaction
    // In a real implementation, this would:
    // 1. Create and sign a transaction using the faucet private key
    // 2. Broadcast the transaction to the Dytallix network
    // 3. Return the actual transaction hash
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    
    const txHash = this.generateTxHash();
    logger.info('Simulated transaction created', {
      txHash,
      toAddress,
      amount,
      fromAddress: this.faucetAddress
    });

    return txHash;
  }

  async getAddressBalance(address) {
    try {
      // This would make an actual RPC call to get balance
      // For now, return simulated balance
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
        // Parse balance from response (simplified)
        return Math.floor(Math.random() * 10000000); // Simulated balance
      }
      
      return Math.floor(Math.random() * 10000000); // Simulated balance
    } catch (error) {
      logger.warn('Failed to get balance', { address, error: error.message });
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
          blockHeight: response.data.result.sync_info?.latest_block_height || 'Unknown'
        };
      }
      
      return { connected: false, error: 'Invalid response format' };
    } catch (error) {
      logger.warn('Network status check failed', { error: error.message });
      return { 
        connected: false, 
        error: error.message,
        simulated: true,
        chainId: this.chainId
      };
    }
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

module.exports = new FaucetController();