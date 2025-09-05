const fs = require('fs').promises;
const path = require('path');

class DataService {
  constructor() {
    this.dataDir = path.join(__dirname, '../../data');
    this.proposalsFile = path.join(this.dataDir, 'proposals.json');
    this.contractsFile = path.join(this.dataDir, 'contracts.json');
    this.accountsFile = path.join(this.dataDir, 'accounts.json');
    this.votesFile = path.join(this.dataDir, 'votes.json');
    
    this.initializeStorage();
  }

  async initializeStorage() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Initialize files if they don't exist
      await this.initializeFile(this.proposalsFile, { proposals: [], nextId: 3 });
      await this.initializeFile(this.contractsFile, { contracts: {}, nextNonce: 1 });
      await this.initializeFile(this.accountsFile, { accounts: {} });
      await this.initializeFile(this.votesFile, { votes: {} });
    } catch (error) {
      console.error('Failed to initialize data storage:', error);
    }
  }

  async initializeFile(filePath, defaultData) {
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2));
    }
  }

  async readJSON(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Failed to read ${filePath}:`, error);
      return null;
    }
  }

  async writeJSON(filePath, data) {
    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Failed to write ${filePath}:`, error);
      return false;
    }
  }

  // Governance methods
  async getProposals() {
    const data = await this.readJSON(this.proposalsFile);
    return data?.proposals || [];
  }

  async getProposal(id) {
    const proposals = await this.getProposals();
    return proposals.find(p => p.id === parseInt(id));
  }

  async createProposal(proposal) {
    const data = await this.readJSON(this.proposalsFile);
    const newProposal = {
      ...proposal,
      id: data.nextId,
      createdAt: new Date().toISOString(),
      status: 'pending',
      votes: { yes: 0, no: 0, abstain: 0 },
      submitter: proposal.submitter || 'dyt1unknown'
    };
    
    data.proposals.push(newProposal);
    data.nextId++;
    
    await this.writeJSON(this.proposalsFile, data);
    return newProposal;
  }

  async castVote(proposalId, voter, option) {
    const votes = await this.readJSON(this.votesFile);
    const key = `${proposalId}_${voter}`;
    
    // Check if already voted
    if (votes.votes[key]) {
      return { error: 'Already voted on this proposal' };
    }
    
    // Record vote
    votes.votes[key] = {
      proposalId: parseInt(proposalId),
      voter,
      option,
      timestamp: new Date().toISOString()
    };
    
    await this.writeJSON(this.votesFile, votes);
    
    // Update proposal tally
    const data = await this.readJSON(this.proposalsFile);
    const proposal = data.proposals.find(p => p.id === parseInt(proposalId));
    if (proposal) {
      proposal.votes[option]++;
      await this.writeJSON(this.proposalsFile, data);
    }
    
    return { success: true };
  }

  // Contracts methods
  async deployContract(deployment) {
    const data = await this.readJSON(this.contractsFile);
    const address = `dyt1contract${Date.now()}${data.nextNonce}`;
    
    const contract = {
      address,
      codeHash: this.generateHash(deployment.code),
      creator: deployment.from,
      createdAt: new Date().toISOString(),
      state: deployment.initMsg || {},
      gasLast: deployment.gasUsed || 100000,
      executions: []
    };
    
    data.contracts[address] = contract;
    data.nextNonce++;
    
    await this.writeJSON(this.contractsFile, data);
    return {
      address,
      gasUsed: contract.gasLast,
      txHash: this.generateHash(`deploy_${address}`)
    };
  }

  async executeContract(address, execution) {
    const data = await this.readJSON(this.contractsFile);
    const contract = data.contracts[address];
    
    if (!contract) {
      return { error: 'Contract not found' };
    }
    
    const gasUsed = 50000 + Math.floor(Math.random() * 30000);
    const result = { success: true, data: execution.execMsg };
    
    contract.executions.push({
      from: execution.from,
      msg: execution.execMsg,
      result,
      gasUsed,
      timestamp: new Date().toISOString()
    });
    contract.gasLast = gasUsed;
    
    await this.writeJSON(this.contractsFile, data);
    return {
      result,
      gasUsed,
      txHash: this.generateHash(`exec_${address}_${Date.now()}`)
    };
  }

  async getContract(address) {
    const data = await this.readJSON(this.contractsFile);
    return data.contracts[address] || null;
  }

  async getContracts() {
    const data = await this.readJSON(this.contractsFile);
    return Object.values(data.contracts || {});
  }

  // Accounts methods
  async getAccount(address) {
    const data = await this.readJSON(this.accountsFile);
    return data.accounts[address] || this.createDefaultAccount(address);
  }

  async updateAccount(address, updates) {
    const data = await this.readJSON(this.accountsFile);
    if (!data.accounts[address]) {
      data.accounts[address] = this.createDefaultAccount(address);
    }
    
    Object.assign(data.accounts[address], updates);
    await this.writeJSON(this.accountsFile, data);
    return data.accounts[address];
  }

  createDefaultAccount(address) {
    return {
      address,
      balances: {
        DGT: Math.floor(Math.random() * 50000 * 1000000), // 0-50k DGT in micro units
        DRT: Math.floor(Math.random() * 500000 * 1000000) // 0-500k DRT in micro units
      },
      staking: {
        staked: Math.floor(Math.random() * 10000 * 1000000), // 0-10k DGT staked
        pendingRewards: Math.floor(Math.random() * 100 * 1000000), // 0-100 DGT rewards
        apr: 8.5 + Math.random() * 5 // 8.5-13.5% APR
      },
      txCount: Math.floor(Math.random() * 100)
    };
  }

  // Utility methods
  generateHash(input = '') {
    const chars = '0123456789abcdef';
    let hash = '';
    for (let i = 0; i < 64; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  }

  // AI risk scoring
  async calculateAIRiskScore(transaction) {
    // If backend pulseguard API endpoint is configured, attempt real score
    const endpoint = process.env.RISK_SCORE_ENDPOINT || process.env.CORE_API_ENDPOINT;
    const txHash = transaction.hash || transaction.tx_hash || transaction.txHash;
    if (endpoint && txHash) {
      try {
        const url = `${endpoint.replace(/\/$/, '')}/pulseguard/score`;
        const resp = await fetch(url, {
          method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tx_hash: txHash, snapshot: false, details: false })
        });
        if (resp.ok) {
          const json = await resp.json();
          if (typeof json.score === 'number') {
            // Backend returns 0-100, normalize to 0-1 for UI consistency
            return Math.max(0, Math.min(1, json.score / 100.0));
          }
        }
      } catch (e) {
        console.error('PulseGuard risk adapter failed, falling back to heuristic', e.message);
      }
    }
    // Fallback heuristic (existing logic)
    let riskScore = 0.1; // Base low risk
    if (transaction.gasUsed > 100000) riskScore += 0.3; else if (transaction.gasUsed > 75000) riskScore += 0.2;
    if (transaction.type === 'contract_execution') riskScore += 0.4;
    if (transaction.type === 'contract_deploy') riskScore += 0.3;
    riskScore += Math.random() * 0.2;
    return Math.min(riskScore, 1.0);
  }
}

module.exports = new DataService();