const blockchainService = require('../services/blockchainService');
const dataService = require('../services/dataService');
const { TOKENS, formatAmountWithSymbol, getTokenByMicroDenom } = require('../tokens');
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
          search: '/api/search/:query',
          verifyTx: '/api/verify-tx'
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
      const pqc = {
        enabled: process.env.PQC_ENABLED === 'true',
        algorithm: (process.env.PQC_ALGORITHM || 'dilithium3').toLowerCase()
      };
      res.json({ ...status, pqc });
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
      const blocks = await blockchainService.getRecentBlocks(limit);
      const transactions = [];
      for (const block of blocks) {
        const txCount = block.txCount || 0;
        for (let i = 0; i < txCount; i++) {
          const gasUsed = 75000 + Math.floor(Math.random() * 20000);
          const txType = Math.random() > 0.8 ? 'contract_execution' : Math.random() > 0.9 ? 'contract_deploy' : 'transfer';
          const transaction = {
            hash: blockchainService.generateHash(),
            height: block.height,
            time: block.time,
            success: Math.random() > 0.1,
            gasUsed,
            fee: '1000udgt',
            type: txType
          };
          transaction.ai_risk_score = await dataService.calculateAIRiskScore(transaction);
          transactions.push(transaction);
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
      res.status(500).json({ error: { code: 'TRANSACTIONS_ERROR', message: 'Failed to get transactions' } });
    }
  }

  async getTransaction(req, res) {
    try {
      const hash = req.params.hash;
      if (!hash || hash.length !== 64) {
        return res.status(400).json({ 
          error: { 
            code: 'INVALID_HASH', 
            message: 'Transaction hash must be 64 characters long' 
          } 
        });
      }
      const transaction = await blockchainService.getTransaction(hash);
      if (!transaction) {
        return res.status(404).json({ 
          error: { 
            code: 'NOT_FOUND', 
            message: `Transaction with hash ${hash} not found` 
          } 
        });
      }
      if (!transaction.ai_risk_score) {
        transaction.ai_risk_score = await dataService.calculateAIRiskScore(transaction);
      }
      if (!transaction.gasUsed) {
        transaction.gasUsed = 75000 + Math.floor(Math.random() * 20000);
      }
      res.json(transaction);
    } catch (error) {
      logger.error('Error getting transaction', { 
        error: error.message, 
        hash: req.params.hash 
      });
      res.status(500).json({ 
        error: { 
          code: 'TRANSACTION_ERROR', 
          message: 'Failed to get transaction' 
        } 
      });
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

      // Simulate address information with dual token balances
      const dgtBalance = (Math.random() * 50000000).toFixed(0); // 0-50 DGT
      const drtBalance = (Math.random() * 500000000).toFixed(0); // 0-500 DRT
      
      const addressInfo = {
        address,
        balances: {
          dgt: {
            amount: dgtBalance + 'udgt',
            formatted: formatAmountWithSymbol(dgtBalance, 'udgt'),
            description: TOKENS.DGT.description
          },
          drt: {
            amount: drtBalance + 'udrt',
            formatted: formatAmountWithSymbol(drtBalance, 'udrt'),
            description: TOKENS.DRT.description
          }
        },
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
        amount: formatAmountWithSymbol((Math.random() * 1000000).toFixed(0), 'udgt'),
        from: Math.random() > 0.5 ? address : 'dyt1other_address',
        to: Math.random() > 0.5 ? address : 'dyt1another_address',
        success: Math.random() > 0.1,
        fee: formatAmountWithSymbol('1000', 'udgt')
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
            balances: {
              dgt: formatAmountWithSymbol((Math.random() * 50000000).toFixed(0), 'udgt'),
              drt: formatAmountWithSymbol((Math.random() * 500000000).toFixed(0), 'udrt')
            }
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

  // Governance methods
  async getGovernanceProposals(req, res) {
    try {
      const proposals = await dataService.getProposals();
      
      // Add mock proposals if none exist
      if (proposals.length === 0) {
        await dataService.createProposal({
          title: "Increase Block Size Limit",
          description: "Proposal to increase the maximum block size from 1MB to 2MB to improve transaction throughput",
          submitter: 'dyt1proposer123',
          voting_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: { proposalType: 'parameter' }
        });
        
        await dataService.createProposal({
          title: "DRT Emission Rate Adjustment", 
          description: "Reduce DRT emission rate from 1 DRT per block to 0.8 DRT per block to control inflation",
          submitter: 'dyt1proposer456',
          voting_end: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: { proposalType: 'tokenomics' }
        });
        
        const updatedProposals = await dataService.getProposals();
        return res.json({
          proposals: updatedProposals,
          total: updatedProposals.length,
          activeProposals: updatedProposals.filter(p => p.status === 'active').length
        });
      }

      res.json({
        proposals,
        total: proposals.length,
        activeProposals: proposals.filter(p => p.status === 'active').length
      });
    } catch (error) {
      logger.error('Error getting governance proposals', { error: error.message });
      res.status(500).json({ 
        error: { 
          code: 'GOVERNANCE_ERROR', 
          message: 'Failed to get governance proposals' 
        } 
      });
    }
  }

  async createGovernanceProposal(req, res) {
    try {
      const { title, description, metadata } = req.body;
      
      if (!title || !description) {
        return res.status(400).json({ 
          error: { 
            code: 'INVALID_INPUT', 
            message: 'Title and description are required' 
          } 
        });
      }

      const proposal = await dataService.createProposal({
        title,
        description,
        submitter: req.body.submitter || 'dyt1anonymous',
        voting_end: req.body.voting_end || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: metadata || {}
      });

      res.status(201).json(proposal);
    } catch (error) {
      logger.error('Error creating governance proposal', { error: error.message });
      res.status(500).json({ 
        error: { 
          code: 'CREATION_ERROR', 
          message: 'Failed to create governance proposal' 
        } 
      });
    }
  }

  async getGovernanceProposal(req, res) {
    try {
      const proposalId = parseInt(req.params.id);
      
      if (isNaN(proposalId)) {
        return res.status(400).json({ 
          error: { 
            code: 'INVALID_ID', 
            message: 'Invalid proposal ID' 
          } 
        });
      }

      const proposal = await dataService.getProposal(proposalId);
      
      if (!proposal) {
        return res.status(404).json({ 
          error: { 
            code: 'NOT_FOUND', 
            message: `Proposal ${proposalId} not found` 
          } 
        });
      }

      res.json(proposal);
    } catch (error) {
      logger.error('Error getting governance proposal', { 
        error: error.message, 
        proposalId: req.params.id 
      });
      res.status(500).json({ 
        error: { 
          code: 'GOVERNANCE_ERROR', 
          message: 'Failed to get governance proposal' 
        } 
      });
    }
  }

  async voteOnProposal(req, res) {
    try {
      const proposalId = parseInt(req.params.id);
      const { voter, option } = req.body;

      if (!voter || !option) {
        return res.status(400).json({ 
          error: { 
            code: 'INVALID_INPUT', 
            message: 'Voter and option are required' 
          } 
        });
      }

      if (!['yes', 'no', 'abstain'].includes(option)) {
        return res.status(400).json({ 
          error: { 
            code: 'INVALID_OPTION', 
            message: 'Option must be "yes", "no", or "abstain"' 
          } 
        });
      }

      const result = await dataService.castVote(proposalId, voter, option);
      
      if (result.error) {
        return res.status(400).json({ 
          error: { 
            code: 'VOTE_ERROR', 
            message: result.error 
          } 
        });
      }

      const updatedProposal = await dataService.getProposal(proposalId);
      res.json({
        success: true,
        message: 'Vote submitted successfully',
        proposal: updatedProposal
      });
    } catch (error) {
      logger.error('Error voting on proposal', { 
        error: error.message, 
        proposalId: req.params.id 
      });
      res.status(500).json({ 
        error: { 
          code: 'VOTE_ERROR', 
          message: 'Failed to submit vote' 
        } 
      });
    }
  }

  // Contracts API methods
  async deployContract(req, res) {
    try {
      const { wasm, sourceCode, initMsg, from } = req.body;
      
      if (!from) {
        return res.status(400).json({ 
          error: { 
            code: 'INVALID_INPUT', 
            message: 'From address is required' 
          } 
        });
      }

      if (!wasm && !sourceCode) {
        return res.status(400).json({ 
          error: { 
            code: 'INVALID_INPUT', 
            message: 'Either wasm or sourceCode is required' 
          } 
        });
      }

      const deployment = {
        code: wasm || sourceCode,
        initMsg: initMsg || {},
        from,
        gasUsed: 100000 + Math.floor(Math.random() * 50000)
      };

      const result = await dataService.deployContract(deployment);
      
      logger.info('Contract deployed', { 
        address: result.address, 
        from, 
        gasUsed: result.gasUsed 
      });

      res.status(201).json(result);
    } catch (error) {
      logger.error('Error deploying contract', { error: error.message });
      res.status(500).json({ 
        error: { 
          code: 'DEPLOY_ERROR', 
          message: 'Failed to deploy contract' 
        } 
      });
    }
  }

  async executeContract(req, res) {
    try {
      const address = req.params.address;
      const { execMsg, from } = req.body;

      if (!from || !execMsg) {
        return res.status(400).json({ 
          error: { 
            code: 'INVALID_INPUT', 
            message: 'From address and execMsg are required' 
          } 
        });
      }

      const result = await dataService.executeContract(address, { execMsg, from });
      
      if (result.error) {
        return res.status(404).json({ 
          error: { 
            code: 'CONTRACT_NOT_FOUND', 
            message: result.error 
          } 
        });
      }

      logger.info('Contract executed', { 
        address, 
        from, 
        gasUsed: result.gasUsed 
      });

      res.json(result);
    } catch (error) {
      logger.error('Error executing contract', { error: error.message, address: req.params.address });
      res.status(500).json({ 
        error: { 
          code: 'EXECUTION_ERROR', 
          message: 'Failed to execute contract' 
        } 
      });
    }
  }

  async getContractState(req, res) {
    try {
      const address = req.params.address;
      const contract = await dataService.getContract(address);

      if (!contract) {
        return res.status(404).json({ 
          error: { 
            code: 'CONTRACT_NOT_FOUND', 
            message: `Contract ${address} not found` 
          } 
        });
      }

      res.json({
        address: contract.address,
        state: contract.state,
        lastExecuted: contract.executions.length > 0 ? 
          contract.executions[contract.executions.length - 1].timestamp : 
          contract.createdAt
      });
    } catch (error) {
      logger.error('Error getting contract state', { 
        error: error.message, 
        address: req.params.address 
      });
      res.status(500).json({ 
        error: { 
          code: 'STATE_ERROR', 
          message: 'Failed to get contract state' 
        } 
      });
    }
  }

  async getContracts(req, res) {
    try {
      const contracts = await dataService.getContracts();
      
      res.json({
        contracts: contracts.map(c => ({
          address: c.address,
          creator: c.creator,
          createdAt: c.createdAt,
          gasLast: c.gasLast,
          executionCount: c.executions.length
        })),
        total: contracts.length
      });
    } catch (error) {
      logger.error('Error getting contracts', { error: error.message });
      res.status(500).json({ 
        error: { 
          code: 'CONTRACTS_ERROR', 
          message: 'Failed to get contracts' 
        } 
      });
    }
  }

  async getContract(req, res) {
    try {
      const address = req.params.address;
      const contract = await dataService.getContract(address);

      if (!contract) {
        return res.status(404).json({ 
          error: { 
            code: 'CONTRACT_NOT_FOUND', 
            message: `Contract ${address} not found` 
          } 
        });
      }

      res.json(contract);
    } catch (error) {
      logger.error('Error getting contract', { 
        error: error.message, 
        address: req.params.address 
      });
      res.status(500).json({ 
        error: { 
          code: 'CONTRACT_ERROR', 
          message: 'Failed to get contract' 
        } 
      });
    }
  }

  // Accounts API methods  
  async getAccountDetails(req, res) {
    try {
      const address = req.params.addr;
      
      if (!address || !address.startsWith('dyt')) {
        return res.status(400).json({ 
          error: { 
            code: 'INVALID_ADDRESS', 
            message: 'Invalid address format' 
          } 
        });
      }

      const account = await dataService.getAccount(address);
      
      res.json({
        address: account.address,
        balances: {
          DGT: (account.balances.DGT / 1000000).toFixed(6), // Convert from micro to base units
          DRT: (account.balances.DRT / 1000000).toFixed(6)
        },
        staking: {
          staked: (account.staking.staked / 1000000).toFixed(6),
          pendingRewards: (account.staking.pendingRewards / 1000000).toFixed(6),
          apr: account.staking.apr.toFixed(2) + '%'
        },
        txCount: account.txCount
      });
    } catch (error) {
      logger.error('Error getting account', { 
        error: error.message, 
        address: req.params.addr 
      });
      res.status(500).json({ 
        error: { 
          code: 'ACCOUNT_ERROR', 
          message: 'Failed to get account' 
        } 
      });
    }
  }

  // Staking methods
  async getStakingValidators(req, res) {
    try {
      // Mock validators - will be replaced with real blockchain data
      const validators = [
        {
          address: 'dyt1validator1abc...',
          moniker: 'Quantum Defender',
          votingPower: 1250000,
          commission: 5.0,
          status: 'active',
          selfStake: 100000,
          totalStake: 1250000,
          delegators: 847,
          uptime: 99.8,
          recentBlocks: 998,
          consensusPubkey: 'dytvalconspub1...',
          details: 'Professional validator securing the Dytallix network'
        },
        {
          address: 'dyt1validator2def...',
          moniker: 'PQC Sentinel',
          votingPower: 980000,
          commission: 3.5,
          status: 'active',
          selfStake: 80000,
          totalStake: 980000,
          delegators: 623,
          uptime: 99.9,
          recentBlocks: 999,
          consensusPubkey: 'dytvalconspub2...',
          details: 'Post-quantum cryptography specialist'
        }
      ];

      res.json({
        validators,
        total: validators.length,
        activeValidators: validators.filter(v => v.status === 'active').length,
        totalStaked: validators.reduce((sum, v) => sum + v.totalStake, 0)
      });
    } catch (error) {
      logger.error('Error getting staking validators', { error: error.message });
      res.status(500).json({ error: 'Failed to get staking validators' });
    }
  }

  async getStakingDelegations(req, res) {
    try {
      const delegatorAddress = req.params.address;

      // Mock delegations - will be replaced with real blockchain data
      const delegations = [
        {
          validatorAddress: 'dyt1validator1abc...',
          validatorMoniker: 'Quantum Defender',
          stakedAmount: 10000,
          rewards: 125.50,
          status: 'active'
        },
        {
          validatorAddress: 'dyt1validator2def...',
          validatorMoniker: 'PQC Sentinel',
          stakedAmount: 5000,
          rewards: 67.25,
          status: 'active'
        }
      ];

      res.json({
        delegations,
        delegatorAddress,
        totalStaked: delegations.reduce((sum, d) => sum + d.stakedAmount, 0),
        totalRewards: delegations.reduce((sum, d) => sum + d.rewards, 0)
      });
    } catch (error) {
      logger.error('Error getting staking delegations', { 
        error: error.message, 
        address: req.params.address 
      });
      res.status(500).json({ error: 'Failed to get staking delegations' });
    }
  }

  async getStakingRewards(req, res) {
    try {
      const delegatorAddress = req.params.address;

      // Mock rewards - will be replaced with real blockchain data
      const totalRewards = 192.75;

      res.json({
        delegatorAddress,
        totalRewards,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting staking rewards', { 
        error: error.message, 
        address: req.params.address 
      });
      res.status(500).json({ error: 'Failed to get staking rewards' });
    }
  }

  async delegateStake(req, res) {
    try {
      const { validatorAddress, amount, delegatorAddress } = req.body;

      if (!validatorAddress || !amount || !delegatorAddress) {
        return res.status(400).json({ 
          error: 'Validator address, amount, and delegator address are required' 
        });
      }

      if (amount <= 0) {
        return res.status(400).json({ error: 'Amount must be positive' });
      }

      // Mock staking transaction - will be replaced with real blockchain transaction
      logger.info('Stake delegation submitted', { validatorAddress, amount, delegatorAddress });

      res.json({
        success: true,
        message: 'Stake delegation submitted successfully',
        transactionHash: blockchainService.generateHash(),
        validatorAddress,
        amount,
        delegatorAddress,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error delegating stake', { error: error.message });
      res.status(500).json({ error: 'Failed to delegate stake' });
    }
  }

  async claimStakingRewards(req, res) {
    try {
      const { delegatorAddress, validatorAddress } = req.body;

      if (!delegatorAddress) {
        return res.status(400).json({ error: 'Delegator address is required' });
      }

      // Mock reward claiming - will be replaced with real blockchain transaction
      logger.info('Staking rewards claimed', { delegatorAddress, validatorAddress });

      res.json({
        success: true,
        message: 'Staking rewards claimed successfully',
        transactionHash: blockchainService.generateHash(),
        delegatorAddress,
        validatorAddress,
        rewardsClaimed: validatorAddress ? 67.25 : 192.75,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error claiming staking rewards', { error: error.message });
      res.status(500).json({ error: 'Failed to claim staking rewards' });
    }
  }
}

module.exports = new ExplorerController();