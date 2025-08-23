const axios = require('axios');

class APITester {
  constructor(baseURL = 'http://localhost:3002') {
    this.baseURL = baseURL;
    this.axios = axios.create({ baseURL });
  }

  async testGovernanceAPI() {
    console.log('Testing Governance API...');
    
    try {
      // Test get proposals
      const proposalsResp = await this.axios.get('/api/governance/proposals');
      console.log('✓ GET /api/governance/proposals:', proposalsResp.data.total, 'proposals');
      
      // Test create proposal
      const newProposal = {
        title: 'Test Proposal',
        description: 'This is a test proposal',
        submitter: 'dyt1tester',
        metadata: { type: 'test' }
      };
      const createResp = await this.axios.post('/api/governance', newProposal);
      console.log('✓ POST /api/governance:', 'Created proposal ID', createResp.data.id);
      
      // Test get specific proposal
      const proposalResp = await this.axios.get(`/api/governance/proposals/${createResp.data.id}`);
      console.log('✓ GET /api/governance/proposals/:id:', proposalResp.data.title);
      
      // Test vote
      const voteResp = await this.axios.post(`/api/governance/proposals/${createResp.data.id}/vote`, {
        voter: 'dyt1voter',
        option: 'yes'
      });
      console.log('✓ POST /api/governance/proposals/:id/vote:', voteResp.data.success);
      
    } catch (error) {
      console.error('✗ Governance API test failed:', error.response?.data || error.message);
    }
  }

  async testContractsAPI() {
    console.log('\nTesting Contracts API...');
    
    try {
      // Test get contracts
      const contractsResp = await this.axios.get('/api/contracts');
      console.log('✓ GET /api/contracts:', contractsResp.data.total, 'contracts');
      
      // Test deploy contract
      const deployment = {
        sourceCode: 'contract TestContract {}',
        initMsg: { owner: 'dyt1owner' },
        from: 'dyt1deployer'
      };
      const deployResp = await this.axios.post('/api/contracts/deploy', deployment);
      console.log('✓ POST /api/contracts/deploy:', 'Deployed to', deployResp.data.address);
      
      // Test get contract state
      const stateResp = await this.axios.get(`/api/contracts/${deployResp.data.address}/state`);
      console.log('✓ GET /api/contracts/:address/state:', 'State retrieved');
      
      // Test execute contract
      const execResp = await this.axios.post(`/api/contracts/${deployResp.data.address}/execute`, {
        execMsg: { action: 'test' },
        from: 'dyt1executor'
      });
      console.log('✓ POST /api/contracts/:address/execute:', 'Gas used:', execResp.data.gasUsed);
      
      // Test get contract details
      const contractResp = await this.axios.get(`/api/contracts/${deployResp.data.address}`);
      console.log('✓ GET /api/contracts/:address:', 'Contract details retrieved');
      
    } catch (error) {
      console.error('✗ Contracts API test failed:', error.response?.data || error.message);
    }
  }

  async testAccountsAPI() {
    console.log('\nTesting Accounts API...');
    
    try {
      // Test get account
      const accountResp = await this.axios.get('/api/accounts/dyt1testaccount123');
      console.log('✓ GET /api/accounts/:addr:', 'DGT balance:', accountResp.data.balances.DGT);
      console.log('  Staking APR:', accountResp.data.staking.apr);
      
    } catch (error) {
      console.error('✗ Accounts API test failed:', error.response?.data || error.message);
    }
  }

  async testTransactionsAPI() {
    console.log('\nTesting Enhanced Transactions API...');
    
    try {
      // Test get transactions with AI risk scores
      const txsResp = await this.axios.get('/api/transactions?limit=5');
      console.log('✓ GET /api/transactions:', txsResp.data.transactions.length, 'transactions');
      
      if (txsResp.data.transactions.length > 0) {
        const firstTx = txsResp.data.transactions[0];
        console.log('  Sample transaction AI risk score:', firstTx.ai_risk_score);
        console.log('  Sample transaction gas used:', firstTx.gasUsed);
        
        // Test get specific transaction
        const txResp = await this.axios.get(`/api/transactions/${firstTx.hash}`);
        console.log('✓ GET /api/transactions/:hash:', 'AI risk score:', txResp.data.ai_risk_score);
      }
      
    } catch (error) {
      console.error('✗ Transactions API test failed:', error.response?.data || error.message);
    }
  }

  async runAllTests() {
    console.log('Running API tests for Dytallix Explorer Extensions...\n');
    
    await this.testGovernanceAPI();
    await this.testContractsAPI(); 
    await this.testAccountsAPI();
    await this.testTransactionsAPI();
    
    console.log('\nAPI tests completed!');
  }
}

// Export for use in other tests
module.exports = APITester;

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new APITester();
  tester.runAllTests().catch(console.error);
}